"""
me-snippet-monitor — monitoring post-patch CTR/position (J+7, J+14, J+30).

Compare les metriques GSC d'une page patchee avant/apres le merge de la PR
batch. Flag les regressions (ctr_after < ctr_before * 0.8 ET position_delta
> +3). Mode rollback : restaure les fichiers depuis le snapshot pre-patch.

Usage :
    # Check J+7 (ou n'importe quand post-patch)
    python .claude/me_snippet_monitor.py \
        --baseline audit/gsc-ingested-2026-04-18.json \
        --patches  audit/snippet-patches-2026-04-18.json \
        --days 7

    # Rollback d'une ou plusieurs URLs regressees
    python .claude/me_snippet_monitor.py \
        --rollback \
        --snapshot audit/snippet-patches-2026-04-18.snapshot.json \
        --urls /guides/audiogramme/
"""

import argparse
import glob as pyglob
import json
import os
import subprocess
import sys
from datetime import datetime, date

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)


# ==========================================================================
# Monitor mode : compare baseline vs current GSC
# ==========================================================================

def find_latest(pattern: str) -> str:
    matches = [
        p for p in sorted(pyglob.glob(os.path.join("audit", pattern)), reverse=True)
        if ".snapshot." not in p
    ]
    if not matches:
        raise FileNotFoundError(f"Aucun fichier {pattern}")
    return matches[0]


def fetch_current_gsc(days: int) -> dict:
    """Lance me_gsc_ingest.py pour un ingest fresh et charge le JSON."""
    temp_out = os.path.join("audit", f"gsc-monitor-{date.today().isoformat()}.json")
    result = subprocess.run(
        ["python", os.path.join(SCRIPT_DIR, "me_gsc_ingest.py"),
         "--days", str(days), "--min-impr", "1", "--out", temp_out],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=300,
    )
    if result.returncode != 0:
        raise RuntimeError(f"GSC fetch failed: {result.stderr}")
    with open(os.path.join(REPO_ROOT, temp_out), "r", encoding="utf-8") as f:
        return json.load(f)


def extract_page_metrics(gsc_data: dict) -> dict:
    """Retourne {url: {impressions, clicks, ctr, avg_position}}."""
    return {
        pg["url"]: pg["gsc"]
        for pg in gsc_data["payload"]["pages"]
    }


def compare_page(baseline: dict, current: dict, url: str) -> dict:
    b = baseline.get(url, {"impressions": 0, "clicks": 0, "ctr": 0.0, "avg_position": 0.0})
    c = current.get(url, {"impressions": 0, "clicks": 0, "ctr": 0.0, "avg_position": 0.0})

    # Deltas absolus + pourcentage
    ctr_delta_abs = c["ctr"] - b["ctr"]
    ctr_delta_pct = (
        ((c["ctr"] - b["ctr"]) / b["ctr"] * 100) if b["ctr"] > 0
        else (100.0 if c["ctr"] > 0 else 0.0)
    )
    pos_delta = c["avg_position"] - b["avg_position"] if b["avg_position"] > 0 else 0.0
    impr_delta_pct = (
        ((c["impressions"] - b["impressions"]) / b["impressions"] * 100)
        if b["impressions"] > 0 else 0.0
    )

    # Regression flag : CTR down > 20% ET position down > +3
    rollback_candidate = (
        b["ctr"] > 0
        and c["ctr"] < b["ctr"] * 0.8
        and pos_delta > 3.0
    )

    # Win flag : CTR up > 20% sans regression de position
    win = (
        b["ctr"] > 0
        and c["ctr"] > b["ctr"] * 1.2
        and pos_delta < 1.0
    )

    return {
        "url": url,
        "before": b,
        "after": c,
        "ctr_delta_abs": round(ctr_delta_abs, 4),
        "ctr_delta_pct": round(ctr_delta_pct, 1),
        "pos_delta": round(pos_delta, 1),
        "impr_delta_pct": round(impr_delta_pct, 1),
        "verdict": "ROLLBACK_CANDIDATE" if rollback_candidate else ("WIN" if win else "NEUTRAL"),
    }


def monitor_mode(baseline_path: str, patches_path: str, days: int, output_path: str) -> dict:
    with open(baseline_path, "r", encoding="utf-8") as f:
        baseline = json.load(f)
    with open(patches_path, "r", encoding="utf-8") as f:
        patches = json.load(f)

    baseline_metrics = extract_page_metrics(baseline)

    print(f"\nFetch GSC current (last {days} days)...")
    current = fetch_current_gsc(days)
    current_metrics = extract_page_metrics(current)

    patched_urls = [
        r["url"] for r in patches["payload"]["results"]
        if r["status"] in ("APPLIED", "DRY_RUN")
    ]

    comparisons = [compare_page(baseline_metrics, current_metrics, url) for url in patched_urls]

    metrics = {
        "total_patched": len(patched_urls),
        "WIN": sum(1 for c in comparisons if c["verdict"] == "WIN"),
        "NEUTRAL": sum(1 for c in comparisons if c["verdict"] == "NEUTRAL"),
        "ROLLBACK_CANDIDATE": sum(1 for c in comparisons if c["verdict"] == "ROLLBACK_CANDIDATE"),
        "avg_ctr_delta_pct": round(
            sum(c["ctr_delta_pct"] for c in comparisons) / max(len(comparisons), 1), 1
        ),
        "avg_pos_delta": round(
            sum(c["pos_delta"] for c in comparisons) / max(len(comparisons), 1), 2
        ),
    }

    report = {
        "type": "me-snippet-monitor",
        "version": "1.0.0",
        "mode": "monitor",
        "payload": {
            "days_since_patch": days,
            "baseline_period": baseline["payload"]["period"],
            "current_period": current["payload"]["period"],
            "comparisons": comparisons,
            "metrics": metrics,
            "rollback_candidates": [c for c in comparisons if c["verdict"] == "ROLLBACK_CANDIDATE"],
        },
        "upstream": {
            "baseline": baseline_path,
            "patches": patches_path,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


# ==========================================================================
# Rollback mode
# ==========================================================================

def rollback_mode(snapshot_path: str, urls: list[str]) -> dict:
    with open(snapshot_path, "r", encoding="utf-8") as f:
        snapshot = json.load(f)

    # Charger aussi le manifest pour avoir le mapping url -> source_file
    manifest_path = snapshot_path.replace(".snapshot.json", ".json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    results_by_file = {r["source_file"]: r for r in manifest["payload"]["results"]}
    files_by_content = {f["source_file"]: f["content_before"] for f in snapshot["files"]}

    # Cross-ref : URLs -> source_files
    urls_to_rollback = set(urls)
    rolled_back = []
    not_found = []

    for url in urls:
        source_file = None
        for r in manifest["payload"]["results"]:
            if r["url"] == url:
                source_file = r["source_file"]
                break
        if source_file is None:
            not_found.append(url)
            continue
        content = files_by_content.get(source_file)
        if not content:
            not_found.append(url)
            continue
        abs_path = os.path.join(REPO_ROOT, source_file)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)
        rolled_back.append({"url": url, "source_file": source_file})

    report = {
        "type": "me-snippet-monitor",
        "version": "1.0.0",
        "mode": "rollback",
        "payload": {
            "rolled_back": rolled_back,
            "not_found": not_found,
        },
        "upstream": {
            "snapshot": snapshot_path,
            "manifest": manifest_path,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }
    return report


# ==========================================================================
# Print summaries
# ==========================================================================

def print_monitor_summary(report: dict) -> None:
    m = report["payload"]["metrics"]
    print(f"\nMonitor post-patch -- J+{report['payload']['days_since_patch']}")
    print(f"  Pages patchees suivies : {m['total_patched']}")
    print(f"  WIN                    : {m['WIN']}")
    print(f"  NEUTRAL                : {m['NEUTRAL']}")
    print(f"  ROLLBACK_CANDIDATE     : {m['ROLLBACK_CANDIDATE']}")
    print(f"  CTR delta moyen        : {m['avg_ctr_delta_pct']:+.1f}%")
    print(f"  Position delta moyen   : {m['avg_pos_delta']:+.1f}")
    print()
    print(f"  {'URL':45s} {'CTR_b':>6s} {'CTR_a':>6s} {'d%':>5s} {'Pos_b':>5s} {'Pos_a':>5s} {'dPos':>5s} {'Verdict':>18s}")
    print("-" * 100)
    for c in report["payload"]["comparisons"]:
        b, a = c["before"], c["after"]
        print(
            f"  {c['url'][:44]:45s} {b['ctr'] * 100:>5.2f}% {a['ctr'] * 100:>5.2f}% "
            f"{c['ctr_delta_pct']:>+4.0f}% {b['avg_position']:>5.1f} {a['avg_position']:>5.1f} "
            f"{c['pos_delta']:>+5.1f} {c['verdict']:>18s}"
        )

    if report["payload"]["rollback_candidates"]:
        print("\n[ACTION REQUIRED] Rollback candidates :")
        for c in report["payload"]["rollback_candidates"]:
            print(f"  -> {c['url']}  (CTR {c['ctr_delta_pct']:+.0f}%, pos {c['pos_delta']:+.1f})")
        print()
        print("Pour rollback :")
        urls_arg = " ".join(c["url"] for c in report["payload"]["rollback_candidates"])
        print(f"  python .claude/me_snippet_monitor.py --rollback --snapshot <path> --urls {urls_arg}")


def print_rollback_summary(report: dict) -> None:
    print(f"\nRollback termine")
    print(f"  Rolled back : {len(report['payload']['rolled_back'])}")
    print(f"  Not found   : {len(report['payload']['not_found'])}")
    for r in report["payload"]["rolled_back"]:
        print(f"  ROLLED BACK : {r['source_file']}  (url: {r['url']})")
    for url in report["payload"]["not_found"]:
        print(f"  NOT FOUND   : {url}")


# ==========================================================================
# Main
# ==========================================================================

def main() -> int:
    parser = argparse.ArgumentParser(description="me-snippet-monitor")
    parser.add_argument("--rollback", action="store_true", help="Mode rollback (restaure fichiers depuis snapshot)")
    parser.add_argument("--baseline", default=None, help="gsc-ingested-*.json pre-patch")
    parser.add_argument("--patches", default=None, help="snippet-patches-*.json manifest")
    parser.add_argument("--snapshot", default=None, help="snippet-patches-*.snapshot.json pour rollback")
    parser.add_argument("--urls", nargs="+", default=[], help="URLs a rollback")
    parser.add_argument("--days", type=int, default=7, help="Fenetre GSC current (default 7)")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    today = date.today().isoformat()

    if args.rollback:
        snapshot = args.snapshot or find_latest("snippet-patches-*.snapshot.json").replace(".json", "")
        # find_latest exclut les .snapshot. donc on ne peut pas l'utiliser ici. Fallback :
        if not args.snapshot:
            matches = sorted(pyglob.glob(os.path.join("audit", "snippet-patches-*.snapshot.json")), reverse=True)
            if not matches:
                print("ERROR: Aucun snapshot trouve.")
                return 1
            snapshot = matches[0]
        if not args.urls:
            print("ERROR: --urls requis en mode rollback")
            return 1
        report = rollback_mode(snapshot, args.urls)
        print_rollback_summary(report)
    else:
        baseline = args.baseline or find_latest("gsc-ingested-*.json")
        patches = args.patches or find_latest("snippet-patches-*.json")
        output_path = args.out or os.path.join("audit", f"monitor-{today}.json")
        report = monitor_mode(baseline, patches, args.days, output_path)
        print_monitor_summary(report)
        print(f"\nReport ecrit : {output_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
me-snippet-pipeline — orchestrateur de la chaine GAN snippet SEO.

Enchaine les 7 skills en sequence avec state machine et checkpoints humains :
  INIT -> INGESTING -> MAPPING -> AUDITING -> [CHECKPOINT] -> WRITING
  -> GATE_1 -> GATE_2 -> [CHECKPOINT] -> FIXING -> DONE

Usage :
    python .claude/me_snippet_pipeline.py
        [--days 28] [--min-impr 3] [--priority medium]
        [--skip-checkpoint]  # skip prompts interactifs (CI mode)
        [--apply]            # apply patches (default: dry-run)
        [--stop-at <state>]  # debug: stop apres un etat specifique

Etats : INGESTING, MAPPING, AUDITING, WRITING, GATE_1, GATE_2, FIXING
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, date

# Force UTF-8 stdout sur Windows (console cp1252 par defaut casse sur certains glyphes)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, OSError):
        pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)


def _safe_print(text: str) -> None:
    """Print qui remplace les caracteres non-encodables par ?."""
    try:
        print(text)
    except UnicodeEncodeError:
        encoding = sys.stdout.encoding or "ascii"
        print(text.encode(encoding, errors="replace").decode(encoding))


STATES = [
    "INGESTING",
    "MAPPING",
    "AUDITING",
    "WRITING",
    "GATE_1",
    "GATE_2",
    "FIXING",
]

SCRIPTS = {
    "INGESTING": [
        ("python", os.path.join(SCRIPT_DIR, "me_gsc_ingest.py")),
        "audit/gsc-ingested-*.json",
    ],
    "MAPPING": [
        ("python", os.path.join(SCRIPT_DIR, "me_query_map.py")),
        "audit/gsc-mapped-*.json",
    ],
    "AUDITING": [
        ("python", os.path.join(SCRIPT_DIR, "me_title_audit.py")),
        "audit/title-audit-*.json",
    ],
    "WRITING": [
        ("python", os.path.join(SCRIPT_DIR, "me_title_write.py")),
        "audit/title-proposals-*.json",
    ],
    "GATE_1": [
        ("python", os.path.join(SCRIPT_DIR, "me_snippet_evaluate.py")),
        "audit/snippet-eval-*.json",
    ],
    "GATE_2": [
        ("python", os.path.join(SCRIPT_DIR, "me_eeat_snippet_check.py")),
        "audit/eeat-check-*.json",
    ],
    "FIXING": [
        ("python", os.path.join(SCRIPT_DIR, "me_snippet_fix.py")),
        "audit/snippet-patches-*.json",
    ],
}


def run_step(state: str, extra_args: list[str]) -> tuple[int, str]:
    cmd = list(SCRIPTS[state][0]) + extra_args
    print(f"\n{'=' * 70}")
    print(f"[{state}] Running: {' '.join(cmd)}")
    print(f"{'=' * 70}")
    try:
        result = subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        return (124, "TIMEOUT after 600s")

    if result.stdout:
        _safe_print(result.stdout[-2000:])  # truncate pour lisibilite
    if result.returncode != 0 and result.stderr:
        _safe_print("STDERR:")
        _safe_print(result.stderr[-1500:])
    return (result.returncode, result.stdout)


def checkpoint_human(state: str, message: str, skip: bool) -> bool:
    """Prompt Y/N. Si skip: continue sans prompt."""
    print(f"\n{'#' * 70}")
    print(f"# CHECKPOINT after {state}")
    print(f"# {message}")
    print(f"{'#' * 70}")
    if skip:
        print("# (--skip-checkpoint: auto-continue)")
        return True
    try:
        answer = input("Continuer ? [Y/n] ").strip().lower()
    except EOFError:
        return True
    return answer in ("", "y", "yes", "o", "oui")


def load_state_output(state: str) -> dict | None:
    """Charge le dernier JSON produit par l'etape (exclut les fichiers .snapshot.json)."""
    import glob as pyglob
    pattern = SCRIPTS[state][1]
    matches = [
        p for p in sorted(pyglob.glob(os.path.join(REPO_ROOT, pattern)), reverse=True)
        if ".snapshot." not in p
    ]
    if not matches:
        return None
    with open(matches[0], "r", encoding="utf-8") as f:
        return json.load(f)


def format_auditing_summary(out: dict) -> str:
    pages = out["payload"]["pages"][:5]
    m = out["payload"]["audit_metrics"]
    lines = [
        f"Pages auditees : {m['total_pages_audited']}",
        f"Priorite HIGH  : {m['pages_priority_high']}",
        f"Priorite MED   : {m['pages_priority_medium']}",
        "",
        "Top 5 pages par ROI :",
    ]
    for pg in pages:
        lines.append(
            f"  [{pg['priority'].upper():6s}] "
            f"ROI={pg['roi']['score']:5.2f} "
            f"mismatch={pg['mismatch']['score']:3d} "
            f"{pg['url']}"
        )
    return "\n".join(lines)


def format_gates_summary(gate1: dict, gate2: dict) -> str:
    g1m = gate1["payload"]["metrics"]
    g2m = gate2["payload"]["metrics"]
    lines = [
        f"GATE 1 (technique) : PASS={g1m['PASS']} REVISE={g1m['REVISE']} REJECT={g1m['REJECT']} (moy {g1m['avg_score_total']}/100)",
        f"GATE 2 (YMYL)      : PASS={g2m['PASS']} REJECT={g2m['REJECT']} (moy {g2m['avg_score_total']}/100)",
        f"                   : promesses therapeutiques {g2m['therapeutic_promises']} / superclaims {g2m['superclaims']}",
        "",
        "Propositions patchables (PASS les 2 gates) :",
    ]
    # Cross-reference pour lister les PASS des deux
    pass_by_key = {}
    for e in gate1["payload"]["evaluated_proposals"]:
        if e["verdict"] == "PASS":
            pass_by_key[(e["url"], e["patch_mode"])] = {"g1": e["score_total"]}
    for e in gate2["payload"]["checked_proposals"]:
        key = (e["url"], e["patch_mode"])
        if e["verdict"] == "PASS" and key in pass_by_key:
            pass_by_key[key]["g2"] = e["score_total"]
    for key, scores in pass_by_key.items():
        if "g2" in scores:
            lines.append(
                f"  {key[0]:50s} mode={key[1]:15s} "
                f"g1={scores['g1']:.1f} g2={scores['g2']:.1f}"
            )
    if not any("g2" in s for s in pass_by_key.values()):
        lines.append("  (aucune -- seules les propositions REVISE/REJECT)")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="me-snippet-pipeline orchestrator")
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--min-impr", type=int, default=3)
    parser.add_argument("--priority", default="medium", choices=["high", "medium", "low"])
    parser.add_argument("--skip-checkpoint", action="store_true")
    parser.add_argument("--apply", action="store_true", help="FIXING en --apply (defaut: dry-run)")
    parser.add_argument(
        "--stop-at",
        choices=STATES,
        default=None,
        help="Stop apres cet etat (debug)",
    )
    args = parser.parse_args()

    print(f"\n{'*' * 70}")
    print(f"* me-snippet-pipeline — run {datetime.now().isoformat(timespec='seconds')}")
    print(f"* days={args.days}  min-impr={args.min_impr}  priority={args.priority}")
    print(f"* apply={args.apply}  skip-checkpoint={args.skip_checkpoint}")
    print(f"{'*' * 70}")

    run_log = []

    # Construire les args par etape
    step_args = {
        "INGESTING": ["--days", str(args.days), "--min-impr", str(args.min_impr)],
        "MAPPING": [],
        "AUDITING": [],
        "WRITING": ["--priority", args.priority],
        "GATE_1": [],
        "GATE_2": [],
        "FIXING": ["--apply"] if args.apply else [],
    }

    for state in STATES:
        rc, stdout = run_step(state, step_args[state])
        run_log.append({
            "state": state,
            "returncode": rc,
            "ok": rc == 0,
        })
        if rc != 0:
            print(f"\n[ERROR] {state} returned {rc}. Pipeline BLOCKED.")
            return 1

        if args.stop_at == state:
            print(f"\n[STOP] --stop-at={state} atteint.")
            return 0

        # Checkpoints humains
        if state == "AUDITING":
            audit_out = load_state_output("AUDITING")
            if audit_out:
                print("\n" + format_auditing_summary(audit_out))
            if not checkpoint_human(
                state,
                "Revue des pages auditees et priorisation par ROI.",
                args.skip_checkpoint,
            ):
                print("[ABORTED] User stop apres AUDITING.")
                return 0

        elif state == "GATE_2":
            gate1_out = load_state_output("GATE_1")
            gate2_out = load_state_output("GATE_2")
            if gate1_out and gate2_out:
                print("\n" + format_gates_summary(gate1_out, gate2_out))
            mode_label = "APPLY (ecrit les fichiers)" if args.apply else "DRY-RUN (aucune modification)"
            if not checkpoint_human(
                state,
                f"Propositions validees par les 2 gates. FIXING mode = {mode_label}",
                args.skip_checkpoint,
            ):
                print("[ABORTED] User stop avant FIXING.")
                return 0

    # DONE
    print(f"\n{'*' * 70}")
    print("* DONE")
    print(f"{'*' * 70}")

    # Resume final
    fixer_out = load_state_output("FIXING")
    if fixer_out:
        fm = fixer_out["payload"]["metrics"]
        print("\nResume FIXING :")
        print(f"  Mode      : {fixer_out['payload']['mode']}")
        print(f"  APPLIED   : {fm['APPLIED']}")
        print(f"  DRY_RUN   : {fm['DRY_RUN']}")
        print(f"  FAILED    : {fm['FAILED']}")
        print(f"  DEFERRED  : {len(fixer_out['payload'].get('deferred_v2', {}).get('catalogue_individual_overrides', []))} overrides catalogue, "
              f"{len(fixer_out['payload'].get('deferred_v2', {}).get('centres_supabase_overrides', []))} overrides centres")

    # Log du run
    log_path = os.path.join(REPO_ROOT, "audit", f"pipeline-run-{date.today().isoformat()}.json")
    with open(log_path, "w", encoding="utf-8") as f:
        json.dump({
            "type": "me-snippet-pipeline",
            "version": "1.0.0",
            "args": vars(args),
            "states": run_log,
            "completed_at": datetime.now().isoformat(timespec="seconds"),
        }, f, ensure_ascii=False, indent=2)
    print(f"\nLog run ecrit : {log_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
me-gsc-ingestor — parse GSC data directly via API (no XLSX).

Produces the canonical JSON consumed by me-query-mapper:
    audit/gsc-ingested-YYYY-MM-DD.json

Usage:
    python .claude/me_gsc_ingest.py [--days 28] [--min-impr 5] [--out PATH]

Defaults:
    --days 28 (4 semaines glissantes, window GSC recommandé)
    --min-impr 5 (exclut les pages fantômes)
    --out audit/gsc-ingested-<today>.json

Filtre brand : leguideauditif, guide auditif, franck-olivier, chabbat.
Normalise les URLs : strip https://leguideauditif.fr, strip query string,
garantit trailing slash.

Output schema : cf. .claude/skills/me-gsc-ingestor/references/output-schema.json
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from datetime import date, datetime, timedelta

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from google_api import get_gsc_data  # noqa: E402


BRAND_PATTERNS = [
    re.compile(r"\bleguideauditif\b", re.IGNORECASE),
    re.compile(r"\bguide\s+auditif\b", re.IGNORECASE),
    re.compile(r"\bfranck[\-\s]?olivier\b", re.IGNORECASE),
    re.compile(r"\bchabbat\b", re.IGNORECASE),
]

SITE_PREFIXES = (
    "https://www.leguideauditif.fr",
    "https://leguideauditif.fr",
    "http://www.leguideauditif.fr",
    "http://leguideauditif.fr",
)


def is_brand_query(q: str) -> bool:
    return any(p.search(q) for p in BRAND_PATTERNS)


def normalize_url(url: str) -> str:
    """Strip all leguideauditif.fr origin variants (www/non-www, http/https),
    strip query and fragment, ensure trailing slash on directory-like paths.

    Unifie le split www/non-www signalé dans l'audit GSC (cf. Docs/lga-title-audit-prompt.md)."""
    path = url
    for prefix in SITE_PREFIXES:
        if path.startswith(prefix):
            path = path[len(prefix):]
            break
    path = path.split("?")[0].split("#")[0]
    if not path:
        return "/"
    if not path.startswith("/"):
        path = "/" + path
    if not path.endswith("/") and "." not in path.rsplit("/", 1)[-1]:
        path = path + "/"
    return path


def ingest(days: int, min_impr: int, out_path: str) -> dict:
    rows = get_gsc_data(
        site="leguideauditif",
        days=days,
        dimensions=["query", "page"],
        row_limit=25000,
    )

    end_date = date.today().isoformat()
    start_date = (date.today() - timedelta(days=days)).isoformat()

    pages = defaultdict(lambda: {
        "impressions": 0,
        "clicks": 0,
        "positions_weighted_sum": 0.0,
        "queries": [],
        "queries_brand": [],
    })

    total_brand_filtered = 0

    for r in rows:
        query = r["keys"][0]
        url = r["keys"][1]
        path = normalize_url(url)
        impr = r["impressions"]
        clicks = r["clicks"]
        pos = r["position"]

        bucket = pages[path]

        if is_brand_query(query):
            total_brand_filtered += 1
            bucket["queries_brand"].append({
                "q": query,
                "impr": impr,
                "clicks": clicks,
                "pos": pos,
            })
            continue

        bucket["impressions"] += impr
        bucket["clicks"] += clicks
        bucket["positions_weighted_sum"] += pos * impr
        bucket["queries"].append({
            "q": query,
            "impr": impr,
            "clicks": clicks,
            "pos": pos,
        })

    page_entries = []
    for path, data in pages.items():
        if data["impressions"] < min_impr:
            continue
        data["queries"].sort(key=lambda x: x["impr"], reverse=True)
        avg_pos = (
            data["positions_weighted_sum"] / data["impressions"]
            if data["impressions"] > 0
            else 0.0
        )
        ctr = (
            data["clicks"] / data["impressions"]
            if data["impressions"] > 0
            else 0.0
        )
        page_entries.append({
            "url": path,
            "url_normalized": f"leguideauditif.fr{path}",
            "gsc": {
                "impressions": data["impressions"],
                "clicks": data["clicks"],
                "ctr": round(ctr, 4),
                "avg_position": round(avg_pos, 2),
            },
            "top_queries_probable": data["queries"][:10],
            "brand_queries_count": len(data["queries_brand"]),
        })

    page_entries.sort(key=lambda p: p["gsc"]["impressions"], reverse=True)

    output = {
        "type": "me-gsc-ingestor",
        "version": "1.0.0",
        "payload": {
            "period": {"start": start_date, "end": end_date, "days": days},
            "filters": {
                "min_impressions_per_page": min_impr,
                "brand_exclusions": [
                    "leguideauditif",
                    "guide auditif",
                    "franck-olivier",
                    "chabbat",
                ],
            },
            "metrics": {
                "total_rows_gsc": len(rows),
                "total_pages": len(pages),
                "pages_with_impressions": len(page_entries),
                "pages_filtered_below_min_impr": len(pages) - len(page_entries),
                "brand_query_rows_filtered": total_brand_filtered,
            },
            "pages": page_entries,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return output


def print_summary(out: dict) -> None:
    m = out["payload"]["metrics"]
    p = out["payload"]["period"]
    print(f"GSC ingested -- {p['start']} to {p['end']} ({p['days']}j)")
    print(f"  Total rows (query, page)     : {m['total_rows_gsc']}")
    print(f"  Pages uniques                : {m['total_pages']}")
    print(f"  Pages >= seuil impressions   : {m['pages_with_impressions']}")
    print(f"  Pages sous le seuil          : {m['pages_filtered_below_min_impr']}")
    print(f"  Rows brand filtres           : {m['brand_query_rows_filtered']}")
    print()
    print("Top 10 pages par impressions (non-brand) :")
    print(f"  {'URL':50s} {'Impr':>6s} {'Clicks':>7s} {'CTR':>6s} {'Pos':>5s}")
    print("-" * 80)
    for pg in out["payload"]["pages"][:10]:
        g = pg["gsc"]
        print(
            f"  {pg['url'][:49]:50s} {g['impressions']:>6d} "
            f"{g['clicks']:>7d} {g['ctr'] * 100:>5.2f}% {g['avg_position']:>5.1f}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="me-gsc-ingestor")
    parser.add_argument("--days", type=int, default=28)
    parser.add_argument("--min-impr", type=int, default=5)
    parser.add_argument(
        "--out",
        type=str,
        default=None,
        help="chemin JSON de sortie (default: audit/gsc-ingested-YYYY-MM-DD.json)",
    )
    args = parser.parse_args()

    today = date.today().isoformat()
    out_path = args.out or os.path.join("audit", f"gsc-ingested-{today}.json")

    output = ingest(days=args.days, min_impr=args.min_impr, out_path=out_path)
    print_summary(output)
    print()
    print(f"JSON écrit : {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

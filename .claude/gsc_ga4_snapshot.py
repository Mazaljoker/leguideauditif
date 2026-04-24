"""
Snapshot GSC + GA4 pour LeGuideAuditif.fr.

Produit un JSON complet avec toutes les metriques du jour pour comparaison future.
Usage :
    python .claude/gsc_ga4_snapshot.py          # capture baseline
    python .claude/gsc_ga4_snapshot.py compare  # compare avec la derniere baseline

Output : reports/gsc-ga4-snapshot-YYYY-MM-DD.json
"""
import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, r"c:/Users/Franck-Olivier/dev/leguideauditif-claude-code/leguideauditif/.claude")
from google_api import get_gsc_data, get_ga4_data

SITE = "leguideauditif"
DAYS = 28
REPORTS_DIR = Path("reports")
REPORTS_DIR.mkdir(exist_ok=True)

def capture_gsc():
    print("GSC : daily totals...")
    daily = get_gsc_data(SITE, days=DAYS, dimensions=["date"], row_limit=DAYS + 5)
    print("GSC : top 50 pages...")
    pages = get_gsc_data(SITE, days=DAYS, dimensions=["page"], row_limit=50)
    print("GSC : top 50 queries...")
    queries = get_gsc_data(SITE, days=DAYS, dimensions=["query"], row_limit=50)
    print("GSC : query x page (top 100)...")
    qp = get_gsc_data(SITE, days=DAYS, dimensions=["query", "page"], row_limit=100)

    total_clicks = sum(r["clicks"] for r in daily)
    total_impr = sum(r["impressions"] for r in daily)

    return {
        "period_days": DAYS,
        "totals": {
            "clicks": total_clicks,
            "impressions": total_impr,
            "ctr_pct": round(total_clicks / total_impr * 100, 2) if total_impr else 0,
        },
        "daily": [{"date": r["keys"][0], **{k: r[k] for k in ("clicks","impressions","ctr","position")}} for r in sorted(daily, key=lambda x: x["keys"][0])],
        "top_pages": [{"url": r["keys"][0], **{k: r[k] for k in ("clicks","impressions","ctr","position")}} for r in pages],
        "top_queries": [{"query": r["keys"][0], **{k: r[k] for k in ("clicks","impressions","ctr","position")}} for r in queries],
        "query_page": [{"query": r["keys"][0], "page": r["keys"][1], **{k: r[k] for k in ("clicks","impressions","ctr","position")}} for r in qp],
    }

def capture_ga4():
    print("GA4 : daily totals...")
    daily = get_ga4_data(SITE, days=DAYS, dimensions=["date"], metrics=["sessions","totalUsers","screenPageViews","engagementRate","averageSessionDuration"])
    print("GA4 : top 30 pages...")
    pages = get_ga4_data(SITE, days=DAYS, dimensions=["pagePath"], metrics=["sessions","screenPageViews","engagementRate","averageSessionDuration"])
    print("GA4 : source/medium...")
    sources = get_ga4_data(SITE, days=DAYS, dimensions=["sessionSource","sessionMedium"], metrics=["sessions","totalUsers","engagementRate"])
    print("GA4 : device...")
    devices = get_ga4_data(SITE, days=DAYS, dimensions=["deviceCategory"], metrics=["sessions","totalUsers","engagementRate"])
    print("GA4 : events top 20...")
    events = get_ga4_data(SITE, days=DAYS, dimensions=["eventName"], metrics=["eventCount","totalUsers"])

    def to_int(v):
        try: return int(v)
        except: return 0
    def to_float(v):
        try: return round(float(v), 3)
        except: return 0.0

    totals = {
        "sessions": sum(to_int(d["sessions"]) for d in daily),
        "users": sum(to_int(d["totalUsers"]) for d in daily),
        "pageviews": sum(to_int(d["screenPageViews"]) for d in daily),
    }

    return {
        "period_days": DAYS,
        "totals": totals,
        "daily": sorted(daily, key=lambda x: x.get("date","")),
        "top_pages": sorted(pages, key=lambda x: -to_int(x["sessions"]))[:30],
        "sources": sorted(sources, key=lambda x: -to_int(x["sessions"]))[:20],
        "devices": devices,
        "events": sorted(events, key=lambda x: -to_int(x["eventCount"]))[:20],
    }

def capture_coverage():
    """Coverage via URL Inspection n'est pas exhaustive (URLs sans impression exclues).
    Recupere juste la categorisation sur les URLs SearchAnalytics."""
    print("Coverage : URL Inspection sur top 100 pages impressions...")
    from google_api import inspect_url
    pages = get_gsc_data(SITE, days=90, dimensions=["page"], row_limit=100)
    results = []
    for p in pages:
        try:
            r = inspect_url(p["keys"][0])
            results.append({"url": p["keys"][0], "coverageState": r.get("coverageState",""), "verdict": r.get("verdict","")})
        except Exception as e:
            results.append({"url": p["keys"][0], "error": str(e)[:100]})
    from collections import Counter
    return {
        "sample_size": len(results),
        "distribution": dict(Counter(r.get("coverageState","ERROR") for r in results)),
        "items": results,
    }

def main():
    today = date.today().isoformat()
    snapshot = {
        "date": today,
        "site": SITE,
        "period_days": DAYS,
        "context": {
            "prs_merged_today": ["#78 redirects 301 + robots.txt", "#83 28 redirects slugs centres", "#84 AggregateRating fix"],
            "coverage_report_date": "2026-04-20",
            "coverage_xlsx_sources": [
                "leguideauditif.fr-Coverage-2026-04-24.xlsx",
                "leguideauditif.fr-Coverage-Drilldown-2026-04-24.xlsx",
                "leguideauditif.fr-Coverage-Validation-2026-04-24.xlsx",
            ],
        },
        "gsc": capture_gsc(),
        "ga4": capture_ga4(),
        "coverage_sample": capture_coverage(),
    }

    out = REPORTS_DIR / f"gsc-ga4-snapshot-{today}.json"
    out.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    print(f"\nBaseline ecrit : {out}")
    print(f"GSC 28j : {snapshot['gsc']['totals']}")
    print(f"GA4 28j : {snapshot['ga4']['totals']}")

if __name__ == "__main__":
    main()

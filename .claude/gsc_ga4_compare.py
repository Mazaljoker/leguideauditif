"""
Compare 2 snapshots GSC + GA4 et produit un rapport de progression.

Usage :
    python .claude/gsc_ga4_compare.py                          # compare baseline la plus ancienne avec la plus recente
    python .claude/gsc_ga4_compare.py 2026-04-24 2026-05-01    # snapshots specifiques

Lance automatiquement un nouveau snapshot du jour s'il n'existe pas.
"""
import json
import sys
from pathlib import Path
from datetime import date

REPORTS_DIR = Path("reports")

def load(snap_date):
    f = REPORTS_DIR / f"gsc-ga4-snapshot-{snap_date}.json"
    if not f.exists():
        print(f"ERROR : snapshot introuvable {f}")
        sys.exit(1)
    return json.loads(f.read_text(encoding="utf-8"))

def list_snapshots():
    files = sorted(REPORTS_DIR.glob("gsc-ga4-snapshot-*.json"))
    return [f.stem.replace("gsc-ga4-snapshot-", "") for f in files]

def pct_change(old, new):
    if old == 0: return "(nouveau)" if new > 0 else "0"
    delta = (new - old) / old * 100
    sign = "+" if delta >= 0 else ""
    return f"{sign}{delta:.1f}%"

def arrow(old, new):
    if new > old: return "↑"
    if new < old: return "↓"
    return "="

def compare_totals(label, old_t, new_t, keys):
    print(f"\n=== {label} ===")
    print(f"{'metrique':<20} {'baseline':>12} {'now':>12} {'delta':>10}")
    for k in keys:
        o = old_t.get(k, 0)
        n = new_t.get(k, 0)
        print(f"  {k:<18} {o:>12} {n:>12} {pct_change(o, n):>10} {arrow(o, n)}")

def compare_top(label, old_list, new_list, key_field, metric_field, top_n=10):
    print(f"\n=== {label} — TOP {top_n} ===")
    old_map = {x[key_field]: x for x in old_list}
    new_map = {x[key_field]: x for x in new_list}
    # Trier par metrique descendante sur la nouvelle
    sorted_new = sorted(new_list, key=lambda x: -x.get(metric_field, 0))[:top_n]
    for n in sorted_new:
        key = n[key_field]
        o = old_map.get(key, {})
        ov = o.get(metric_field, 0)
        nv = n.get(metric_field, 0)
        label_short = str(key)[:50]
        print(f"  {nv:>5} {arrow(ov, nv)} ({pct_change(ov, nv):>8})  {label_short}")
    # Nouveaux (pas dans baseline)
    new_keys = set(new_map) - set(old_map)
    new_entries = [new_map[k] for k in new_keys]
    new_entries.sort(key=lambda x: -x.get(metric_field, 0))
    if new_entries[:5]:
        print(f"  --- nouveaux (non presents dans baseline) ---")
        for n in new_entries[:5]:
            print(f"  {n.get(metric_field, 0):>5} NEW    {str(n[key_field])[:50]}")
    # Disparus
    gone_keys = set(old_map) - set(new_map)
    gone_entries = [old_map[k] for k in gone_keys]
    gone_entries.sort(key=lambda x: -x.get(metric_field, 0))
    if gone_entries[:3]:
        print(f"  --- disparus du top {len(new_list)} ---")
        for o in gone_entries[:3]:
            print(f"  {o.get(metric_field, 0):>5} GONE   {str(o[key_field])[:50]}")

def main():
    snapshots = list_snapshots()
    if len(snapshots) < 2:
        print(f"Il faut au moins 2 snapshots pour comparer. Actuellement : {snapshots}")
        sys.exit(1)

    if len(sys.argv) == 3:
        old_date, new_date = sys.argv[1], sys.argv[2]
    else:
        old_date, new_date = snapshots[0], snapshots[-1]

    print(f"Comparaison : {old_date}  ->  {new_date}")
    old = load(old_date)
    new = load(new_date)

    # GSC totals
    compare_totals("GSC TOTAUX", old["gsc"]["totals"], new["gsc"]["totals"],
                   ["clicks", "impressions", "ctr_pct"])

    # GA4 totals
    compare_totals("GA4 TOTAUX", old["ga4"]["totals"], new["ga4"]["totals"],
                   ["sessions", "users", "pageviews"])

    # Top pages GSC par clics
    compare_top("GSC top pages (clics)", old["gsc"]["top_pages"], new["gsc"]["top_pages"],
                "url", "clicks")

    # Top queries GSC par clics
    compare_top("GSC top queries (clics)", old["gsc"]["top_queries"], new["gsc"]["top_queries"],
                "query", "clicks")

    # Top pages GA4 par sessions
    def _ga4_int(x, k):
        try: return int(x.get(k, 0))
        except: return 0
    # GA4 metric fields sont str → convertir
    for lst in (old["ga4"]["top_pages"], new["ga4"]["top_pages"]):
        for x in lst:
            for k in ("sessions", "screenPageViews"):
                x[k] = _ga4_int(x, k)
    compare_top("GA4 top pages (sessions)", old["ga4"]["top_pages"], new["ga4"]["top_pages"],
                "pagePath", "sessions")

    # Coverage sample distribution
    print("\n=== COVERAGE sample (top 100 pages impressions) ===")
    old_dist = old.get("coverage_sample", {}).get("distribution", {})
    new_dist = new.get("coverage_sample", {}).get("distribution", {})
    all_keys = set(old_dist) | set(new_dist)
    print(f"{'state':<45} {'baseline':>10} {'now':>10}")
    for k in sorted(all_keys):
        o = old_dist.get(k, 0)
        n = new_dist.get(k, 0)
        print(f"  {k[:43]:<43} {o:>10} {n:>10}  {arrow(o, n)}")

    print(f"\nComparaison terminee : {old_date}  ->  {new_date}")

if __name__ == "__main__":
    main()

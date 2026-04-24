"""Performance GSC : clics, impressions, CTR, position."""
import sys, os
sys.path.insert(0, r"c:/Users/Franck-Olivier/dev/leguideauditif-claude-code/leguideauditif/.claude")
from google_api import get_gsc_data

# 1. Totaux par jour sur 28 jours
print("=== Totaux quotidiens (28j) ===")
daily = get_gsc_data("leguideauditif", days=28, dimensions=["date"], row_limit=30)
for r in sorted(daily, key=lambda x: x["keys"][0]):
    print(f"  {r['keys'][0]}  clicks={r['clicks']:5d}  impr={r['impressions']:6d}  CTR={r['ctr']:5.2f}%  pos={r['position']:4.1f}")

# 2. Total cumulé
total_clicks = sum(r["clicks"] for r in daily)
total_impr = sum(r["impressions"] for r in daily)
avg_ctr = (total_clicks / total_impr * 100) if total_impr else 0
print(f"\n=== Cumul 28j ===")
print(f"  Clicks: {total_clicks}")
print(f"  Impressions: {total_impr}")
print(f"  CTR moyen: {avg_ctr:.2f}%")

# 3. Top 15 pages par clics
print("\n=== Top 15 pages par clics (28j) ===")
pages = get_gsc_data("leguideauditif", days=28, dimensions=["page"], row_limit=15)
for r in sorted(pages, key=lambda x: -x["clicks"])[:15]:
    url = r["keys"][0].replace("https://leguideauditif.fr", "")[:60]
    print(f"  {r['clicks']:4d} clk  {r['impressions']:5d} impr  CTR={r['ctr']:5.2f}%  pos={r['position']:4.1f}  {url}")

# 4. Top 15 requêtes
print("\n=== Top 15 requetes par clics (28j) ===")
queries = get_gsc_data("leguideauditif", days=28, dimensions=["query"], row_limit=15)
for r in sorted(queries, key=lambda x: -x["clicks"])[:15]:
    q = r["keys"][0][:50]
    print(f"  {r['clicks']:4d} clk  {r['impressions']:5d} impr  CTR={r['ctr']:5.2f}%  pos={r['position']:4.1f}  {q}")

# 5. Top 15 requetes HIGH IMPR / FAIBLE CTR (opportunites titres)
print("\n=== Opportunites : req >50 impr avec CTR < 3% (titres/metas a optimiser) ===")
allq = get_gsc_data("leguideauditif", days=28, dimensions=["query"], row_limit=100)
opps = [r for r in allq if r["impressions"] >= 50 and r["ctr"] < 3.0]
for r in sorted(opps, key=lambda x: -x["impressions"])[:15]:
    q = r["keys"][0][:50]
    print(f"  {r['clicks']:4d} clk  {r['impressions']:5d} impr  CTR={r['ctr']:5.2f}%  pos={r['position']:4.1f}  {q}")

"""
me-query-mapper — enrichit le JSON me-gsc-ingestor avec un bucket par query
(head / mid / long_tail) et un flag intent (informational / transactional /
navigational / local).

V1 : heuristiques lexicales (pas de DataForSEO). Rapide, déterministe, zéro coût.
Les volumes mensuels réels peuvent être injectés en V2 via DataForSEO MCP
(champ payload.pages[*].mapped_queries[*].monthly_volume, null par défaut).

Usage:
    python .claude/me_query_map.py [--in INPUT_JSON] [--out OUTPUT_JSON]

Defaults:
    --in  = dernier audit/gsc-ingested-*.json
    --out = audit/gsc-mapped-YYYY-MM-DD.json
"""

import argparse
import glob
import json
import os
import re
import sys
from datetime import datetime, date


# --- Heuristiques bucket (volume estimé sans DataForSEO) ---

LONG_TAIL_MODIFIERS = re.compile(
    r"\b("
    r"\d{2,4}|"                        # années, âges, prix
    r"\d{4}e|"                         # arrondissements (75009, 6eme)
    r"par\s+âge|par\s+age|"
    r"prix|tarif|cout|coût|"
    r"remboursement|secu|sécu|"
    r"normal|anormal|"
    r"audio(prothesiste|prothésiste|logiste)|"
    r"combien|comment|quel|quelle|pourquoi|où|ou|"
    r"(\w+\-\w+\-\w+)"                 # slug-like (3 segments)
    r")\b",
    re.IGNORECASE,
)

LOCAL_PATTERN = re.compile(
    r"\b("
    r"\d{5}|"                           # code postal
    r"paris|lyon|marseille|toulouse|nice|nantes|bordeaux|lille|rennes|"
    r"près|pres|dans|proche"
    r")\b",
    re.IGNORECASE,
)

TRANSACTIONAL_PATTERN = re.compile(
    r"\b(acheter|prix|tarif|cout|coût|promo|meilleur\s+prix|comparer)\b",
    re.IGNORECASE,
)

NAVIGATIONAL_PATTERN = re.compile(
    r"\b(widex|phonak|oticon|signia|resound|starkey|bernafon|unitron|"
    r"afflelou|amplifon|audika|alain\s+afflelou)\b",
    re.IGNORECASE,
)


def classify_bucket(query: str) -> str:
    """Heuristique lexicale : head / mid / long_tail."""
    words = query.strip().split()
    word_count = len(words)

    if word_count >= 5 or LONG_TAIL_MODIFIERS.search(query):
        return "long_tail"
    if word_count <= 2 and not LONG_TAIL_MODIFIERS.search(query):
        return "head"
    return "mid"


def classify_intent(query: str) -> str:
    """intent : informational / transactional / navigational / local."""
    if LOCAL_PATTERN.search(query):
        return "local"
    if TRANSACTIONAL_PATTERN.search(query):
        return "transactional"
    if NAVIGATIONAL_PATTERN.search(query):
        return "navigational"
    return "informational"


def detect_topology(url: str) -> str:
    """Matche l'URL sur les 4 topologies LGA — logique détaillée déportée
    dans me-title-auditor, mais déjà exposée ici pour filtrage précoce."""
    if url.startswith("/guides/") or url.startswith("/comparatifs/"):
        return "A_mdx_frontmatter"
    if url.startswith("/centre/"):
        return "C_template_dynamic"
    if url.startswith("/catalogue/"):
        # Sous-catégories dynamiques (marques, types, plateformes, appareils, comparer)
        parts = [p for p in url.strip("/").split("/") if p]
        if len(parts) >= 3 or (len(parts) == 2 and parts[1] not in ("classe-1", "comparer", "quiz", "index")):
            return "C_template_dynamic"
        return "B_static_props"
    if url.startswith("/audioprothesiste/"):
        return "D_template_db"
    if url.startswith("/trouver-audioprothesiste/"):
        return "B_static_props"
    if url.startswith("/etudes/") or url.startswith("/annonces/") or url.startswith("/outils/"):
        parts = [p for p in url.strip("/").split("/") if p]
        return "C_template_dynamic" if len(parts) >= 2 else "B_static_props"
    return "B_static_props"


# --- Main mapping ---

def find_latest_ingest() -> str:
    candidates = sorted(
        glob.glob(os.path.join("audit", "gsc-ingested-*.json")),
        reverse=True,
    )
    if not candidates:
        raise FileNotFoundError(
            "Aucun fichier audit/gsc-ingested-*.json. "
            "Exécute d'abord : python .claude/me_gsc_ingest.py"
        )
    return candidates[0]


def map_queries(input_path: str, output_path: str) -> dict:
    with open(input_path, "r", encoding="utf-8") as f:
        ingest = json.load(f)

    if ingest.get("type") != "me-gsc-ingestor":
        raise ValueError(
            f"Input invalide : type={ingest.get('type')} "
            f"(attendu: me-gsc-ingestor)"
        )

    pages = ingest["payload"]["pages"]
    bucket_counts = {"head": 0, "mid": 0, "long_tail": 0}
    intent_counts = {"informational": 0, "transactional": 0, "navigational": 0, "local": 0}
    topology_counts = {}

    for page in pages:
        topology = detect_topology(page["url"])
        page["topology"] = topology
        topology_counts[topology] = topology_counts.get(topology, 0) + 1

        mapped = []
        for q in page["top_queries_probable"]:
            bucket = classify_bucket(q["q"])
            intent = classify_intent(q["q"])
            bucket_counts[bucket] += 1
            intent_counts[intent] += 1
            mapped.append({
                **q,
                "bucket": bucket,
                "intent": intent,
                "monthly_volume": None,        # à remplir via DataForSEO si opt-in
                "serp_features": [],           # idem
                "ai_overview_present": None,   # idem
                "confidence": 1.0,             # 1.0 car mapping direct GSC (query deja rattachée à la page)
            })
        page["mapped_queries"] = mapped
        del page["top_queries_probable"]  # remplacé par mapped_queries

    output = {
        "type": "me-query-mapper",
        "version": "1.0.0",
        "payload": {
            **ingest["payload"],
            "pages": pages,
            "mapper_metrics": {
                "buckets": bucket_counts,
                "intents": intent_counts,
                "topologies": topology_counts,
                "dataforseo_enriched": False,
                "dataforseo_budget_consumed": 0,
                "dataforseo_budget_cap": 100,
            },
        },
        "upstream": {
            "type": "me-gsc-ingestor",
            "input_path": input_path,
            "generated_at": ingest.get("generated_at"),
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return output


def print_summary(out: dict) -> None:
    m = out["payload"]["mapper_metrics"]
    pages = out["payload"]["pages"]
    print(f"Query mapping termine -- {len(pages)} pages traitees")
    print()
    print("Topologies detectees :")
    for topo, n in sorted(m["topologies"].items(), key=lambda x: -x[1]):
        print(f"  {topo:30s} : {n} pages")
    print()
    print("Buckets queries :")
    for b, n in m["buckets"].items():
        print(f"  {b:12s} : {n} queries")
    print()
    print("Intents queries :")
    for i, n in m["intents"].items():
        print(f"  {i:15s} : {n} queries")
    print()
    print("Top 5 pages (avec queries mappees) :")
    print(f"  {'URL':45s} {'Topo':20s} {'Impr':>5s} {'Pos':>5s}")
    print("-" * 80)
    for pg in pages[:5]:
        g = pg["gsc"]
        topo = pg["topology"].split("_")[0]
        print(f"  {pg['url'][:44]:45s} {topo:20s} {g['impressions']:>5d} {g['avg_position']:>5.1f}")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-query-mapper")
    parser.add_argument("--in", dest="input", default=None, help="JSON me-gsc-ingestor en entree")
    parser.add_argument("--out", default=None, help="JSON de sortie")
    args = parser.parse_args()

    input_path = args.input or find_latest_ingest()
    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"gsc-mapped-{today}.json")

    output = map_queries(input_path=input_path, output_path=output_path)
    print_summary(output)
    print()
    print(f"JSON ecrit : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
me-snippet-evaluator — GATE 1 du pipeline snippet.

Pour chaque proposition de me-title-writer, calcule un score 0-100 sur 6 axes :
  relevance_query          x0.25
  ctr_prediction           x0.20
  pixel_width_compliance   x0.15
  clarity_non_clickbait    x0.15
  coherence_title_h1_meta  x0.15
  differentiation_vs_serp  x0.10  (v1 sans DataForSEO : score neutre 50/100)

Verdict :
  PASS   = score_total >= 75 ET relevance_query >= 80 ET pixel_width_compliance = 100
  REVISE = 55-74
  REJECT = < 55

L'évaluateur JUGE uniquement. Il ne modifie JAMAIS les propositions.
Max 3 iterations writer <-> evaluator via orchestrateur me-snippet-pipeline.

Input  : audit/title-proposals-YYYY-MM-DD.json
Output : audit/snippet-eval-YYYY-MM-DD.json
"""

import argparse
import glob as pyglob
import json
import os
import re
import sys
from datetime import datetime, date


# ==========================================================================
# Helpers (mutualisés avec me-title-writer pour cohérence)
# ==========================================================================

CLICKBAIT_PATTERNS = re.compile(
    r"\b(vous\s+ne\s+devinerez|incroyable|choquant|secret|astuce|hack|"
    r"ce\s+qu['’]ils\s+(ne\s+)?veulent\s+pas|ils\s+détestent)\b",
    re.IGNORECASE,
)

EXCESSIVE_CAPS = re.compile(r"\b[A-Z]{3,}\b")

CREDIBILITY_QUANTIFIED = re.compile(
    r"(28\s*ans|3[\s,.]*000\s*patients|DE\b|diplom[ée]|expert)",
    re.IGNORECASE,
)

SUPERCLAIMS = re.compile(
    r"\b(le\s+meilleur|la\s+meilleure|n°\s*1|meilleur\s+du\s+marché|incontournable)\b",
    re.IGNORECASE,
)


STOP_WORDS = {
    "le", "la", "les", "un", "une", "de", "des", "du", "à", "a", "au", "aux",
    "et", "ou", "en", "dans", "par", "pour", "sur", "avec", "sans", "qui",
    "que", "quoi", "est", "sont", "ce", "cette", "ces", "son", "sa", "ses",
}


def tokenize(text: str) -> set[str]:
    tokens = re.findall(r"[\w\-]+", (text or "").lower())
    return {t for t in tokens if t not in STOP_WORDS and len(t) > 1}


def query_coverage(query: str, text: str) -> float:
    """Retourne la fraction de tokens de `query` présents dans `text` (0-1)."""
    q = tokenize(query)
    t = tokenize(text)
    if not q:
        return 0.0
    return len(q & t) / len(q)


# ==========================================================================
# Template rendering (pour GATE 1 sur templates C/D)
# ==========================================================================

SAMPLE_VARS = {
    "fullName": "Oticon Xceed 3 UP",  # ~18 chars
    "typedCentre.nom": "Audika La Brede",  # ~15 chars
    "displayVille": "La Brede",  # 8 chars
    "FORME_TYPE_LABELS[product.formeType]": "Contour d'oreille",
    "product.puce": "Polaris",
    "price ? formatPrice(price) + ' par appareil. ' : ''": "1 500 € par appareil. ",
    "price ? 'À partir de ' + formatPrice(price) + ' par appareil. ' : ''": "À partir de 1 500 € par appareil. ",
    "brand.label": "Widex",
    "typeLabel": "Intra-auriculaires",
    "platform.nom": "Polaris",
    "depName": "Rhône",
    "depCode": "69",
    "villeName": "Lyon",
    "title": "Guide",
    "description": "Guide complet.",
}


def render_sample(pattern: str) -> str:
    """Remplace ${...} par des valeurs échantillon pour scorer un pattern."""
    if not pattern:
        return ""
    result = pattern
    # Les patterns les plus longs d'abord (evite matches partiels)
    for var, sample in sorted(SAMPLE_VARS.items(), key=lambda x: -len(x[0])):
        result = result.replace("${" + var + "}", sample)
    # Catch-all : toute interpolation non mappée remplacée par placeholder court
    result = re.sub(r"\$\{[^}]+\}", "X", result)
    return result


# ==========================================================================
# 6 axes scoring
# ==========================================================================

def score_relevance_query(variant: dict, queries: list[dict], rendered_title: str, rendered_meta: str) -> int:
    """Axe 1: requête primaire + secondaires + long-tail (100 max)."""
    if not queries:
        return 50  # neutre si pas de queries

    score = 0
    sorted_q = sorted(queries, key=lambda q: q["impr"], reverse=True)
    primary = sorted_q[0]["q"]
    secondaries = [q["q"] for q in sorted_q[1:3]]
    long_tails = [q["q"] for q in sorted_q if q["bucket"] == "long_tail" and q["impr"] >= 2]

    # Primary query coverage dans title (40)
    prim_cov = query_coverage(primary, rendered_title)
    if prim_cov >= 0.75:
        score += 40
    elif prim_cov >= 0.5:
        score += 20

    # Secondaire dans title OU meta (30)
    if any(query_coverage(s, rendered_title + " " + rendered_meta) >= 0.5 for s in secondaries):
        score += 30
    elif secondaries:
        score += 10

    # Long-tail captured (20)
    lt_captured = sum(
        1 for lt in long_tails
        if query_coverage(lt, rendered_title + " " + rendered_meta) >= 0.5
    )
    if long_tails:
        score += int(20 * min(1.0, lt_captured / max(len(long_tails), 1)))
    else:
        score += 10  # pas de long-tail = pas de pénalité

    # Bonus variante morphologique (10) si primary key token présent
    primary_tokens = tokenize(primary)
    if primary_tokens and primary_tokens & tokenize(rendered_title):
        score += 10

    return min(100, score)


def score_ctr_prediction(variant: dict, current_ctr: float) -> int:
    """Axe 2: utilise le delta prédit par le writer, normalisé 0-100."""
    delta = variant.get("predicted_ctr_delta_pct", 0.0)
    # delta typique: -15 (toxique) à +15 (excellent)
    # Map : 0 -> 50 points (neutre), +15 -> 100, -15 -> 0
    score = 50 + (delta * 100 / 30)
    return max(0, min(100, int(score)))


def score_pixel_width(variant: dict) -> int:
    """Axe 3: title <= 580px safe, meta <= 155 chars (100 max)."""
    title_px = variant.get("title_pixels_estimated", 0)
    meta_chars = variant.get("meta_chars", 0)

    score = 0
    # Title pixel (60)
    if title_px <= 520:
        score += 60
    elif title_px <= 580:
        score += 40
    elif title_px <= 600:
        score += 20
    else:
        score += 0

    # Meta chars (40)
    if meta_chars <= 155:
        score += 40
    elif meta_chars <= 170:
        score += 20
    else:
        score += 0

    return score


def score_clarity_non_clickbait(variant: dict, rendered_title: str, rendered_meta: str) -> int:
    """Axe 4: clickbait, majuscules, factuel (100 max)."""
    score = 100

    if CLICKBAIT_PATTERNS.search(rendered_title) or CLICKBAIT_PATTERNS.search(rendered_meta):
        score -= 50

    if EXCESSIVE_CAPS.search(rendered_title):
        score -= 20

    if SUPERCLAIMS.search(rendered_title):
        score -= 30

    # Bonus factuel : présence de number, crédibilité chiffrée, date
    if CREDIBILITY_QUANTIFIED.search(rendered_title + " " + rendered_meta):
        score += 0  # plancher : pas de pénalité si credibility présente (déjà full score)

    return max(0, min(100, score))


def score_coherence(variant: dict, rendered_title: str, rendered_meta: str) -> int:
    """Axe 5: keyword cohérent title/h1/meta, pas de redite, h1 != title."""
    h1 = variant.get("h1_suggested") or ""
    rendered_h1 = render_sample(h1) if "${" in h1 else h1

    score = 0
    # Keyword primaire (racine du title) dans h1 (40)
    title_tokens = tokenize(rendered_title)
    h1_tokens = tokenize(rendered_h1)
    if title_tokens and h1_tokens:
        overlap = len(title_tokens & h1_tokens) / len(title_tokens)
        if overlap >= 0.4:
            score += 40
        elif overlap >= 0.2:
            score += 20

    # Meta développe sans redite (30)
    # Heuristique : meta contient au moins 50% de tokens NON dans title
    meta_tokens = tokenize(rendered_meta)
    if meta_tokens and title_tokens:
        extra = len(meta_tokens - title_tokens) / len(meta_tokens)
        if extra >= 0.5:
            score += 30
        elif extra >= 0.3:
            score += 15

    # H1 != title (30)
    if rendered_h1 and rendered_h1.strip() != rendered_title.strip():
        score += 30

    return min(100, score)


def score_differentiation(variant: dict) -> tuple[int, str]:
    """Axe 6: v1 sans DataForSEO, score neutre + flag pour V2."""
    return (50, "v1_neutral_no_dataforseo")


# ==========================================================================
# Verdict
# ==========================================================================

WEIGHTS = {
    "relevance_query": 0.25,
    "ctr_prediction": 0.20,
    "pixel_width_compliance": 0.15,
    "clarity_non_clickbait": 0.15,
    "coherence_title_h1_meta": 0.15,
    "differentiation_vs_serp": 0.10,
}


def compute_verdict(scores: dict) -> str:
    total = sum(scores[axe] * w for axe, w in WEIGHTS.items())
    if (
        total >= 75
        and scores["relevance_query"] >= 80
        and scores["pixel_width_compliance"] == 100
    ):
        return "PASS"
    if total >= 55:
        return "REVISE"
    return "REJECT"


def generator_instructions(scores: dict, verdict: str) -> str | None:
    """Instructions pour le writer en cas de REVISE."""
    if verdict == "PASS":
        return None
    instructions = []
    if scores["relevance_query"] < 80:
        instructions.append("Integrer la requete primaire en debut de title (coverage >= 75%).")
    if scores["pixel_width_compliance"] < 100:
        instructions.append("Reduire title a <= 580px (idealement <= 520px) ET meta a <= 155 chars.")
    if scores["clarity_non_clickbait"] < 70:
        instructions.append("Retirer patterns clickbait, superclaims ou majuscules excessives.")
    if scores["coherence_title_h1_meta"] < 60:
        instructions.append("Aligner keyword primaire entre title et h1, eviter redite meta/title.")
    if scores["ctr_prediction"] < 50:
        instructions.append("Ajouter sentiment positif (expert/guide/verifie), number ou credibilite chiffree.")
    return " ".join(instructions) if instructions else None


# ==========================================================================
# Main
# ==========================================================================

def evaluate_proposal(prop: dict, queries_by_url: dict) -> dict:
    variant = prop["variant"]
    url = prop["url"]

    # Rendre les patterns C/D avec sample vars
    title = variant["title"]
    meta = variant["meta"]
    rendered_title = render_sample(title) if "${" in title else title
    rendered_meta = render_sample(meta) if "${" in meta else meta

    queries = queries_by_url.get(url, [])
    current_ctr = 0.0  # on ne connait pas le CTR original ici, used as neutral

    scores = {
        "relevance_query": score_relevance_query(variant, queries, rendered_title, rendered_meta),
        "ctr_prediction": score_ctr_prediction(variant, current_ctr),
        "pixel_width_compliance": score_pixel_width(variant),
        "clarity_non_clickbait": score_clarity_non_clickbait(variant, rendered_title, rendered_meta),
        "coherence_title_h1_meta": score_coherence(variant, rendered_title, rendered_meta),
    }
    diff_score, diff_note = score_differentiation(variant)
    scores["differentiation_vs_serp"] = diff_score

    score_total = round(sum(scores[axe] * w for axe, w in WEIGHTS.items()), 1)
    verdict = compute_verdict(scores)
    instructions = generator_instructions(scores, verdict)

    return {
        "url": url,
        "topology": prop["topology"],
        "source_file": prop["source_file"],
        "patch_mode": prop["patch_mode"],
        "rendered_sample": {
            "title": rendered_title,
            "meta": rendered_meta,
        } if "${" in title or "${" in meta else None,
        "scores": scores,
        "score_total": score_total,
        "verdict": verdict,
        "differentiation_note": diff_note,
        "generator_instructions": instructions,
        "weights": WEIGHTS,
    }


def load_queries_by_url() -> dict:
    """Charge le dernier gsc-mapped-*.json pour récupérer les queries par URL."""
    candidates = sorted(pyglob.glob(os.path.join("audit", "gsc-mapped-*.json")), reverse=True)
    if not candidates:
        return {}
    with open(candidates[0], "r", encoding="utf-8") as f:
        mapped = json.load(f)
    return {p["url"]: p["mapped_queries"] for p in mapped["payload"]["pages"]}


def find_latest_proposals() -> str:
    candidates = sorted(pyglob.glob(os.path.join("audit", "title-proposals-*.json")), reverse=True)
    if not candidates:
        raise FileNotFoundError(
            "Aucun audit/title-proposals-*.json. Executez : python .claude/me_title_write.py"
        )
    return candidates[0]


def evaluate(input_path: str, output_path: str) -> dict:
    with open(input_path, "r", encoding="utf-8") as f:
        proposals = json.load(f)

    if proposals.get("type") != "me-title-writer":
        raise ValueError(f"Input invalide: type={proposals.get('type')}")

    queries_by_url = load_queries_by_url()

    evaluated = []
    for prop in proposals["payload"]["individual_proposals"]:
        evaluated.append(evaluate_proposal(prop, queries_by_url))
    for prop in proposals["payload"]["template_proposals"]:
        evaluated.append(evaluate_proposal(prop, queries_by_url))

    metrics = {
        "total_evaluated": len(evaluated),
        "PASS": sum(1 for e in evaluated if e["verdict"] == "PASS"),
        "REVISE": sum(1 for e in evaluated if e["verdict"] == "REVISE"),
        "REJECT": sum(1 for e in evaluated if e["verdict"] == "REJECT"),
        "avg_score_total": round(sum(e["score_total"] for e in evaluated) / max(len(evaluated), 1), 1),
    }

    output = {
        "type": "me-snippet-evaluator",
        "version": "1.0.0",
        "payload": {
            "period": proposals["payload"]["period"],
            "evaluated_proposals": evaluated,
            "metrics": metrics,
        },
        "upstream": {
            "type": "me-title-writer",
            "input_path": input_path,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return output


def print_summary(out: dict) -> None:
    m = out["payload"]["metrics"]
    print(f"Snippet evaluator (GATE 1) -- {m['total_evaluated']} propositions evaluees")
    print()
    print(f"  PASS   : {m['PASS']}")
    print(f"  REVISE : {m['REVISE']}")
    print(f"  REJECT : {m['REJECT']}")
    print(f"  Score total moyen : {m['avg_score_total']}/100")
    print()
    print("Details par proposition :")
    print(f"  {'URL':45s} {'Topo':5s} {'Score':>6s} {'Verdict':>8s} {'Rel':>4s} {'CTR':>4s} {'Pix':>4s} {'Cla':>4s} {'Coh':>4s}")
    print("-" * 90)
    for e in out["payload"]["evaluated_proposals"]:
        topo = e["topology"].split("_")[0]
        s = e["scores"]
        url_short = e["url"][:44] if e["patch_mode"] == "individual" else f"[TPL] {e['source_file'][-32:]}"
        print(
            f"  {url_short:45s} {topo:5s} {e['score_total']:>6.1f} {e['verdict']:>8s} "
            f"{s['relevance_query']:>4d} {s['ctr_prediction']:>4d} "
            f"{s['pixel_width_compliance']:>4d} {s['clarity_non_clickbait']:>4d} "
            f"{s['coherence_title_h1_meta']:>4d}"
        )
    print()
    for e in out["payload"]["evaluated_proposals"]:
        if e["verdict"] != "PASS" and e.get("generator_instructions"):
            print(f"[{e['verdict']}] {e['url']}")
            print(f"  -> {e['generator_instructions']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-snippet-evaluator (GATE 1)")
    parser.add_argument("--in", dest="input", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    input_path = args.input or find_latest_proposals()
    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"snippet-eval-{today}.json")

    output = evaluate(input_path=input_path, output_path=output_path)
    print_summary(output)
    print()
    print(f"JSON ecrit : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

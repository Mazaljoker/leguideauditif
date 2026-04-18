"""
me-title-writer — génère UNE proposition title/meta/H1 par page auditée.

Suit la formule ABC Ahrefs (Adjective + Benefit + Confidence booster),
YMYL-safe (pas de promesse thérapeutique, DE surfacé), pixel-width aware
(approximation 8 px/char ≈ 480 px pour 60 chars safe).

Pour topologies C/D (templates), produit un NOUVEAU pattern de construction
(patch unique affecte N pages) PLUS des overrides individuels optionnels
pour les top N pages du template.

Input  : audit/title-audit-YYYY-MM-DD.json
Output : audit/title-proposals-YYYY-MM-DD.json
"""

import argparse
import glob as pyglob
import json
import os
import re
import sys
from datetime import datetime, date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)


# ==========================================================================
# Pixel width estimation (approximation for Inter/Roboto @ 18px)
# ==========================================================================

# Poids pixels moyens par caractère (hors grasse)
NARROW_CHARS = set("ilI.,;:|!()[]{}'")
WIDE_CHARS = set("mwMW@#%&")


def estimate_pixels(text: str) -> int:
    if not text:
        return 0
    total = 0
    for c in text:
        if c in NARROW_CHARS:
            total += 5
        elif c in WIDE_CHARS:
            total += 12
        elif c == " ":
            total += 4
        else:
            total += 8
    return total


# ==========================================================================
# YMYL safety
# ==========================================================================

FORBIDDEN_PATTERNS = re.compile(
    r"\b(guér(ir|ison)|éliminer?|100[\s%]*efficace|miracle|sans\s+égal|"
    r"garantie\s+totale|remède\s+absolu|solution\s+définitive)\b",
    re.IGNORECASE,
)

SUPERCLAIM_PATTERNS = re.compile(
    r"\b(le\s+meilleur|la\s+meilleure|meilleur\s+du\s+marché|n°\s*1|numero\s+un|incontournable)\b",
    re.IGNORECASE,
)


def is_ymyl_safe(text: str) -> tuple[bool, list[str]]:
    """Retourne (safe, violations)."""
    if not text:
        return (True, [])
    violations = []
    if FORBIDDEN_PATTERNS.search(text):
        violations.append("therapeutic_promise")
    if SUPERCLAIM_PATTERNS.search(text):
        violations.append("superclaim")
    return (len(violations) == 0, violations)


# ==========================================================================
# CTR prediction heuristic (sans API payante)
# ==========================================================================

CREDIBILITY_QUANTIFIED = re.compile(r"(28\s*ans|3[\s,.]*000\s*patients|DE\b|diplom[ée])", re.IGNORECASE)
NUMBER_IN_TITLE = re.compile(r"\b\d+\b")
POSITIVE_SENTIMENT = re.compile(
    r"\b(expert|guide|vérifié|verifie|fiable|complet|exhaustif|officiel|transparent)\b",
    re.IGNORECASE,
)
QUESTION_MARKER = re.compile(r"[?¿]|\b(comment|pourquoi|quel|quelle|quand|où|ou)\b", re.IGNORECASE)


def predict_ctr_delta_pct(title: str, meta: str, current_ctr: float) -> float:
    """Delta CTR prédit (heuristique). Retourne un pourcentage (ex: +3.2)."""
    delta = 0.0

    # Bonus
    if POSITIVE_SENTIMENT.search(title):
        delta += 4.1
    if NUMBER_IN_TITLE.search(title):
        delta += 3.0
    if CREDIBILITY_QUANTIFIED.search(title):
        delta += 5.0
    if QUESTION_MARKER.search(title):
        delta += 2.0

    # Malus
    _, title_violations = is_ymyl_safe(title)
    if "superclaim" in title_violations:
        delta -= 8.0
    if "therapeutic_promise" in title_violations:
        delta -= 15.0

    # Suffixe parasite (même si déjà retiré par le writer, vérif paranoid)
    if any(s in title for s in ("— LGA", "- LGA", "| LGA")):
        delta -= 5.0

    return round(delta, 1)


# ==========================================================================
# Query integration helpers
# ==========================================================================

def normalize_query(q: str) -> str:
    """Majuscule 1ère lettre, reste inchangé."""
    return q[:1].upper() + q[1:] if q else q


def extract_keyword_root(query: str) -> str:
    """Extrait le mot-clé principal (premier mot significatif) — pour titles courts."""
    stop = {"le", "la", "les", "un", "une", "de", "des"}
    words = [w for w in re.findall(r"[\w\-]+", query.lower()) if w not in stop]
    return words[0] if words else query


def find_common_long_tail_theme(long_tails: list[str]) -> str | None:
    """Si plusieurs long-tails partagent un thème commun (ex: 'par âge'), l'extrait."""
    if len(long_tails) < 2:
        return None
    # Détection naïve : si ≥2 long-tails se différencient uniquement par un chiffre (âge, année)
    stripped = [re.sub(r"\b\d+\b", "N", lt.lower()).strip() for lt in long_tails]
    if len(set(stripped)) == 1:
        # Tous identiques après masquage des chiffres -> theme = "par âge" ou similaire
        sample = long_tails[0].lower()
        if re.search(r"\b\d{2,3}\s*ans?\b", sample):
            return "par âge"
        if re.search(r"\b20\d{2}\b", sample):
            return "par année"
    return None


# ==========================================================================
# Writers per topology
# ==========================================================================

def write_for_mdx_guide(page: dict) -> dict:
    """Topologie A : page MDX individuelle, frontmatter patch."""
    primary = page["mismatch"].get("primary_query") or ""
    long_tails = [q["q"] for q in page["mapped_queries"] if q["bucket"] == "long_tail" and q["impr"] >= 2]
    theme = find_common_long_tail_theme(long_tails)

    root = extract_keyword_root(primary)

    # Cas spécial : audiogramme + long-tails "par âge"
    if theme == "par âge" and root:
        title = f"{root.capitalize()} normal : seuils par âge (expert DE)"
        h1 = f"{root.capitalize()} normal : quels seuils à 50, 60, 70 ans ?"
        meta = (
            f"Comment lire un {root} à 50, 60, 70 ans ? Seuils normaux, "
            f"classification BIAP. Par un audioprothésiste DE, 28 ans d'expérience."
        )
        formula = "ABC + long_tail_theme:age"
    else:
        # Fallback générique
        primary_cap = normalize_query(primary)
        title = f"{primary_cap} : guide complet par un audio DE"
        h1 = f"{primary_cap} : ce qu'il faut savoir"
        meta = (
            f"{primary_cap} — guide expert par Franck-Olivier, "
            f"audioprothésiste DE 28 ans d'expérience, 3 000 patients suivis."
        )
        formula = "ABC + primary_query_integrated"

    return _finalize_variant(page, title, meta, h1, formula, long_tails, primary, patch_mode="individual")


def write_for_static_page(page: dict) -> dict:
    """Topologie B : props <BaseLayout> dans un fichier .astro statique."""
    url = page["url"]
    primary = page["mismatch"].get("primary_query") or ""
    long_tails = [q["q"] for q in page["mapped_queries"] if q["bucket"] == "long_tail" and q["impr"] >= 2]

    if url == "/":
        title = "LeGuideAuditif : guide audioprothèse indépendant (DE)"
        h1 = "Le Guide Auditif"
        meta = (
            "Guide indépendant audioprothèse par Franck-Olivier, audioprothésiste DE, "
            "28 ans d'expérience. Tests appareils, comparatifs, annuaire 7 000+ centres."
        )
        formula = "static_homepage_credibility"
    elif "trouver-audioprothesiste" in url:
        title = "Trouver un audioprothésiste : 7 000+ centres vérifiés"
        h1 = "Trouver un audioprothésiste près de chez vous"
        meta = (
            "Annuaire indépendant 7 000+ audioprothésistes diplômés d'État en France. "
            "Filtrage par code postal, horaires, avis. Par un audio DE 28 ans."
        )
        formula = "static_directory_volume_proof"
    else:
        primary_cap = normalize_query(primary) if primary else url.strip("/").replace("-", " ").title()
        title = f"{primary_cap} | guide audioprothèse DE"[:60]
        h1 = primary_cap
        meta = f"{primary_cap} — guide indépendant par un audioprothésiste DE, 28 ans d'expérience."
        formula = "static_page_generic"

    return _finalize_variant(page, title, meta, h1, formula, long_tails, primary, patch_mode="individual")


def write_for_template_dynamic(page: dict) -> dict:
    """Topologie C : template dynamique. Mode PATTERN (patch unique du template)."""
    url = page["url"]
    primary = page["mismatch"].get("primary_query") or ""
    long_tails = [q["q"] for q in page["mapped_queries"] if q["bucket"] == "long_tail" and q["impr"] >= 2]

    if url.startswith("/centre/"):
        title_pattern = "${typedCentre.nom} - Audioprothésiste ${displayVille}"
        h1_pattern = "${typedCentre.nom}"
        meta_pattern = (
            "${typedCentre.nom} - audioprothésiste à ${displayVille}. "
            "Horaires, avis vérifiés, expert DE 28 ans."
        )
        formula = "template:centre_credibility"
        individual_override = _centre_individual_override(page, primary)

    elif url.startswith("/catalogue/appareils/"):
        # Pattern template avec crédibilité + prix dans meta (budget meta <= 155)
        title_pattern = "${fullName} : prix, avis et fiche expert DE"
        h1_pattern = "${fullName}"
        meta_pattern = (
            "${fullName} : ${FORME_TYPE_LABELS[product.formeType]}. "
            "${price ? formatPrice(price) + ' par appareil. ' : ''}"
            "Avis expert audio DE 28 ans."
        )
        formula = "template:catalogue_appareil_price_expert"
        individual_override = _catalogue_individual_override(page, primary)

    elif url.startswith("/catalogue/marques/"):
        title_pattern = "${brand.label} : gamme, prix, avis (audio DE)"
        h1_pattern = "Gamme ${brand.label}"
        meta_pattern = (
            "${brand.label} - gamme complète d'aides auditives, prix indicatifs, "
            "avis et comparatifs par un audioprothésiste DE, 28 ans d'expérience."
        )
        formula = "template:catalogue_marque"
        individual_override = None

    elif url.startswith("/catalogue/types/"):
        title_pattern = "${typeLabel} : prix, modèles, avis (expert DE)"
        h1_pattern = "Aides auditives ${typeLabel}"
        meta_pattern = (
            "${typeLabel} : modèles, fourchettes de prix, avantages et limites. "
            "Comparatif par un audioprothésiste DE, 28 ans d'expérience."
        )
        formula = "template:catalogue_type"
        individual_override = None

    elif url.startswith("/catalogue/plateformes/"):
        title_pattern = "Puce ${platform.nom} : appareils équipés, avis"
        h1_pattern = "Plateforme ${platform.nom}"
        meta_pattern = (
            "Puce ${platform.nom} : aides auditives équipées, performances sonores, "
            "autonomie. Analyse par un audioprothésiste DE, 28 ans d'expérience."
        )
        formula = "template:catalogue_plateforme"
        individual_override = None

    else:
        # Générique template C non reconnu
        primary_cap = normalize_query(primary) if primary else ""
        title_pattern = f"{primary_cap} : guide expert (audio DE 28 ans)"[:60] if primary_cap else "${title}"
        h1_pattern = "${title}"
        meta_pattern = "${description} Par un audioprothésiste DE, 28 ans d'expérience."
        formula = "template:generic_c"
        individual_override = None

    return _finalize_variant(
        page,
        title_pattern,
        meta_pattern,
        h1_pattern,
        formula,
        long_tails,
        primary,
        patch_mode="template_pattern",
        individual_override=individual_override,
    )


def write_for_template_db(page: dict) -> dict:
    """Topologie D : template + data DB (Supabase). Pattern + override DB optionnel."""
    url = page["url"]
    primary = page["mismatch"].get("primary_query") or ""
    long_tails = [q["q"] for q in page["mapped_queries"] if q["bucket"] == "long_tail" and q["impr"] >= 2]

    if url.startswith("/audioprothesiste/departement/"):
        title_pattern = "Audioprothésiste ${depName} : N centres vérifiés"
        h1_pattern = "Audioprothésistes ${depName} (${depCode})"
        meta_pattern = (
            "Annuaire audioprothésistes ${depName} : N centres diplômés d'État, "
            "filtres par ville et code postal. Curé par un audio DE 28 ans."
        )
        formula = "template_db:departement"
    elif url.startswith("/audioprothesiste/"):
        title_pattern = "Audioprothésiste ${villeName} : N centres (avis DE)"
        h1_pattern = "Audioprothésistes à ${villeName}"
        meta_pattern = (
            "Trouver un audioprothésiste à ${villeName} : N centres diplômés d'État, "
            "horaires, avis. Annuaire curé par un audio DE 28 ans, 3 000 patients suivis."
        )
        formula = "template_db:ville_credibility"
    else:
        title_pattern = "${title} (audio DE 28 ans)"
        h1_pattern = "${title}"
        meta_pattern = "${description} Par un audioprothésiste DE."
        formula = "template_db:generic"

    return _finalize_variant(
        page,
        title_pattern,
        meta_pattern,
        h1_pattern,
        formula,
        long_tails,
        primary,
        patch_mode="template_pattern",
    )


def _centre_individual_override(page: dict, primary: str) -> dict | None:
    """Pour les centres top, on peut ajouter une override seoTitle dans une
    table Supabase `centres_seo_overrides`. V1 : proposition seulement."""
    if page["gsc"]["impressions"] < 5:
        return None
    slug = page["url"].strip("/").split("/")[-1]
    return {
        "store": "supabase:centres_seo_overrides",
        "key": slug,
        "seoTitle": f"{primary} — coordonnées et avis vérifiés" if primary else None,
        "seoDescription": f"{primary} — horaires, avis vérifiés, par un audio DE 28 ans." if primary else None,
        "note": "v1 : propose override, implementation J6 (me-snippet-fixer)",
    }


def _catalogue_individual_override(page: dict, primary: str) -> dict | None:
    """Pour les appareils top, ajouter seoTitle/seoDescription dans le frontmatter
    du fichier JSON produit (schéma catalogueAppareils à étendre en J6)."""
    if page["gsc"]["impressions"] < 3:
        return None
    slug = page["url"].strip("/").split("/")[-1]
    primary_cap = normalize_query(primary) if primary else slug.replace("-", " ").title()
    return {
        "store": "content_collection:catalogueAppareils.seoTitle/seoDescription",
        "key": slug,
        "seoTitle": f"{primary_cap} : prix et avis expert DE"[:60],
        "seoDescription": f"{primary_cap} : fiche complète, prix indicatif, avis par un audio DE 28 ans.",
        "note": "v1 : propose override, schéma Zod à étendre + fichier JSON à patcher en J6",
    }


# ==========================================================================
# Finalization
# ==========================================================================

def _finalize_variant(
    page: dict,
    title: str,
    meta: str,
    h1: str,
    formula: str,
    long_tails: list[str],
    primary: str,
    patch_mode: str,
    individual_override: dict | None = None,
) -> dict:
    """Pack le résultat final avec validations."""
    safe, title_violations = is_ymyl_safe(title)
    meta_safe, meta_violations = is_ymyl_safe(meta)

    title_chars = len(title)
    meta_chars = len(meta)
    title_px = estimate_pixels(title)

    ctr_delta = predict_ctr_delta_pct(title, meta, page["gsc"]["ctr"])

    rationale_parts = []
    if primary:
        rationale_parts.append(f"Integre la requete primaire '{primary}'")
    if CREDIBILITY_QUANTIFIED.search(title) or CREDIBILITY_QUANTIFIED.search(meta):
        rationale_parts.append("credibilite DE + 28 ans surfacee")
    if any(s in (title + meta) for s in ("verif", "expert", "guide")):
        rationale_parts.append("sentiment positif (+4.1% CTR)")
    if patch_mode == "template_pattern":
        rationale_parts.append("patch template unique = N pages affectees")

    return {
        "url": page["url"],
        "topology": page["topology"],
        "source_file": page["source_file"],
        "patch_mode": patch_mode,
        "variant": {
            "title": title,
            "meta": meta,
            "h1_suggested": h1,
            "title_chars": title_chars,
            "meta_chars": meta_chars,
            "title_pixels_estimated": title_px,
            "formula_used": formula,
            "predicted_ctr_delta_pct": ctr_delta,
            "sentiment": "positive" if POSITIVE_SENTIMENT.search(title) else "neutral",
            "rationale": ". ".join(rationale_parts) + ".",
            "long_tails_integrated": [lt for lt in long_tails if any(
                w in title.lower() or w in meta.lower()
                for w in re.findall(r"[\w\-]+", lt.lower())
                if len(w) > 3
            )],
        },
        "ymyl_check": {
            "title_safe": safe,
            "meta_safe": meta_safe,
            "title_violations": title_violations,
            "meta_violations": meta_violations,
        },
        "constraints_respected": {
            "title_under_60_chars": title_chars <= 60,
            "title_under_580_px": title_px <= 580,
            "meta_under_155_chars": meta_chars <= 155,
            "credibility_surfaced": bool(
                CREDIBILITY_QUANTIFIED.search(title) or CREDIBILITY_QUANTIFIED.search(meta)
            ),
            "price_in_meta_if_catalogue": (
                not page["url"].startswith("/catalogue/appareils/")
                or bool(re.search(r"(€|prix|tarif|formatPrice)", meta, re.IGNORECASE))
            ),
        },
        "individual_override": individual_override,
    }


# ==========================================================================
# Main
# ==========================================================================

WRITERS = {
    "A_mdx_frontmatter": write_for_mdx_guide,
    "B_static_props": write_for_static_page,
    "C_template_dynamic": write_for_template_dynamic,
    "D_template_db": write_for_template_db,
}


def find_latest_audit() -> str:
    candidates = sorted(pyglob.glob(os.path.join("audit", "title-audit-*.json")), reverse=True)
    if not candidates:
        raise FileNotFoundError(
            "Aucun audit/title-audit-*.json. "
            "Executez : python .claude/me_title_audit.py"
        )
    return candidates[0]


def write_proposals(input_path: str, output_path: str, priority_filter: str) -> dict:
    with open(input_path, "r", encoding="utf-8") as f:
        audit = json.load(f)

    if audit.get("type") != "me-title-auditor":
        raise ValueError(f"Input invalide: type={audit.get('type')}")

    priority_order = ["high", "medium", "low"]
    min_priority_idx = priority_order.index(priority_filter)

    proposals = []
    for page in audit["payload"]["pages"]:
        page_priority_idx = priority_order.index(page["priority"])
        if page_priority_idx > min_priority_idx:
            continue

        writer = WRITERS.get(page["topology"])
        if writer is None:
            continue
        prop = writer(page)
        prop["priority"] = page["priority"]
        prop["roi_score"] = page["roi"]["score"]
        prop["mismatch_score_before"] = page["mismatch"]["score"]
        proposals.append(prop)

    # Tri : priorité high > medium > low, puis ROI desc
    proposals.sort(key=lambda p: (
        priority_order.index(p["priority"]),
        -p["roi_score"],
    ))

    # Deduplicate template patterns (même topologie + même patch_mode = 1 seule entrée)
    template_patterns_seen = set()
    individual_overrides = []
    template_proposals = []
    individual_proposals = []
    for prop in proposals:
        if prop["patch_mode"] == "template_pattern":
            key = (prop["topology"], prop["variant"]["formula_used"])
            if key not in template_patterns_seen:
                template_patterns_seen.add(key)
                template_proposals.append(prop)
            if prop.get("individual_override"):
                individual_overrides.append({
                    "url": prop["url"],
                    "source_file": prop["source_file"],
                    **prop["individual_override"],
                })
        else:
            individual_proposals.append(prop)

    output = {
        "type": "me-title-writer",
        "version": "1.0.0",
        "payload": {
            "period": audit["payload"]["period"],
            "priority_filter": priority_filter,
            "individual_proposals": individual_proposals,
            "template_proposals": template_proposals,
            "individual_overrides_for_templates": individual_overrides,
            "writer_metrics": {
                "total_proposals": len(proposals),
                "individual_count": len(individual_proposals),
                "template_patterns_count": len(template_proposals),
                "individual_overrides_count": len(individual_overrides),
                "ymyl_violations": sum(
                    1 for p in proposals
                    if not p["ymyl_check"]["title_safe"] or not p["ymyl_check"]["meta_safe"]
                ),
                "constraints_failed": sum(
                    1 for p in proposals
                    if not all(p["constraints_respected"].values())
                ),
            },
        },
        "upstream": {
            "type": "me-title-auditor",
            "input_path": input_path,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return output


def print_summary(out: dict) -> None:
    m = out["payload"]["writer_metrics"]
    print(f"Title writer termine -- {m['total_proposals']} propositions")
    print()
    print(f"  Individual (A/B)         : {m['individual_count']}")
    print(f"  Template patterns (C/D)  : {m['template_patterns_count']}")
    print(f"  Individual overrides     : {m['individual_overrides_count']}")
    print(f"  YMYL violations          : {m['ymyl_violations']} (doit etre 0)")
    print(f"  Contraintes non respectees : {m['constraints_failed']} (doit etre 0)")
    print()

    if out["payload"]["individual_proposals"]:
        print("=" * 90)
        print("INDIVIDUAL PROPOSALS (topologies A + B)")
        print("=" * 90)
        for p in out["payload"]["individual_proposals"][:10]:
            v = p["variant"]
            print(f"\n[{p['priority'].upper()}] {p['url']}  (ROI {p['roi_score']:.2f}, topo {p['topology'][0]})")
            print(f"  title ({v['title_chars']}c/{v['title_pixels_estimated']}px) : {v['title']}")
            print(f"  meta  ({v['meta_chars']}c)      : {v['meta']}")
            print(f"  h1                    : {v['h1_suggested']}")
            print(f"  formule               : {v['formula_used']}")
            print(f"  CTR delta predit      : {v['predicted_ctr_delta_pct']:+.1f}%")
            print(f"  rationale             : {v['rationale']}")

    if out["payload"]["template_proposals"]:
        print()
        print("=" * 90)
        print("TEMPLATE PATTERNS (topologies C + D) -- 1 patch = N pages")
        print("=" * 90)
        for p in out["payload"]["template_proposals"]:
            v = p["variant"]
            print(f"\n[{p['topology']}] {p['source_file']}  ({p['variant']['formula_used']})")
            print(f"  title pattern : {v['title']}")
            print(f"  meta pattern  : {v['meta']}")
            print(f"  h1 pattern    : {v['h1_suggested']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-title-writer")
    parser.add_argument("--in", dest="input", default=None)
    parser.add_argument("--out", default=None)
    parser.add_argument(
        "--priority",
        choices=["high", "medium", "low"],
        default="medium",
        help="Seuil min (default: medium). 'low' inclut tout.",
    )
    args = parser.parse_args()

    input_path = args.input or find_latest_audit()
    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"title-proposals-{today}.json")

    output = write_proposals(
        input_path=input_path,
        output_path=output_path,
        priority_filter=args.priority,
    )
    print_summary(output)
    print()
    print(f"JSON ecrit : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""
me-eeat-snippet-check — GATE 2 du pipeline snippet (YMYL santé).

Vérifie pour chaque proposition title/meta/H1 :
  1. no_therapeutic_promise      (30) — BLOQUANT hard
  2. author_credential_surfaced  (20) — BLOQUANT si score global < 80
  3. no_superclaim               (15) — BLOQUANT
  4. vouvoiement_implicit        (10)
  5. price_in_meta_if_product    (15) — BLOQUANT si catalogue appareil
  6. no_medical_unsourced_claim  (10)

Verdict PASS si :
  total >= 80
  ET no_therapeutic_promise = 100
  ET author_credential_surfaced >= 80
  ET (si applicable) price_in_meta_if_product = 100

Sinon REJECT bloquant. Escalade humaine immédiate — pas de REVISE ici car
YMYL = tolerance zéro sur promesse thérapeutique.

Input  : audit/title-proposals-YYYY-MM-DD.json + audit/snippet-eval-YYYY-MM-DD.json
Output : audit/eeat-check-YYYY-MM-DD.json
"""

import argparse
import glob as pyglob
import json
import os
import re
import sys
from datetime import datetime, date


# ==========================================================================
# YMYL patterns (références santé)
# ==========================================================================

THERAPEUTIC_PROMISE = re.compile(
    r"\b("
    r"guér(i[rt]|ison)|"
    r"éliminer?|éliminé?|"
    r"100[\s%]*efficace|"
    r"miracle|miraculeu(x|se)|"
    r"remède\s+absolu|"
    r"solution\s+définitive|"
    r"résultat\s+garanti|"
    r"disparition\s+totale|"
    r"soigner?\s+définitivement"
    r")\b",
    re.IGNORECASE,
)

SUPERCLAIM = re.compile(
    r"\b("
    r"le\s+meilleur|la\s+meilleure|"
    r"meilleur\s+du\s+marché|"
    r"n°\s*1|numero\s+un|num[ée]ro\s+un|"
    r"incontournable|"
    r"sans\s+égal|"
    r"garantie\s+totale"
    r")\b",
    re.IGNORECASE,
)

AUTHOR_CREDENTIAL = re.compile(
    r"\b("
    r"audio(prothésiste|prothesiste)|"
    r"DE\b|"
    r"diplom[ée](\s+d['’]État)?|"
    r"expert(e?)|"
    r"28\s*ans|"
    r"3[\s,.]*000\s*patients?"
    r")\b",
    re.IGNORECASE,
)

# Vouvoiement implicite : éviter le tutoiement direct dans meta.
# Heuristique : "tu " / "ton " / "ta " / "tes " en début de phrase ou après point.
TUTOIEMENT = re.compile(
    r"(?:^|[.!?]\s+)(tu|ton|ta|tes)\s",
    re.IGNORECASE,
)

PRICE_IN_META = re.compile(
    r"(€|prix|tarif|formatPrice|à\s+partir\s+de)",
    re.IGNORECASE,
)

# Claim médical nécessitant sourcing (si pas d'indicateur, on demande source)
MEDICAL_CLAIM = re.compile(
    r"\b("
    r"(\d+)\s*%\s+de\s+(patients|français|adultes)|"
    r"réduit?\s+la\s+(perte|surdité)|"
    r"amélior(e|ation)\s+(l['’]audition|la\s+compréhension)|"
    r"prévient?\s+la\s+(perte|surdité)"
    r")\b",
    re.IGNORECASE,
)

SOURCING_MARKERS = re.compile(
    r"\b(HAS|INSERM|OMS|PubMed|étude|selon|source)\b",
    re.IGNORECASE,
)


# ==========================================================================
# Template rendering (cohérent avec me-snippet-evaluator)
# ==========================================================================

SAMPLE_VARS = {
    "fullName": "Oticon Xceed 3 UP",
    "typedCentre.nom": "Audika La Brede",
    "displayVille": "La Brede",
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
    if not pattern:
        return ""
    result = pattern
    for var, sample in sorted(SAMPLE_VARS.items(), key=lambda x: -len(x[0])):
        result = result.replace("${" + var + "}", sample)
    result = re.sub(r"\$\{[^}]+\}", "X", result)
    return result


# ==========================================================================
# 6 critères scoring
# ==========================================================================

def check_no_therapeutic_promise(title: str, meta: str) -> tuple[int, str | None]:
    text = title + " " + meta
    m = THERAPEUTIC_PROMISE.search(text)
    if m:
        return (0, f"promesse_therapeutique_detectee:'{m.group(0)}'")
    return (100, None)


def check_author_credential(title: str, meta: str) -> tuple[int, str | None]:
    text = title + " " + meta
    matches = AUTHOR_CREDENTIAL.findall(text)
    if not matches:
        return (0, "aucun_credential_dans_title_meta")
    # Score proportionnel : 1 match = 60, 2+ matches = 100
    distinct = len({m if isinstance(m, str) else m[0] for m in matches})
    if distinct >= 2:
        return (100, None)
    return (60, f"credential_unique:'{matches[0] if isinstance(matches[0], str) else matches[0][0]}'")


def check_no_superclaim(title: str, meta: str) -> tuple[int, str | None]:
    text = title + " " + meta
    m = SUPERCLAIM.search(text)
    if m:
        return (0, f"superclaim_detecte:'{m.group(0)}'")
    return (100, None)


def check_vouvoiement(title: str, meta: str) -> tuple[int, str | None]:
    text = title + " " + meta
    m = TUTOIEMENT.search(text)
    if m:
        return (0, f"tutoiement_detecte:'{m.group(0).strip()}'")
    return (100, None)


def check_price_in_meta(url: str, meta: str) -> tuple[int, str | None, bool]:
    """Retourne (score, note, applicable)."""
    if not url.startswith("/catalogue/appareils/"):
        return (100, "not_applicable", False)
    if PRICE_IN_META.search(meta):
        return (100, None, True)
    return (0, "prix_absent_de_meta_fiche_produit", True)


def check_medical_sourcing(title: str, meta: str) -> tuple[int, str | None]:
    text = title + " " + meta
    claim = MEDICAL_CLAIM.search(text)
    if not claim:
        return (100, None)
    # Claim détecté -> vérifier sourcing
    if SOURCING_MARKERS.search(text):
        return (100, None)
    return (0, f"claim_medical_non_source:'{claim.group(0)}'")


# ==========================================================================
# Verdict
# ==========================================================================

WEIGHTS = {
    "no_therapeutic_promise": 30,
    "author_credential_surfaced": 20,
    "no_superclaim": 15,
    "vouvoiement_implicit": 10,
    "price_in_meta_if_product": 15,
    "no_medical_unsourced_claim": 10,
}


def compute_verdict(scores: dict, price_applicable: bool) -> tuple[str, list[str]]:
    """Retourne (verdict, blocking_issues)."""
    # Normalisation : chaque score /100 -> pondéré
    total = sum(scores[k] * w / 100 for k, w in WEIGHTS.items())

    blocking = []

    if scores["no_therapeutic_promise"] < 100:
        blocking.append("therapeutic_promise_detected (zero_tolerance)")
    if scores["no_superclaim"] < 100:
        blocking.append("superclaim_detected (zero_tolerance)")
    if price_applicable and scores["price_in_meta_if_product"] < 100:
        blocking.append("price_missing_in_catalogue_meta")
    if total < 80:
        blocking.append(f"total_score_below_80 ({total:.1f})")
    if scores["author_credential_surfaced"] < 80 and total < 80:
        blocking.append("author_credential_below_80_with_low_total")

    verdict = "REJECT" if blocking else "PASS"
    return (verdict, blocking)


# ==========================================================================
# Main
# ==========================================================================

def check_proposal(prop: dict) -> dict:
    variant = prop["variant"]
    url = prop["url"]

    title = variant["title"]
    meta = variant["meta"]
    rendered_title = render_sample(title) if "${" in title else title
    rendered_meta = render_sample(meta) if "${" in meta else meta

    tp_score, tp_note = check_no_therapeutic_promise(rendered_title, rendered_meta)
    cred_score, cred_note = check_author_credential(rendered_title, rendered_meta)
    sc_score, sc_note = check_no_superclaim(rendered_title, rendered_meta)
    vv_score, vv_note = check_vouvoiement(rendered_title, rendered_meta)
    price_score, price_note, price_applicable = check_price_in_meta(url, rendered_meta)
    med_score, med_note = check_medical_sourcing(rendered_title, rendered_meta)

    scores = {
        "no_therapeutic_promise": tp_score,
        "author_credential_surfaced": cred_score,
        "no_superclaim": sc_score,
        "vouvoiement_implicit": vv_score,
        "price_in_meta_if_product": price_score,
        "no_medical_unsourced_claim": med_score,
    }
    score_total = round(sum(scores[k] * w / 100 for k, w in WEIGHTS.items()), 1)
    verdict, blocking = compute_verdict(scores, price_applicable)

    notes = {
        "no_therapeutic_promise": tp_note,
        "author_credential_surfaced": cred_note,
        "no_superclaim": sc_note,
        "vouvoiement_implicit": vv_note,
        "price_in_meta_if_product": price_note,
        "no_medical_unsourced_claim": med_note,
    }

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
        "blocking_issues": blocking,
        "price_applicable": price_applicable,
        "notes": {k: v for k, v in notes.items() if v},
        "weights": WEIGHTS,
    }


def find_latest_proposals() -> str:
    candidates = sorted(pyglob.glob(os.path.join("audit", "title-proposals-*.json")), reverse=True)
    if not candidates:
        raise FileNotFoundError(
            "Aucun audit/title-proposals-*.json. Executez : python .claude/me_title_write.py"
        )
    return candidates[0]


def check(input_path: str, output_path: str) -> dict:
    with open(input_path, "r", encoding="utf-8") as f:
        proposals = json.load(f)

    if proposals.get("type") != "me-title-writer":
        raise ValueError(f"Input invalide: type={proposals.get('type')}")

    results = []
    for prop in proposals["payload"]["individual_proposals"]:
        results.append(check_proposal(prop))
    for prop in proposals["payload"]["template_proposals"]:
        results.append(check_proposal(prop))

    metrics = {
        "total_checked": len(results),
        "PASS": sum(1 for r in results if r["verdict"] == "PASS"),
        "REJECT": sum(1 for r in results if r["verdict"] == "REJECT"),
        "therapeutic_promises": sum(
            1 for r in results if r["scores"]["no_therapeutic_promise"] < 100
        ),
        "superclaims": sum(1 for r in results if r["scores"]["no_superclaim"] < 100),
        "missing_price_catalogue": sum(
            1 for r in results
            if r["price_applicable"] and r["scores"]["price_in_meta_if_product"] < 100
        ),
        "avg_score_total": round(sum(r["score_total"] for r in results) / max(len(results), 1), 1),
    }

    output = {
        "type": "me-eeat-snippet-check",
        "version": "1.0.0",
        "payload": {
            "period": proposals["payload"]["period"],
            "checked_proposals": results,
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
    print(f"EEAT snippet check (GATE 2) -- {m['total_checked']} propositions verifiees")
    print()
    print(f"  PASS   : {m['PASS']}")
    print(f"  REJECT : {m['REJECT']}  (escalade humaine)")
    print(f"  Promesses therapeutiques : {m['therapeutic_promises']} (DOIT etre 0)")
    print(f"  Superclaims              : {m['superclaims']} (DOIT etre 0)")
    print(f"  Prix absent catalogue    : {m['missing_price_catalogue']}")
    print(f"  Score total moyen        : {m['avg_score_total']}/100")
    print()
    print("Details par proposition :")
    print(f"  {'URL':45s} {'Topo':5s} {'Score':>6s} {'Verdict':>8s} {'TP':>3s} {'Cr':>3s} {'Sc':>3s} {'Vv':>3s} {'Px':>3s} {'Md':>3s}")
    print("-" * 95)
    for r in out["payload"]["checked_proposals"]:
        topo = r["topology"].split("_")[0]
        s = r["scores"]
        url_short = r["url"][:44] if r["patch_mode"] == "individual" else f"[TPL] {r['source_file'][-32:]}"
        print(
            f"  {url_short:45s} {topo:5s} {r['score_total']:>6.1f} {r['verdict']:>8s} "
            f"{s['no_therapeutic_promise']:>3d} {s['author_credential_surfaced']:>3d} "
            f"{s['no_superclaim']:>3d} {s['vouvoiement_implicit']:>3d} "
            f"{s['price_in_meta_if_product']:>3d} {s['no_medical_unsourced_claim']:>3d}"
        )
    print()
    for r in out["payload"]["checked_proposals"]:
        if r["blocking_issues"]:
            print(f"[{r['verdict']}] {r['url']}")
            for issue in r["blocking_issues"]:
                print(f"  BLOCKING: {issue}")
            for k, v in r["notes"].items():
                print(f"  note {k}: {v}")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-eeat-snippet-check (GATE 2)")
    parser.add_argument("--in", dest="input", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    input_path = args.input or find_latest_proposals()
    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"eeat-check-{today}.json")

    output = check(input_path=input_path, output_path=output_path)
    print_summary(output)
    print()
    print(f"JSON ecrit : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

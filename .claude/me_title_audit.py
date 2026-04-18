"""
me-title-auditor — audit titles/metas actuels vs requêtes GSC.

Pour chaque page du JSON me-query-mapper :
1. Résout URL -> fichier source selon topologie (A / B / C / D)
2. Lit le title, meta description, H1 actuels
3. Calcule un Mismatch Score /100 sur 7 critères
4. Calcule un ROI strike-zone
5. Priorise (high / medium / low)

Input  : audit/gsc-mapped-YYYY-MM-DD.json
Output : audit/title-audit-YYYY-MM-DD.json
"""

import argparse
import glob as pyglob
import json
import os
import re
import sys
from datetime import datetime, date

import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)  # leguideauditif/


# ==========================================================================
# Topology resolvers : URL -> file path + SEO extraction
# ==========================================================================

def resolve_source_file(url: str, topology: str) -> tuple[str, str]:
    """Return (file_path, resolution_note)."""
    if topology == "A_mdx_frontmatter":
        return _resolve_mdx(url)
    if topology == "B_static_props":
        return _resolve_static(url)
    if topology == "C_template_dynamic":
        return _resolve_template(url)
    if topology == "D_template_db":
        return _resolve_template_db(url)
    return ("", f"unknown_topology={topology}")


def _resolve_mdx(url: str) -> tuple[str, str]:
    """`/guides/<slug>/` -> src/content/guides/<slug>.mdx (glob si sous-dossier)."""
    parts = [p for p in url.strip("/").split("/") if p]
    if len(parts) < 2:
        return ("", "path_too_short")
    collection = parts[0]
    slug = parts[-1]
    candidates = pyglob.glob(
        os.path.join(REPO_ROOT, "src", "content", collection, "**", f"{slug}.mdx"),
        recursive=True,
    ) + pyglob.glob(
        os.path.join(REPO_ROOT, "src", "content", collection, f"{slug}.mdx"),
    )
    if not candidates:
        return ("", f"mdx_not_found:{slug}")
    rel = os.path.relpath(candidates[0], REPO_ROOT).replace("\\", "/")
    return (rel, "ok")


def _resolve_static(url: str) -> tuple[str, str]:
    """Page statique : .astro direct dans src/pages/."""
    parts = [p for p in url.strip("/").split("/") if p]
    if not parts:
        candidate = os.path.join(REPO_ROOT, "src", "pages", "index.astro")
    else:
        # Try <parts>/index.astro then <parts>.astro
        candidates = [
            os.path.join(REPO_ROOT, "src", "pages", *parts, "index.astro"),
            os.path.join(REPO_ROOT, "src", "pages", *parts[:-1], f"{parts[-1]}.astro"),
        ]
        candidate = next((c for c in candidates if os.path.exists(c)), candidates[0])
    if not os.path.exists(candidate):
        return ("", f"static_not_found:{url}")
    rel = os.path.relpath(candidate, REPO_ROOT).replace("\\", "/")
    return (rel, "ok")


def _resolve_template(url: str) -> tuple[str, str]:
    """Template dynamique : src/pages/<route>/[slug].astro ou [...slug].astro."""
    parts = [p for p in url.strip("/").split("/") if p]
    if not parts:
        return ("", "path_too_short")

    # Essayer depuis le chemin le plus long vers le plus court
    for cut in range(len(parts), 0, -1):
        route = parts[:cut]
        for pattern in ("[slug].astro", "[...slug].astro", "[ville].astro", "[...vs].astro", "[dep].astro"):
            candidate = os.path.join(REPO_ROOT, "src", "pages", *route, pattern)
            if os.path.exists(candidate):
                rel = os.path.relpath(candidate, REPO_ROOT).replace("\\", "/")
                return (rel, f"ok:dynamic_template[{pattern}]")
    return ("", f"template_not_found:{url}")


def _resolve_template_db(url: str) -> tuple[str, str]:
    """Même logique que _resolve_template — la distinction DB est sémantique."""
    return _resolve_template(url)


# ==========================================================================
# Current SEO extraction
# ==========================================================================

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
ASTRO_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---", re.DOTALL)
BASELAYOUT_TITLE_RE = re.compile(r'<BaseLayout[^>]*?title=(?:\{([^}]+)\}|"([^"]+)")', re.DOTALL)
BASELAYOUT_DESC_RE = re.compile(r'<BaseLayout[^>]*?description=(?:\{([^}]+)\}|"([^"]+)")', re.DOTALL)
CONST_TITLE_RE = re.compile(r"const\s+(?:pageTitle|title|seoTitle)\s*=\s*(?:`([^`]+)`|\"([^\"]+)\"|'([^']+)')")
CONST_DESC_RE = re.compile(r"const\s+(?:description|metaDescription|seoDescription)\s*=\s*(?:`([^`]+)`|\"([^\"]+)\"|'([^']+)')")
H1_ASTRO_RE = re.compile(r"<h1[^>]*>([^<{]+?)</h1>", re.DOTALL)


def read_current_seo(file_path: str, topology: str) -> dict:
    """Retourne {title, meta, h1, h1_source} + indicateurs."""
    abs_path = os.path.join(REPO_ROOT, file_path) if file_path else ""
    if not abs_path or not os.path.exists(abs_path):
        return {"title": None, "meta": None, "h1": None, "error": f"file_not_found:{file_path}"}

    with open(abs_path, "r", encoding="utf-8") as f:
        content = f.read()

    if topology == "A_mdx_frontmatter":
        return _read_mdx(content)
    # B, C, D : Astro file
    return _read_astro(content, topology)


def _read_mdx(content: str) -> dict:
    m = FRONTMATTER_RE.match(content)
    if not m:
        return {"title": None, "meta": None, "h1": None, "error": "no_frontmatter"}
    try:
        fm = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        return {"title": None, "meta": None, "h1": None, "error": f"yaml_error:{e}"}

    title_value = fm.get("metaTitle") or fm.get("title")
    meta_value = fm.get("metaDescription")
    h1_value = fm.get("title")  # H1 rendu par le layout = frontmatter.title

    return {
        "title": title_value,
        "meta": meta_value,
        "h1": h1_value,
        "h1_source": "frontmatter.title",
        "frontmatter_has_metaTitle": "metaTitle" in fm,
        "frontmatter_has_metaDescription": "metaDescription" in fm,
    }


def _read_astro(content: str, topology: str) -> dict:
    """Pour B/C/D : cherche props BaseLayout OU const title/description."""
    # Priorité : const (template dynamique), sinon props literales
    title = None
    meta = None
    source_title = "unknown"
    source_meta = "unknown"

    # Props BaseLayout inline (strings litérales)
    m_title_prop = BASELAYOUT_TITLE_RE.search(content)
    if m_title_prop:
        # Groupe 1 = expression {...}, groupe 2 = string "..."
        if m_title_prop.group(2):
            title = m_title_prop.group(2)
            source_title = "baselayout_string_literal"
        else:
            source_title = f"baselayout_expression:{m_title_prop.group(1).strip()}"

    m_desc_prop = BASELAYOUT_DESC_RE.search(content)
    if m_desc_prop:
        if m_desc_prop.group(2):
            meta = m_desc_prop.group(2)
            source_meta = "baselayout_string_literal"
        else:
            source_meta = f"baselayout_expression:{m_desc_prop.group(1).strip()}"

    # Si expression -> résoudre via const title/description dans le frontmatter Astro
    if title is None or source_title.startswith("baselayout_expression"):
        m_const_title = CONST_TITLE_RE.search(content)
        if m_const_title:
            title = m_const_title.group(1) or m_const_title.group(2) or m_const_title.group(3)
            source_title = "const_title"

    if meta is None or source_meta.startswith("baselayout_expression"):
        m_const_desc = CONST_DESC_RE.search(content)
        if m_const_desc:
            meta = m_const_desc.group(1) or m_const_desc.group(2) or m_const_desc.group(3)
            source_meta = "const_description"

    # H1 dans le template Astro (si présent en dur)
    m_h1 = H1_ASTRO_RE.search(content)
    h1 = m_h1.group(1).strip() if m_h1 else None

    return {
        "title": title,
        "meta": meta,
        "h1": h1,
        "h1_source": "astro_template" if h1 else None,
        "source_title": source_title,
        "source_meta": source_meta,
        "is_template_pattern": topology in ("C_template_dynamic", "D_template_db"),
    }


# ==========================================================================
# Mismatch Score /100
# ==========================================================================

CREDIBILITY_PATTERNS = re.compile(
    r"\b(audio(prothesiste|prothésiste)|DE|28\s*ans|expert|diplomé\s+d['’]État|diplômé\s+d['’]État)\b",
    re.IGNORECASE,
)

PARASITIC_SUFFIXES = [
    "— LGA",
    "- LGA",
    "— LeGuideAuditif.fr",
    "— LeGuideAuditif",
    "| LGA",
]

PRICE_PATTERN = re.compile(r"(\d{2,5}\s*€|€\s*\d{2,5}|\bprix\b|\btarif\b)", re.IGNORECASE)


def _tokenize(text: str) -> set[str]:
    """Tokens minuscules, accents préservés, stop-words supprimés."""
    stop = {
        "le", "la", "les", "un", "une", "de", "des", "du", "à", "a", "au", "aux",
        "et", "ou", "en", "dans", "par", "pour", "sur", "avec", "sans", "qui",
        "que", "quoi", "comment", "est", "sont",
    }
    tokens = re.findall(r"[\w\-]+", text.lower())
    return {t for t in tokens if t not in stop and len(t) > 1}


def _query_in_text(query: str, text: str) -> bool:
    if not text or not query:
        return False
    q_tokens = _tokenize(query)
    t_tokens = _tokenize(text)
    if not q_tokens:
        return False
    # 75% des tokens de la query doivent être dans le texte
    overlap = len(q_tokens & t_tokens)
    return overlap / len(q_tokens) >= 0.75


def compute_mismatch(seo: dict, queries: list[dict], url: str) -> dict:
    """Mismatch /100 sur 7 critères. Retourne score + reasons."""
    title = seo.get("title") or ""
    meta = seo.get("meta") or ""
    reasons = []
    score = 0

    # Préparer les queries triées par impressions
    sorted_queries = sorted(queries, key=lambda q: q["impr"], reverse=True)
    primary_query = sorted_queries[0]["q"] if sorted_queries else None
    secondary_queries = sorted_queries[1:3]
    long_tail_queries = [q for q in sorted_queries if q["bucket"] == "long_tail" and q["impr"] >= 2]

    # 1. Requête primaire absente du title (30)
    if primary_query and not _query_in_text(primary_query, title):
        score += 30
        reasons.append({
            "code": "primary_query_absent",
            "weight": 30,
            "detail": f"requete primaire '{primary_query}' absente du title",
        })

    # 2. Crédibilité DE absente (15)
    if not CREDIBILITY_PATTERNS.search(title) and not CREDIBILITY_PATTERNS.search(meta):
        score += 15
        reasons.append({
            "code": "credibility_DE_absent",
            "weight": 15,
            "detail": "ni 'audioprothesiste/DE/28 ans/expert' dans title OU meta",
        })

    # 3. Suffixe parasite (10)
    suffix_found = next((s for s in PARASITIC_SUFFIXES if s in title), None)
    if suffix_found:
        score += 10
        reasons.append({
            "code": "suffix_parasitic",
            "weight": 10,
            "detail": f"suffixe '{suffix_found}' gaspille {len(suffix_found) + 1} chars",
        })

    # 4. Prix manquant sur fiche produit (20)
    is_catalogue_product = url.startswith("/catalogue/appareils/")
    if is_catalogue_product and not PRICE_PATTERN.search(meta):
        score += 20
        reasons.append({
            "code": "price_missing_in_meta",
            "weight": 20,
            "detail": "fiche produit sans prix/€ dans meta description",
        })

    # 5. Long-tail ignoré (15)
    ignored_long_tails = [
        q["q"] for q in long_tail_queries
        if not _query_in_text(q["q"], title) and not _query_in_text(q["q"], meta)
    ]
    if ignored_long_tails:
        score += 15
        reasons.append({
            "code": "long_tail_ignored",
            "weight": 15,
            "detail": f"{len(ignored_long_tails)} long-tails absents: " + ", ".join(ignored_long_tails[:3]),
        })

    # 6. Title > 60 chars (5)
    if len(title) > 60:
        score += 5
        reasons.append({
            "code": "title_too_long",
            "weight": 5,
            "detail": f"title {len(title)} chars > 60 (risque troncature SERP)",
        })

    # 7. Meta > 155 chars (5)
    if len(meta) > 155:
        score += 5
        reasons.append({
            "code": "meta_too_long",
            "weight": 5,
            "detail": f"meta {len(meta)} chars > 155 (risque troncature SERP)",
        })

    return {
        "score": score,
        "max_score": 100,
        "reasons": reasons,
        "primary_query": primary_query,
        "secondary_queries": [q["q"] for q in secondary_queries],
        "long_tail_ignored_count": len(ignored_long_tails),
    }


# ==========================================================================
# ROI strike-zone
# ==========================================================================

def compute_roi(impr: int, pos: float) -> dict:
    """ROI = impr * (1/pos) * strike_zone_factor."""
    if pos <= 3:
        factor = 0.3
        zone = "top_1_3_limited_margin"
    elif pos <= 10:
        factor = 1.0
        zone = "sweet_spot_4_10"
    elif pos <= 20:
        factor = 1.5
        zone = "strike_zone_11_20"
    else:
        factor = 0.4
        zone = "deep_21plus_fix_content_first"

    roi = impr * (1.0 / max(pos, 1)) * factor
    return {
        "score": round(roi, 3),
        "impressions": impr,
        "avg_position": pos,
        "strike_zone_factor": factor,
        "strike_zone": zone,
    }


def priority_from_roi(roi_score: float) -> str:
    if roi_score >= 1.0:
        return "high"
    if roi_score >= 0.3:
        return "medium"
    return "low"


# ==========================================================================
# Main
# ==========================================================================

def find_latest_mapped() -> str:
    candidates = sorted(pyglob.glob(os.path.join("audit", "gsc-mapped-*.json")), reverse=True)
    if not candidates:
        raise FileNotFoundError(
            "Aucun fichier audit/gsc-mapped-*.json. "
            "Exécute d'abord : python .claude/me_query_map.py"
        )
    return candidates[0]


def audit(input_path: str, output_path: str) -> dict:
    with open(input_path, "r", encoding="utf-8") as f:
        mapped = json.load(f)

    if mapped.get("type") != "me-query-mapper":
        raise ValueError(f"Input invalide: type={mapped.get('type')}")

    audited_pages = []
    for page in mapped["payload"]["pages"]:
        url = page["url"]
        topology = page["topology"]

        file_path, resolution_note = resolve_source_file(url, topology)
        current_seo = read_current_seo(file_path, topology)
        mismatch = compute_mismatch(current_seo, page["mapped_queries"], url)
        roi = compute_roi(page["gsc"]["impressions"], page["gsc"]["avg_position"])

        audited_pages.append({
            "url": url,
            "topology": topology,
            "source_file": file_path,
            "source_resolution": resolution_note,
            "gsc": page["gsc"],
            "mapped_queries": page["mapped_queries"],
            "current": {
                "title": current_seo.get("title"),
                "meta": current_seo.get("meta"),
                "h1": current_seo.get("h1"),
                "title_chars": len(current_seo.get("title") or ""),
                "meta_chars": len(current_seo.get("meta") or ""),
                "extraction_meta": {
                    k: v for k, v in current_seo.items()
                    if k not in ("title", "meta", "h1")
                },
            },
            "mismatch": mismatch,
            "roi": roi,
            "priority": priority_from_roi(roi["score"]),
        })

    # Tri par ROI desc
    audited_pages.sort(key=lambda p: p["roi"]["score"], reverse=True)

    output = {
        "type": "me-title-auditor",
        "version": "1.0.0",
        "payload": {
            "period": mapped["payload"]["period"],
            "pages": audited_pages,
            "audit_metrics": {
                "total_pages_audited": len(audited_pages),
                "pages_with_mismatch_high": sum(1 for p in audited_pages if p["mismatch"]["score"] >= 50),
                "pages_priority_high": sum(1 for p in audited_pages if p["priority"] == "high"),
                "pages_priority_medium": sum(1 for p in audited_pages if p["priority"] == "medium"),
                "pages_priority_low": sum(1 for p in audited_pages if p["priority"] == "low"),
                "source_file_resolution_errors": sum(1 for p in audited_pages if not p["source_file"]),
            },
        },
        "upstream": {
            "type": "me-query-mapper",
            "input_path": input_path,
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    return output


def print_summary(out: dict) -> None:
    m = out["payload"]["audit_metrics"]
    pages = out["payload"]["pages"]
    print(f"Title audit termine -- {m['total_pages_audited']} pages")
    print()
    print(f"  Mismatch score >= 50     : {m['pages_with_mismatch_high']}")
    print(f"  Priorite HIGH (ROI>=1.0) : {m['pages_priority_high']}")
    print(f"  Priorite MEDIUM          : {m['pages_priority_medium']}")
    print(f"  Priorite LOW             : {m['pages_priority_low']}")
    print(f"  Fichiers source NON resolus : {m['source_file_resolution_errors']}")
    print()
    print("Top 10 pages par ROI :")
    print(f"  {'URL':45s} {'Topo':5s} {'Impr':>5s} {'Pos':>5s} {'Mism':>4s} {'ROI':>6s} {'Prio':>6s}")
    print("-" * 95)
    for pg in pages[:10]:
        topo = pg["topology"].split("_")[0]
        g = pg["gsc"]
        print(
            f"  {pg['url'][:44]:45s} {topo:5s} {g['impressions']:>5d} "
            f"{g['avg_position']:>5.1f} {pg['mismatch']['score']:>4d} "
            f"{pg['roi']['score']:>6.2f} {pg['priority']:>6s}"
        )
    print()
    print("Top 3 avec details mismatch :")
    for i, pg in enumerate(pages[:3], 1):
        print(f"\n[{i}] {pg['url']}  ({pg['priority']}, ROI={pg['roi']['score']:.2f})")
        cur = pg["current"]
        print(f"    title actuel  : {cur['title']!r} ({cur['title_chars']} chars)")
        print(f"    meta actuelle : {cur['meta']!r} ({cur['meta_chars']} chars)")
        print(f"    mismatch      : {pg['mismatch']['score']}/100")
        for r in pg["mismatch"]["reasons"][:3]:
            print(f"      - [{r['code']}] {r['detail']}")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-title-auditor")
    parser.add_argument("--in", dest="input", default=None)
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    input_path = args.input or find_latest_mapped()
    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"title-audit-{today}.json")

    output = audit(input_path=input_path, output_path=output_path)
    print_summary(output)
    print()
    print(f"JSON ecrit : {output_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

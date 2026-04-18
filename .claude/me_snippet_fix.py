"""
me-snippet-fixer — applique les patches title/meta validés par les 2 gates.

Ne patche QUE les propositions qui ont PASSÉ GATE 1 et GATE 2.
Mode `--dry-run` (DÉFAUT) : affiche le diff, n'écrit rien.
Mode `--apply` : écrit les patches + snapshot pré-patch pour rollback.

Topologies gérées :
  A_mdx_frontmatter   : patch frontmatter YAML (metaTitle, metaDescription)
  B_static_props      : patch props <BaseLayout title="..." description="...">
  C_template_dynamic  : patch const pageTitle/title/description dans .astro
  D_template_db       : idem C

Overrides catalogue appareils : DEFERRED V2 (extension schéma Zod requise).
Overrides centres (Supabase) : DEFERRED V2 (migration DB requise).

Input  : audit/snippet-eval-*.json + audit/eeat-check-*.json + audit/title-proposals-*.json
Output : audit/snippet-patches-YYYY-MM-DD.json + .snapshot.json
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
REPO_ROOT = os.path.dirname(SCRIPT_DIR)


def find_latest(pattern: str) -> str:
    candidates = sorted(pyglob.glob(os.path.join("audit", pattern)), reverse=True)
    if not candidates:
        raise FileNotFoundError(f"Aucun fichier {pattern} dans audit/")
    return candidates[0]


def load_gates_and_proposals() -> tuple[dict, dict, dict]:
    with open(find_latest("snippet-eval-*.json"), "r", encoding="utf-8") as f:
        gate1 = json.load(f)
    with open(find_latest("eeat-check-*.json"), "r", encoding="utf-8") as f:
        gate2 = json.load(f)
    with open(find_latest("title-proposals-*.json"), "r", encoding="utf-8") as f:
        proposals = json.load(f)
    return (gate1, gate2, proposals)


def build_patchable_set(gate1: dict, gate2: dict, proposals: dict) -> list[dict]:
    g1_by = {(e["url"], e["patch_mode"]): e for e in gate1["payload"]["evaluated_proposals"]}
    g2_by = {(e["url"], e["patch_mode"]): e for e in gate2["payload"]["checked_proposals"]}

    all_props = (
        proposals["payload"]["individual_proposals"]
        + proposals["payload"]["template_proposals"]
    )

    patchable = []
    for prop in all_props:
        key = (prop["url"], prop["patch_mode"])
        g1, g2 = g1_by.get(key), g2_by.get(key)
        if g1 is None or g2 is None:
            continue
        if g1["verdict"] == "PASS" and g2["verdict"] == "PASS":
            patchable.append({**prop, "gate1_score": g1["score_total"], "gate2_score": g2["score_total"]})
    return patchable


# --- Regex patchers ---

FRONTMATTER_RE = re.compile(r"^(---\s*\n)(.*?)(\n---\s*\n)", re.DOTALL)
BASELAYOUT_TITLE_RE = re.compile(r'(<BaseLayout[^>]*?)title=(?:\{[^}]+\}|"[^"]+")', re.DOTALL)
BASELAYOUT_DESC_RE = re.compile(r'(<BaseLayout[^>]*?)description=(?:\{[^}]+\}|"[^"]+")', re.DOTALL)
CONST_PAGETITLE_RE = re.compile(r"(const\s+(?:pageTitle|title|seoTitle)\s*=\s*)(?:`[^`]+`|\"[^\"]+\"|'[^']+')")
CONST_DESC_RE = re.compile(r"(const\s+(?:description|metaDescription|seoDescription)\s*=\s*)(?:`[^`]+`|\"[^\"]+\"|'[^']+')")


def _escape_yaml_double(value: str) -> str:
    """Escape pour une string YAML entre double quotes."""
    return value.replace("\\", "\\\\").replace('"', '\\"')


def patch_mdx_frontmatter(file_path: str, title: str, meta: str) -> tuple[str, str]:
    """Patch chirurgical : met a jour metaTitle et metaDescription ligne par ligne.

    Preserve ordre des champs, commentaires, formatage. Ajoute metaTitle
    apres title si absent. Ne touche PAS au champ `title:` (= H1 du site)."""
    with open(os.path.join(REPO_ROOT, file_path), "r", encoding="utf-8") as f:
        content = f.read()
    m = FRONTMATTER_RE.match(content)
    if not m:
        raise ValueError(f"Pas de frontmatter dans {file_path}")
    fm_body = m.group(2)
    lines = fm_body.split("\n")

    title_escaped = _escape_yaml_double(title)
    meta_escaped = _escape_yaml_double(meta)
    new_title_line = f'metaTitle: "{title_escaped}"'
    new_meta_line = f'metaDescription: "{meta_escaped}"'

    meta_title_re = re.compile(r"^metaTitle\s*:")
    meta_desc_re = re.compile(r"^metaDescription\s*:")
    title_re = re.compile(r"^title\s*:")

    has_meta_title = any(meta_title_re.match(ln) for ln in lines)
    has_meta_desc = any(meta_desc_re.match(ln) for ln in lines)

    new_lines = []
    title_line_idx = None
    for idx, ln in enumerate(lines):
        if title_re.match(ln) and title_line_idx is None:
            title_line_idx = idx
            new_lines.append(ln)
            if not has_meta_title:
                new_lines.append(new_title_line)
        elif meta_title_re.match(ln):
            new_lines.append(new_title_line)
        elif meta_desc_re.match(ln):
            new_lines.append(new_meta_line)
        else:
            new_lines.append(ln)

    if not has_meta_desc:
        # Inserer metaDescription apres metaTitle (ou apres title si metaTitle vient
        # d'etre insere). Retrouver l'index du metaTitle insere.
        for idx, ln in enumerate(new_lines):
            if meta_title_re.match(ln):
                new_lines.insert(idx + 1, new_meta_line)
                break

    new_fm_body = "\n".join(new_lines)
    new_content = m.group(1) + new_fm_body + m.group(3) + content[m.end():]
    return (content, new_content)


def patch_astro_props(file_path: str, title: str, meta: str) -> tuple[str, str]:
    with open(os.path.join(REPO_ROOT, file_path), "r", encoding="utf-8") as f:
        content = f.read()
    t_esc = title.replace('"', '\\"')
    m_esc = meta.replace('"', '\\"')
    new_content = content
    if BASELAYOUT_TITLE_RE.search(new_content):
        new_content = BASELAYOUT_TITLE_RE.sub(lambda m: f'{m.group(1)}title="{t_esc}"', new_content, count=1)
    else:
        raise ValueError(f"Pas de <BaseLayout title=...> dans {file_path}")
    if BASELAYOUT_DESC_RE.search(new_content):
        new_content = BASELAYOUT_DESC_RE.sub(lambda m: f'{m.group(1)}description="{m_esc}"', new_content, count=1)
    elif CONST_DESC_RE.search(new_content):
        new_content = CONST_DESC_RE.sub(lambda m: f'{m.group(1)}"{m_esc}"', new_content, count=1)
    else:
        raise ValueError(f"Pas de description patchable dans {file_path}")
    return (content, new_content)


def patch_astro_template(file_path: str, title_pattern: str, meta_pattern: str) -> tuple[str, str]:
    with open(os.path.join(REPO_ROOT, file_path), "r", encoding="utf-8") as f:
        content = f.read()
    new_content = content
    if CONST_PAGETITLE_RE.search(new_content):
        new_content = CONST_PAGETITLE_RE.sub(lambda m: f"{m.group(1)}`{title_pattern}`", new_content, count=1)
    else:
        raise ValueError(f"Pas de const pageTitle/title dans {file_path}")
    if CONST_DESC_RE.search(new_content):
        new_content = CONST_DESC_RE.sub(lambda m: f"{m.group(1)}`{meta_pattern}`", new_content, count=1)
    if new_content == content:
        raise ValueError(f"Aucun patch applique sur {file_path}")
    return (content, new_content)


def compute_diff_summary(before: str, after: str) -> dict:
    """Diff precis via difflib (gere les insertions/suppressions sans faux positifs)."""
    import difflib
    b, a = before.split("\n"), after.split("\n")
    diff = list(difflib.unified_diff(b, a, lineterm="", n=0))
    removed, added = [], []
    for line in diff:
        if line.startswith("---") or line.startswith("+++") or line.startswith("@@"):
            continue
        if line.startswith("-") and len(removed) < 5:
            removed.append(line[1:])
        elif line.startswith("+") and len(added) < 5:
            added.append(line[1:])
    lines_changed = sum(
        1 for line in diff
        if (line.startswith("+") or line.startswith("-"))
        and not line.startswith("+++")
        and not line.startswith("---")
    )
    return {
        "lines_before": len(b),
        "lines_after": len(a),
        "lines_changed": lines_changed,
        "sample_removed": removed,
        "sample_added": added,
    }


def patch_proposal(prop: dict, apply: bool) -> dict:
    topology = prop["topology"]
    file_path = prop["source_file"]
    variant = prop["variant"]
    title, meta = variant["title"], variant["meta"]

    try:
        if topology == "A_mdx_frontmatter":
            before, after = patch_mdx_frontmatter(file_path, title, meta)
            patcher = "patch_mdx_frontmatter"
        elif topology == "B_static_props":
            before, after = patch_astro_props(file_path, title, meta)
            patcher = "patch_astro_props"
        elif topology in ("C_template_dynamic", "D_template_db"):
            before, after = patch_astro_template(file_path, title, meta)
            patcher = "patch_astro_template"
        else:
            return {"url": prop["url"], "status": "SKIPPED", "reason": f"topology:{topology}"}
    except Exception as e:
        return {
            "url": prop["url"],
            "source_file": file_path,
            "topology": topology,
            "status": "FAILED",
            "reason": str(e),
        }

    result = {
        "url": prop["url"],
        "topology": topology,
        "source_file": file_path,
        "patch_mode": prop["patch_mode"],
        "patcher": patcher,
        "gate1_score": prop["gate1_score"],
        "gate2_score": prop["gate2_score"],
        "title_applied": title,
        "meta_applied": meta,
        "content_before": before,
        "diff_summary": compute_diff_summary(before, after),
        "status": "APPLIED" if apply else "DRY_RUN",
    }

    if apply:
        with open(os.path.join(REPO_ROOT, file_path), "w", encoding="utf-8") as f:
            f.write(after)

    return result


def run_fixer(apply: bool, output_path: str) -> dict:
    gate1, gate2, proposals = load_gates_and_proposals()
    patchable = build_patchable_set(gate1, gate2, proposals)

    seen_files = set()
    deduped = []
    for prop in patchable:
        if prop["source_file"] in seen_files:
            continue
        seen_files.add(prop["source_file"])
        deduped.append(prop)

    results = [patch_proposal(p, apply) for p in deduped]

    manifest = {
        "type": "me-snippet-fixer",
        "version": "1.0.0",
        "payload": {
            "mode": "apply" if apply else "dry_run",
            "total_patchable": len(patchable),
            "total_deduplicated": len(deduped),
            "results": results,
            "metrics": {
                "APPLIED": sum(1 for r in results if r["status"] == "APPLIED"),
                "DRY_RUN": sum(1 for r in results if r["status"] == "DRY_RUN"),
                "FAILED": sum(1 for r in results if r["status"] == "FAILED"),
                "SKIPPED": sum(1 for r in results if r["status"] == "SKIPPED"),
            },
            "deferred_v2": {
                "catalogue_individual_overrides": [
                    ov for ov in proposals["payload"].get("individual_overrides_for_templates", [])
                    if "catalogueAppareils" in ov.get("store", "")
                ],
                "centres_supabase_overrides": [
                    ov for ov in proposals["payload"].get("individual_overrides_for_templates", [])
                    if "centres_seo_overrides" in ov.get("store", "")
                ],
            },
        },
        "upstream": {
            "gate1": gate1.get("type"),
            "gate2": gate2.get("type"),
            "proposals": proposals.get("type"),
        },
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    # Manifest allégé (sans content_before)
    manifest_lite = json.loads(json.dumps(manifest))
    for r in manifest_lite["payload"]["results"]:
        r.pop("content_before", None)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(manifest_lite, f, ensure_ascii=False, indent=2)

    # Snapshot pour rollback
    snapshot_path = output_path.replace(".json", ".snapshot.json")
    snapshot = {
        "generated_at": manifest["generated_at"],
        "files": [
            {"source_file": r["source_file"], "content_before": r.get("content_before", "")}
            for r in results if r.get("content_before")
        ],
    }
    with open(snapshot_path, "w", encoding="utf-8") as f:
        json.dump(snapshot, f, ensure_ascii=False, indent=2)

    return manifest


def print_summary(manifest: dict) -> None:
    m = manifest["payload"]["metrics"]
    mode = manifest["payload"]["mode"]
    print(f"Snippet fixer -- mode={mode}")
    print()
    print(f"  Patchable (post-gates)   : {manifest['payload']['total_patchable']}")
    print(f"  Deduplicated unique file : {manifest['payload']['total_deduplicated']}")
    print(f"  APPLIED : {m['APPLIED']}")
    print(f"  DRY_RUN : {m['DRY_RUN']}")
    print(f"  FAILED  : {m['FAILED']}")
    print(f"  SKIPPED : {m['SKIPPED']}")
    print()
    print(f"  {'Status':8s} {'Topo':5s} {'Source':55s} {'Diff':>5s}")
    print("-" * 80)
    for r in manifest["payload"]["results"]:
        topo = r.get("topology", "?").split("_")[0]
        src = r.get("source_file", "?")[:54]
        diff = r.get("diff_summary", {}).get("lines_changed", 0)
        print(f"  {r['status']:8s} {topo:5s} {src:55s} {diff:>5d}")
        if r["status"] == "FAILED":
            print(f"    -> {r.get('reason', '')}")
    print()

    for r in manifest["payload"]["results"]:
        if r["status"] in ("DRY_RUN", "APPLIED"):
            print(f"=== SAMPLE DIFF: {r['source_file']} ===")
            print(f"  title -> {r['title_applied']}")
            print(f"  meta  -> {r['meta_applied']}")
            ds = r.get("diff_summary", {})
            for line in ds.get("sample_removed", [])[:3]:
                print(f"  - {line[:90]}")
            for line in ds.get("sample_added", [])[:3]:
                print(f"  + {line[:90]}")
            print()
            break

    deferred = manifest["payload"].get("deferred_v2", {})
    if deferred.get("catalogue_individual_overrides"):
        n = len(deferred["catalogue_individual_overrides"])
        print(f"[DEFERRED V2] {n} overrides catalogue (extension schema Zod requise)")
    if deferred.get("centres_supabase_overrides"):
        n = len(deferred["centres_supabase_overrides"])
        print(f"[DEFERRED V2] {n} overrides centres (table Supabase requise)")


def main() -> int:
    parser = argparse.ArgumentParser(description="me-snippet-fixer")
    parser.add_argument("--apply", action="store_true", help="Ecrit les patches. Defaut: dry-run.")
    parser.add_argument("--out", default=None)
    args = parser.parse_args()

    today = date.today().isoformat()
    output_path = args.out or os.path.join("audit", f"snippet-patches-{today}.json")

    manifest = run_fixer(apply=args.apply, output_path=output_path)
    print_summary(manifest)
    print()
    print(f"Manifest ecrit : {output_path}")
    print(f"Snapshot ecrit : {output_path.replace('.json', '.snapshot.json')}")
    if not args.apply:
        print()
        print("--- DRY RUN: aucun fichier modifie ---")
        print("Pour appliquer : python .claude/me_snippet_fix.py --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())

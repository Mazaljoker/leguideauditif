#!/usr/bin/env python3
"""
LeGuideAuditif — Automated Image Generation via Gemini Imagen API

Scans content directories for articles missing images,
generates prompts based on article frontmatter, and calls
Gemini Imagen 4 to produce hero + OG images.

Usage:
    python scripts/generate-images.py                    # scan & generate all missing
    python scripts/generate-images.py --slug mon-article # generate for specific article
    python scripts/generate-images.py --dry-run          # show what would be generated
    python scripts/generate-images.py --model imagen-4.0-generate-001  # specific model

Requires:
    pip install google-genai Pillow pyyaml
    GEMINI_API_KEY environment variable
"""

import argparse
import json
import logging
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Optional imports with graceful fallback
try:
    import yaml
except ImportError:
    print("ERROR: pyyaml required. Run: pip install pyyaml")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai required. Run: pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
    import io
except ImportError:
    print("ERROR: Pillow required. Run: pip install Pillow")
    sys.exit(1)


# ─── Config ────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIRS = [
    PROJECT_ROOT / "src" / "content" / "guides",
    PROJECT_ROOT / "src" / "content" / "comparatifs",
]
IMAGE_OUTPUT_DIR = PROJECT_ROOT / "public" / "images" / "blog"

# LeGuideAuditif Palette — Chaleureux Senior
PALETTE = {
    "marine": "#1B2E4A",
    "marine_light": "#2A4570",
    "creme": "#F8F5F0",
    "orange": "#D97B3D",
    "blanc": "#FFFFFF",
}

# Image specs
HERO_ASPECT_RATIO = "16:9"
OG_WIDTH = 1200
OG_HEIGHT = 630
WEBP_QUALITY = 90
MAX_HERO_SIZE_KB = 200
MAX_OG_SIZE_KB = 150

# Default model
DEFAULT_MODEL = "imagen-4.0-generate-001"  # Imagen 4 Fast: $0.02/image

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("lga-imagegen")


# ─── Scene Library (LeGuideAuditif-specific) ───────────────────────────────

SCENE_LIBRARY: dict[str, dict[str, str]] = {
    "perte-auditive": {
        "hero": (
            "Photorealistic image of a caring audiologist (woman, 40s, white coat) "
            "sitting across from an elderly patient (70s) in a bright, modern hearing clinic. "
            "The audiologist shows test results on a tablet screen. Hearing aid models visible "
            "on the desk. Warm natural lighting from large windows. "
            "Empathetic, professional atmosphere. No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "audiologist examining elderly patient's ear with otoscope, warm clinic setting",
    },
    "appareils-auditifs": {
        "hero": (
            "Photorealistic close-up of modern hearing aids (RIC and intra-ear types) "
            "arranged on a clean white surface next to their charging case. "
            "An elderly person's hand (70s) gently picks up one hearing aid. "
            "Soft warm lighting, shallow depth of field. "
            "Medical precision meets everyday comfort. No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "modern hearing aids next to charging case, warm professional lighting",
    },
    "acouphenes": {
        "hero": (
            "Photorealistic image of a middle-aged person (50s) in a peaceful therapy room, "
            "wearing over-ear headphones connected to a sound therapy device. "
            "An audiologist (white coat) monitors settings on a laptop nearby. "
            "Calm, serene atmosphere with soft ambient lighting and plants. "
            "No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "person wearing headphones in therapy room, calming atmosphere",
    },
    "prevention": {
        "hero": (
            "Photorealistic image of a happy senior couple (65-70s) walking in a park, "
            "one wearing small discreet hearing aids visible behind the ear. "
            "Sunlight filtering through trees. Active, healthy lifestyle. "
            "Natural warm tones. No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "senior person doing hearing protection exercises, bright outdoor setting",
    },
    "remboursement": {
        "hero": (
            "Photorealistic image of an audiologist (40s, professional attire) at a desk "
            "explaining a document to a senior couple (70s). The desk has a laptop showing "
            "a cost breakdown with highlighted amounts. Carte Vitale and mutuelle documents "
            "visible. Well-lit modern office. Professional and reassuring. "
            "No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "Carte Vitale next to hearing aid and cost document on desk",
    },
    "vie-quotidienne": {
        "hero": (
            "Photorealistic image of a joyful grandfather (70s) wearing small hearing aids, "
            "sitting at a family dinner table with children and grandchildren. "
            "He is smiling, clearly engaged in conversation. Warm home environment, "
            "evening lighting, a meal on the table. Emotional, heartwarming. "
            "No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "elderly person with hearing aids enjoying family conversation",
    },
    "comparatif": {
        "hero": (
            "Photorealistic top-down view of 5 different hearing aid models arranged "
            "in a neat row on a navy blue surface ({marine}). Each model has a small label card. "
            "An audiologist's hands (wearing a white coat sleeve) point at one model "
            "with a pen. Bright studio lighting, clean composition. "
            "No text overlay. 16:9 format, high resolution."
        ),
        "og_element": "multiple hearing aids side by side on professional surface with comparison cards",
    },
}

# Fallback scene for unknown categories
DEFAULT_SCENE = {
    "hero": (
        "Photorealistic image of a modern hearing clinic reception area. "
        "A friendly audiologist (40s, white coat) greets a senior patient (70s) "
        "at the entrance. Clean, bright, welcoming space with hearing health posters. "
        "Warm lighting, professional but accessible. "
        "No text overlay. 16:9 format, high resolution."
    ),
    "og_element": "welcoming hearing clinic with audiologist and patient",
}


# ─── Frontmatter Parser ───────────────────────────────────────────────────

def parse_frontmatter(filepath: Path) -> dict[str, Any] | None:
    """Extract YAML frontmatter from a markdown/mdx file."""
    try:
        text = filepath.read_text(encoding="utf-8")
    except Exception as e:
        log.error(f"Cannot read {filepath}: {e}")
        return None

    match = re.match(r"^---\s*\n(.*?)\n---", text, re.DOTALL)
    if not match:
        log.warning(f"No frontmatter found in {filepath}")
        return None

    try:
        return yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        log.error(f"Invalid YAML in {filepath}: {e}")
        return None


# ─── Article Scanner ───────────────────────────────────────────────────────

def scan_articles(slug_filter: str | None = None) -> list[dict[str, Any]]:
    """Scan content directories for articles needing images."""
    articles = []

    for content_dir in CONTENT_DIRS:
        if not content_dir.exists():
            log.debug(f"Skipping missing dir: {content_dir}")
            continue

        collection_type = content_dir.name  # "guides" or "comparatifs"

        for filepath in sorted(content_dir.glob("**/*.md*")):
            if filepath.name.startswith("."):
                continue

            fm = parse_frontmatter(filepath)
            if not fm:
                continue

            if fm.get("draft", False):
                log.debug(f"Skipping draft: {filepath.stem}")
                continue

            slug = filepath.stem
            if slug_filter and slug != slug_filter:
                continue

            # Check if images already exist
            hero_path = IMAGE_OUTPUT_DIR / slug / f"{slug}.webp"
            og_path = IMAGE_OUTPUT_DIR / slug / f"{slug}-og.webp"

            needs_hero = not hero_path.exists()
            needs_og = not og_path.exists()

            if not needs_hero and not needs_og:
                log.debug(f"Images exist for {slug}, skipping")
                continue

            category = fm.get("category", "")
            is_comparatif = collection_type == "comparatifs"

            articles.append({
                "slug": slug,
                "title": fm.get("title", slug),
                "description": fm.get("description", ""),
                "category": category,
                "collection": collection_type,
                "is_comparatif": is_comparatif,
                "filepath": str(filepath),
                "needs_hero": needs_hero,
                "needs_og": needs_og,
                "hero_path": str(hero_path),
                "og_path": str(og_path),
            })

    log.info(f"Found {len(articles)} article(s) needing images")
    return articles


# ─── Prompt Builder ────────────────────────────────────────────────────────

def build_hero_prompt(article: dict[str, Any]) -> str:
    """Build a hero image prompt based on article category and content."""
    category = article["category"]

    if article["is_comparatif"]:
        scene = SCENE_LIBRARY.get("comparatif", DEFAULT_SCENE)
    else:
        scene = SCENE_LIBRARY.get(category, DEFAULT_SCENE)

    prompt = scene["hero"].format(**PALETTE)
    return prompt


def build_og_prompt(article: dict[str, Any]) -> str:
    """Build an OG image prompt with article title overlay."""
    category = article["category"]
    title = article["title"]

    if article["is_comparatif"]:
        scene = SCENE_LIBRARY.get("comparatif", DEFAULT_SCENE)
    else:
        scene = SCENE_LIBRARY.get(category, DEFAULT_SCENE)

    # Shorten title for OG if too long
    og_title = title if len(title) <= 50 else title[:47] + "..."

    prompt = (
        f'Marketing banner image, dark navy background ({PALETTE["marine"]}). '
        f'Left side: photorealistic {scene["og_element"]}. '
        f'Right side: bold white text "{og_title}" with a warm orange ({PALETTE["orange"]}) underline. '
        f'Small "LeGuideAuditif.fr" text in orange at bottom right corner. '
        f"Soft warm bokeh in background. "
        f"Clean, professional, healthcare composition. 1200x630 pixels."
    )
    return prompt


# ─── Image Generator ──────────────────────────────────────────────────────

def generate_image(
    client: genai.Client,
    prompt: str,
    model: str,
    aspect_ratio: str = "16:9",
) -> bytes | None:
    """Call Gemini Imagen API and return raw image bytes."""
    try:
        response = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                safety_filter_level="BLOCK_ONLY_HIGH",
            ),
        )

        if response.generated_images:
            return response.generated_images[0].image.image_bytes
        else:
            log.warning("No image returned by API")
            return None

    except Exception as e:
        log.error(f"Imagen API error: {e}")
        return None


def save_as_webp(
    image_bytes: bytes,
    output_path: Path,
    max_size_kb: int,
    target_width: int | None = None,
    target_height: int | None = None,
) -> bool:
    """Convert image bytes to optimized WebP and save."""
    try:
        img = Image.open(io.BytesIO(image_bytes))

        # Resize if target dimensions specified
        if target_width and target_height:
            img = img.resize((target_width, target_height), Image.LANCZOS)

        # Ensure output directory exists
        output_path.parent.mkdir(parents=True, exist_ok=True)

        # Save with quality optimization
        quality = WEBP_QUALITY
        while quality >= 50:
            buffer = io.BytesIO()
            img.save(buffer, format="WebP", quality=quality, method=6)
            size_kb = buffer.tell() / 1024

            if size_kb <= max_size_kb:
                output_path.write_bytes(buffer.getvalue())
                log.info(f"Saved {output_path.name} ({size_kb:.0f}KB, q={quality})")
                return True

            quality -= 5

        # Save at minimum quality if still too large
        buffer = io.BytesIO()
        img.save(buffer, format="WebP", quality=50, method=6)
        output_path.write_bytes(buffer.getvalue())
        size_kb = buffer.tell() / 1024
        log.warning(f"Saved {output_path.name} at min quality ({size_kb:.0f}KB)")
        return True

    except Exception as e:
        log.error(f"Error saving {output_path}: {e}")
        return False


# ─── Main Pipeline ─────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> dict[str, Any]:
    """Main pipeline: scan → prompt → generate → save → report."""
    report = {
        "date": datetime.now().isoformat(),
        "model": args.model,
        "dry_run": args.dry_run,
        "generated": [],
        "errors": [],
        "skipped": [],
    }

    # Scan articles
    articles = scan_articles(args.slug)
    if not articles:
        log.info("No articles need images. Done.")
        return report

    # Init Gemini client (skip in dry-run)
    client = None
    if not args.dry_run:
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            log.error("GEMINI_API_KEY environment variable not set")
            sys.exit(1)
        client = genai.Client(api_key=api_key)

    for article in articles:
        slug = article["slug"]
        log.info(f"\n{'='*50}")
        log.info(f"Processing: {slug}")
        log.info(f"  Title: {article['title']}")
        log.info(f"  Category: {article['category']}")
        log.info(f"  Collection: {article['collection']}")

        entry = {"slug": slug, "title": article["title"], "images": []}

        # Hero image
        if article["needs_hero"]:
            hero_prompt = build_hero_prompt(article)
            log.info(f"  HERO prompt: {hero_prompt[:100]}...")

            if args.dry_run:
                entry["images"].append({"type": "hero", "path": article["hero_path"], "prompt": hero_prompt})
            else:
                image_bytes = generate_image(client, hero_prompt, args.model, "16:9")
                if image_bytes:
                    success = save_as_webp(
                        image_bytes,
                        Path(article["hero_path"]),
                        MAX_HERO_SIZE_KB,
                    )
                    if success:
                        entry["images"].append({"type": "hero", "path": article["hero_path"]})
                    else:
                        report["errors"].append({"slug": slug, "type": "hero", "error": "save failed"})
                else:
                    report["errors"].append({"slug": slug, "type": "hero", "error": "API returned no image"})

        # OG image
        if article["needs_og"]:
            og_prompt = build_og_prompt(article)
            log.info(f"  OG prompt: {og_prompt[:100]}...")

            if args.dry_run:
                entry["images"].append({"type": "og", "path": article["og_path"], "prompt": og_prompt})
            else:
                image_bytes = generate_image(client, og_prompt, args.model, "16:9")
                if image_bytes:
                    success = save_as_webp(
                        image_bytes,
                        Path(article["og_path"]),
                        MAX_OG_SIZE_KB,
                        target_width=OG_WIDTH,
                        target_height=OG_HEIGHT,
                    )
                    if success:
                        entry["images"].append({"type": "og", "path": article["og_path"]})
                    else:
                        report["errors"].append({"slug": slug, "type": "og", "error": "save failed"})
                else:
                    report["errors"].append({"slug": slug, "type": "og", "error": "API returned no image"})

        if entry["images"]:
            report["generated"].append(entry)

    # Summary
    total_images = sum(len(e["images"]) for e in report["generated"])
    log.info(f"\n{'='*50}")
    log.info(f"DONE: {total_images} images generated for {len(report['generated'])} articles")
    if report["errors"]:
        log.warning(f"ERRORS: {len(report['errors'])}")

    return report


# ─── CLI ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="LeGuideAuditif — Generate blog images via Gemini Imagen API"
    )
    parser.add_argument(
        "--slug",
        type=str,
        default=None,
        help="Generate images for a specific article slug only",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without calling the API",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help=f"Gemini model to use (default: {DEFAULT_MODEL})",
    )
    parser.add_argument(
        "--report",
        type=str,
        default=None,
        help="Save JSON report to file",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    report = run(args)

    # Save report if requested
    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
        log.info(f"Report saved to {args.report}")

    # Print report to stdout
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
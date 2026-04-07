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
DEFAULT_MODEL = "gemini-2.5-flash-image"

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
            "Photorealistic close-up of a modern audiometer device on a clean desk "
            "in a bright hearing clinic. Headphones connected to the device, audiogram chart "
            "visible on screen. Soft warm lighting from large windows, cream colored walls. "
            "Professional medical equipment, warm atmosphere. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "audiometer and headphones on clinic desk, warm lighting",
    },
    "appareils-auditifs": {
        "hero": (
            "Photorealistic close-up of three modern hearing aids (RIC type, beige and silver) "
            "arranged on a clean cream surface next to their white charging case. "
            "Soft warm directional lighting, shallow depth of field, bokeh background. "
            "Medical precision meets everyday elegance. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "modern hearing aids next to charging case on cream surface",
    },
    "acouphenes": {
        "hero": (
            "Photorealistic image of over-ear therapy headphones on a wooden desk "
            "next to a sound therapy device with soft LED lights. "
            "Calm zen atmosphere, green plant in background, soft ambient lighting. "
            "Peaceful therapy room setting. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "therapy headphones and sound device in calm room",
    },
    "prevention": {
        "hero": (
            "Photorealistic image of custom-molded ear protection plugs and a hearing "
            "protection case on a wooden table. Sunny park visible through window. "
            "Bright warm natural lighting, healthy lifestyle concept. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "ear protection plugs on wooden surface, bright natural light",
    },
    "remboursement": {
        "hero": (
            "Photorealistic image of a hearing aid next to a French Carte Vitale card "
            "and insurance documents on a clean white desk. A calculator and pen nearby. "
            "Bright office lighting, organized professional setting. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "hearing aid next to health insurance card on desk",
    },
    "vie-quotidienne": {
        "hero": (
            "Photorealistic image of a cozy living room with a TV, a TV Connector device "
            "plugged in, and a small hearing aid on the coffee table next to a cup of tea. "
            "Warm evening lighting, comfortable home atmosphere. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "hearing aid on coffee table in warm living room",
    },
    "audioprothesiste": {
        "hero": (
            "Photorealistic image of a modern hearing clinic interior. Clean white desk "
            "with audiometer, otoscope, and hearing aid samples on display. "
            "Bright warm lighting, cream walls, professional medical office. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "modern hearing clinic desk with professional equipment",
    },
    "comparatif": {
        "hero": (
            "Photorealistic top-down view of 5 different hearing aid models arranged "
            "in a neat row on a dark navy blue surface. Each model slightly different design. "
            "Bright studio lighting, clean minimalist composition, shallow depth of field. "
            "No text, no watermark. 16:9 format, high resolution."
        ),
        "og_element": "multiple hearing aids side by side on navy surface",
    },
}

# Fallback scene for unknown categories
DEFAULT_SCENE = {
    "hero": (
        "Photorealistic image of a modern hearing clinic desk with an otoscope, "
        "a pair of hearing aids, and an audiogram printout. Clean, bright space "
        "with cream colored walls and warm natural lighting. "
        "Professional medical atmosphere. "
        "No text, no watermark. 16:9 format, high resolution."
    ),
    "og_element": "hearing clinic desk with otoscope and hearing aids",
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

            # Build slug: use parent dir for index files to avoid collisions
            if filepath.stem == "index":
                slug = filepath.parent.name
            else:
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

            # Use "category" for comparatifs, "cluster" for guides
            category = fm.get("category", "") or fm.get("cluster", "")
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
        f'Professional banner image with dark navy background ({PALETTE["marine"]}). '
        f'Photorealistic {scene["og_element"]}. '
        f'Soft warm bokeh effect, shallow depth of field. '
        f'Clean medical composition, warm cream and orange accent tones. '
        f"No text, no watermark, no words. 1200x630 pixels."
    )
    return prompt


# ─── Image Generator ──────────────────────────────────────────────────────

def generate_image(
    client: genai.Client,
    prompt: str,
    model: str,
    aspect_ratio: str = "16:9",
) -> bytes | None:
    """Call Gemini API to generate an image and return raw bytes."""
    try:
        # Use Imagen API for imagen models
        if "imagen" in model:
            response = client.models.generate_images(
                model=model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                ),
            )
            if response.generated_images:
                return response.generated_images[0].image.image_bytes
            else:
                log.warning("No image returned by Imagen API")
                return None

        # Use generate_content for Gemini Flash models
        else:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                ),
            )
            if (response.candidates
                    and response.candidates[0].content
                    and response.candidates[0].content.parts):
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        return part.inline_data.data
            log.warning("No image returned by Gemini Flash API")
            return None

    except Exception as e:
        log.error(f"Image generation API error: {e}")
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
#!/usr/bin/env python3
"""
LeGuideAuditif — Generate Homepage Images via Gemini Imagen 4 API

Generates 5 specific images for the homepage redesign.

Usage:
    python scripts/generate-homepage-images.py
    python scripts/generate-homepage-images.py --dry-run

Requires:
    pip install google-genai Pillow
    GEMINI_API_KEY in .env or environment
"""

import io
import logging
import os
import sys
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai required. Run: pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow required. Run: pip install Pillow")
    sys.exit(1)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "images" / "homepage"
MODEL = "imagen-4.0-generate-001"
WEBP_QUALITY = 88

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("homepage-imagegen")

# ─── Image definitions ────────────────────────────────────────────────────

IMAGES = [
    {
        "filename": "hero-senior-audition.webp",
        "width": 600,
        "height": 500,
        "aspect_ratio": "4:3",
        "max_kb": 80,
        "prompt": (
            "Photorealistic lifestyle portrait of a smiling senior man, age 68, "
            "in a bright warm living room with natural light from large windows. "
            "He is wearing a small discreet RIC hearing aid behind his right ear. "
            "He looks confident, happy and engaged. Warm cream and wood tones in the room. "
            "Soft bokeh background. Empathetic, reassuring atmosphere. "
            "No text overlay. High resolution, professional photography."
        ),
    },
    {
        "filename": "hero-senior-audition-mobile.webp",
        "width": 400,
        "height": 300,
        "aspect_ratio": "4:3",
        "max_kb": 50,
        "prompt": (
            "Photorealistic close-up portrait of a smiling senior man, age 68, "
            "shoulders and face visible. He wears a small discreet RIC hearing aid "
            "behind his right ear. Warm natural light, cream background. "
            "Confident, serene expression. Shallow depth of field. "
            "No text overlay. High resolution, professional photography."
        ),
    },
    {
        "filename": "comparatif-appareils.webp",
        "width": 500,
        "height": 300,
        "aspect_ratio": "16:9",
        "max_kb": 80,
        "prompt": (
            "Photorealistic product photography of 3 modern hearing aids placed side by side "
            "on a clean white-cream surface. Left: a behind-the-ear (BTE) contour hearing aid. "
            "Center: a receiver-in-canal (RIC) hearing aid. Right: a tiny completely-in-canal (CIC) "
            "intra-auricular hearing aid. Professional studio lighting, soft shadows, "
            "medical catalog quality. Clean minimalist composition. "
            "No text overlay. High resolution."
        ),
    },
    {
        "filename": "franck-olivier-portrait.webp",
        "width": 300,
        "height": 300,
        "aspect_ratio": "1:1",
        "max_kb": 60,
        "prompt": (
            "Photorealistic professional headshot of a French male audiologist, age 52, "
            "with warm friendly smile. He wears a clean white medical coat over a blue shirt. "
            "Short brown hair with grey at temples. Neutral light grey background. "
            "Professional studio lighting, soft and flattering. Corporate medical portrait style. "
            "No text overlay. High resolution."
        ),
    },
    {
        "filename": "video-thumbnail.webp",
        "width": 640,
        "height": 360,
        "aspect_ratio": "16:9",
        "max_kb": 80,
        "prompt": (
            "Photorealistic image of a male audiologist (50s, white coat) sitting at a desk "
            "in a modern audiology clinic, facing the camera as if giving video advice. "
            "Behind him: hearing test equipment, audiometer, sound booth window visible. "
            "Warm professional lighting. He gestures with one hand explaining something. "
            "Welcoming, trustworthy atmosphere. Medical office setting. "
            "No text overlay. 16:9 format, high resolution."
        ),
    },
]


def generate_image(client: genai.Client, prompt: str, aspect_ratio: str) -> bytes | None:
    """Call Gemini Imagen API and return raw image bytes."""
    try:
        response = client.models.generate_images(
            model=MODEL,
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                safety_filter_level="BLOCK_LOW_AND_ABOVE",
            ),
        )
        if response.generated_images:
            return response.generated_images[0].image.image_bytes
        log.warning("No image returned by API")
        return None
    except Exception as e:
        log.error(f"Imagen API error: {e}")
        return None


def save_as_webp(image_bytes: bytes, output_path: Path, width: int, height: int, max_kb: int) -> bool:
    """Resize and save image as optimized WebP."""
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.resize((width, height), Image.LANCZOS)

        quality = WEBP_QUALITY
        while quality >= 50:
            buffer = io.BytesIO()
            img.save(buffer, format="WebP", quality=quality, method=6)
            size_kb = buffer.tell() / 1024
            if size_kb <= max_kb:
                output_path.write_bytes(buffer.getvalue())
                log.info(f"  Saved {output_path.name} ({size_kb:.0f}KB, q={quality})")
                return True
            quality -= 5

        buffer = io.BytesIO()
        img.save(buffer, format="WebP", quality=50, method=6)
        output_path.write_bytes(buffer.getvalue())
        log.warning(f"  Saved {output_path.name} at min quality ({buffer.tell()/1024:.0f}KB)")
        return True
    except Exception as e:
        log.error(f"  Error saving {output_path}: {e}")
        return False


def main():
    dry_run = "--dry-run" in sys.argv

    # Load .env
    env_path = PROJECT_ROOT / ".env"
    if load_dotenv and env_path.exists():
        load_dotenv(env_path)
        log.info(f"Loaded .env from {env_path}")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and not dry_run:
        log.error("GEMINI_API_KEY not found in environment or .env")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    client = None
    if not dry_run:
        client = genai.Client(api_key=api_key)

    success_count = 0
    error_count = 0

    for img_def in IMAGES:
        filename = img_def["filename"]
        output_path = OUTPUT_DIR / filename
        log.info(f"\n{'='*50}")
        log.info(f"Image: {filename} ({img_def['width']}x{img_def['height']})")

        if output_path.exists():
            log.info(f"  Already exists, skipping")
            success_count += 1
            continue

        if dry_run:
            log.info(f"  [DRY RUN] Prompt: {img_def['prompt'][:80]}...")
            continue

        log.info(f"  Generating via Imagen 4...")
        image_bytes = generate_image(client, img_def["prompt"], img_def["aspect_ratio"])

        if image_bytes:
            ok = save_as_webp(image_bytes, output_path, img_def["width"], img_def["height"], img_def["max_kb"])
            if ok:
                success_count += 1
            else:
                error_count += 1
        else:
            error_count += 1

    log.info(f"\n{'='*50}")
    log.info(f"DONE: {success_count} saved, {error_count} errors")


if __name__ == "__main__":
    main()

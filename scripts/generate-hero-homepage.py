#!/usr/bin/env python3
"""
Generate hero image for LeGuideAuditif homepage — Option A: Consultation bienveillante.

Usage:
    python scripts/generate-hero-homepage.py
    python scripts/generate-hero-homepage.py --dry-run

Requires:
    pip install google-genai Pillow
    GEMINI_API_KEY in .env or environment
"""

import io
import os
import sys
from pathlib import Path

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

HERO_PROMPT = (
    "Photorealistic image of a warm hearing consultation. "
    "A senior woman aged 65-70, silver hair, warm smile, sitting comfortably "
    "in a modern bright hearing clinic. She faces an audiologist (seen from behind, "
    "slightly blurred, wearing a white coat). "
    "The audiologist is showing her a small modern hearing aid. "
    "Warm natural lighting from a large window, cream-colored walls, "
    "touches of wood furniture. Atmosphere of trust and gentle care. "
    "Shallow depth of field, bokeh background. "
    "Color palette: warm cream tones, soft navy accents, natural skin tones. "
    "No text, no watermark, no logos, no emoji. "
    "Professional medical photography style, high resolution."
)

MODEL = "gemini-2.5-flash-image"
WEBP_QUALITY = 88


def load_env():
    """Load .env file if present."""
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                os.environ.setdefault(key.strip(), value.strip())


def generate_image(client, prompt):
    """Generate image via Gemini Flash."""
    print(f"Generating image with {MODEL}...")
    print(f"Prompt: {prompt[:120]}...")

    response = client.models.generate_content(
        model=MODEL,
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

    print("ERROR: No image returned by API")
    return None


def save_variants(image_bytes):
    """Save desktop (600x500) and mobile (400x300) WebP variants."""
    img = Image.open(io.BytesIO(image_bytes))
    print(f"Raw image size: {img.size[0]}x{img.size[1]}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    variants = [
        ("hero-senior-audition.webp", 600, 500),
        ("hero-senior-audition-mobile.webp", 400, 300),
    ]

    for filename, w, h in variants:
        # Center crop to target aspect ratio, then resize
        target_ratio = w / h
        src_ratio = img.size[0] / img.size[1]

        if src_ratio > target_ratio:
            # Image too wide — crop sides
            new_w = int(img.size[1] * target_ratio)
            left = (img.size[0] - new_w) // 2
            cropped = img.crop((left, 0, left + new_w, img.size[1]))
        else:
            # Image too tall — crop top/bottom
            new_h = int(img.size[0] / target_ratio)
            top = (img.size[1] - new_h) // 2
            cropped = img.crop((0, top, img.size[0], top + new_h))

        resized = cropped.resize((w, h), Image.LANCZOS)

        out_path = OUTPUT_DIR / filename
        resized.save(out_path, format="WebP", quality=WEBP_QUALITY, method=6)
        size_kb = out_path.stat().st_size / 1024
        print(f"Saved: {out_path.relative_to(PROJECT_ROOT)} ({size_kb:.0f}KB, {w}x{h})")

    print("\nDone! Images ready in public/images/homepage/")


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("=== DRY RUN ===")
        print(f"Model: {MODEL}")
        print(f"Prompt: {HERO_PROMPT}")
        print(f"Output: {OUTPUT_DIR}")
        print("Desktop: hero-senior-audition.webp (600x500)")
        print("Mobile:  hero-senior-audition-mobile.webp (400x300)")
        return

    load_env()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not found")
        sys.exit(1)

    client = genai.Client(api_key=api_key)
    image_bytes = generate_image(client, HERO_PROMPT)

    if image_bytes:
        save_variants(image_bytes)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()

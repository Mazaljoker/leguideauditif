#!/usr/bin/env python3
"""
Generate custom HERO image for /catalogue/ hub page.
Output: public/images/hero/catalogue-hero.webp (16:9, <200KB)
"""

import io
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "images" / "hero" / "catalogue-hero.webp"
MODEL = "gemini-2.5-flash-image"
MAX_SIZE_KB = 200

HERO_PROMPT = (
    "Photorealistic studio product photograph, soft diffused lighting from above, "
    "gentle shadows. A clean top-down hero view of five modern hearing aids of distinctly "
    "different form factors arranged in a neat staggered row: a small RIC receiver-in-canal "
    "model (beige), a behind-the-ear BTE model (silver), a nearly invisible in-the-ear ITE "
    "model (skin tone), a CIC deep-ear model (dark), and a rechargeable charger case with "
    "subtle LED indicator. The devices rest on a warm cream-colored linen fabric surface "
    "with a very faint grid of light shadow lines evoking a catalog or product comparison sheet. "
    "A subtle warm terracotta orange accent appears as a small bookmark tab or price label "
    "ribbon. Composition: wide 16:9 cinematic framing, devices placed slightly left of center, "
    "generous negative space on the right half for text overlay. Color palette dominant: cream "
    "and beige with soft shadows and warm wood tones barely visible at the edges. Style: "
    "editorial product photography, inspired by Wirecutter and Nilufar catalog aesthetic, "
    "clean, trustworthy, educational, premium but approachable. High resolution, crisp, "
    "professional. "
    "NEGATIVE: no hospital setting, no clinical cold lighting, no medical equipment around, "
    "no stethoscope, no dramatic shadows, no cluttered background, no text overlays, no "
    "watermarks, no logos, no visible brand names on the devices, no cables, no packaging "
    "boxes, no price tags with numbers. "
    "No text, no watermark. 16:9 format, high resolution."
)


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    print(f"Generating catalogue HERO with model {MODEL}...")
    response = client.models.generate_content(
        model=MODEL,
        contents=HERO_PROMPT,
        config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
    )

    image_bytes = None
    if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.inline_data and part.inline_data.data:
                image_bytes = part.inline_data.data
                break

    if not image_bytes:
        print("ERROR: no image returned")
        sys.exit(1)

    img = Image.open(io.BytesIO(image_bytes))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    quality = 90
    while quality >= 50:
        buffer = io.BytesIO()
        img.save(buffer, format="WebP", quality=quality, method=6)
        size_kb = buffer.tell() / 1024
        if size_kb <= MAX_SIZE_KB:
            OUTPUT.write_bytes(buffer.getvalue())
            print(f"Saved {OUTPUT} ({size_kb:.0f}KB, q={quality})")
            return
        quality -= 5

    buffer = io.BytesIO()
    img.save(buffer, format="WebP", quality=50, method=6)
    OUTPUT.write_bytes(buffer.getvalue())
    size_kb = buffer.tell() / 1024
    print(f"Saved {OUTPUT} at min quality ({size_kb:.0f}KB)")


if __name__ == "__main__":
    main()

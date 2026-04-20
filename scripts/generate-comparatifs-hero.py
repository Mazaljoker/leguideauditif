#!/usr/bin/env python3
"""
Generate custom HERO image for /comparatifs/ hub page.
Output: public/images/hero/comparatifs-hero.webp (16:9, <200KB)
"""

import io
import os
import sys
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "images" / "hero" / "comparatifs-hero.webp"
MODEL = "gemini-2.5-flash-image"
MAX_SIZE_KB = 200

HERO_PROMPT = (
    "Photorealistic editorial photograph, warm natural daylight, shallow depth of field. "
    "A close-up view of four modern hearing aids of different designs (RIC, BTE, ITE, "
    "in-ear style) arranged in a clean neat row on a warm cream-colored linen surface. "
    "A hand (partially visible, belonging to a hearing care professional in their 40s, "
    "wearing a soft navy blue cuff) gently points with an orange-accent pen toward the "
    "third hearing aid in the row, as if comparing specifications. A clean open comparison "
    "sheet with specification bars (no readable text) is softly blurred in the background. "
    "Soft bokeh, warm wooden desk edge visible, a single subtle warm terracotta orange "
    "accent (pen tip or small detail). Composition: wide 16:9 cinematic framing, subjects "
    "positioned left of center, generous negative space on the right half for text overlay. "
    "Style: editorial product photography, inspired by The New York Times Wirecutter "
    "reviews, clean and trustworthy. High resolution, crisp, professional, educational. "
    "Color palette dominant: cream and beige with warm wood, subtle orange accent. "
    "NEGATIVE: no hospital setting, no clinical cold lighting, no pharmacy display, no "
    "dramatic shadows, no cluttered background, no text overlays, no watermarks, no logos, "
    "no brand names visible on the devices, no hands gripping forcefully. "
    "No text, no watermark. 16:9 format, high resolution."
)


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    print(f"Generating comparatifs HERO with model {MODEL}...")
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

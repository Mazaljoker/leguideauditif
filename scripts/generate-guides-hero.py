#!/usr/bin/env python3
"""
Generate custom HERO image for /guides/ hub page.
Output: public/images/hero/guides-hero.webp (16:9, <200KB)
"""

import io
import os
import sys
from pathlib import Path

try:
    from google import genai
    from google.genai import types
    from PIL import Image
except ImportError as e:
    print(f"ERROR: missing dependency ({e}). Run: pip install google-genai Pillow")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "public" / "images" / "hero" / "guides-hero.webp"
MODEL = "gemini-2.5-flash-image"
MAX_SIZE_KB = 200

HERO_PROMPT = (
    "Photorealistic editorial photograph, warm natural daylight through large window, "
    "shallow depth of field. A 68-year-old French woman with silver hair, subtly smiling "
    "and relaxed, seated on a light-toned linen sofa, holding a tablet displaying a clean "
    "simple audiogram infographic. Beside her, a female hearing care professional in her 40s, "
    "wearing a soft navy blue blouse, gestures gently with a pen to point at the tablet, "
    "explaining with a friendly pedagogical expression. Clean modern Scandinavian living room "
    "background with soft bokeh. Color palette dominant: cream and beige tones, warm wood, "
    "with a single subtle warm terracotta orange accent (cushion or book). Both subjects "
    "appear authentic and natural — absolutely not a staged corporate pose. "
    "Composition: wide 16:9 cinematic framing, subjects positioned slightly left of center, "
    "generous negative space on the right half of the frame for text overlay. "
    "Style: editorial lifestyle photography, inspired by The New York Times health section, "
    "candid but refined. High resolution, crisp, hopeful, trustworthy, professional. "
    "NEGATIVE: no hearing aids visible on the women, no medical equipment, no hospital, "
    "no clinical cold lighting, no stethoscope, no pharmacy setting, no dramatic shadows, "
    "no sadness, no anxiety, no elderly frailty, no cluttered background, no text overlays, "
    "no watermarks, no logos, no stock-photo smile. "
    "No text, no watermark. 16:9 format, high resolution."
)


def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    print(f"Generating HERO with model {MODEL}...")
    print(f"Prompt length: {len(HERO_PROMPT)} chars")

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

    # Convert and save as WebP with quality optimization
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

    # Save at min quality if still too large
    buffer = io.BytesIO()
    img.save(buffer, format="WebP", quality=50, method=6)
    OUTPUT.write_bytes(buffer.getvalue())
    size_kb = buffer.tell() / 1024
    print(f"Saved {OUTPUT} at min quality ({size_kb:.0f}KB)")


if __name__ == "__main__":
    main()

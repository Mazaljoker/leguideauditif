#!/usr/bin/env python3
"""
Génère les images OG pour les pages statiques LeGuideAuditif (hors articles).
Utilise Gemini pour la génération d'image.

Usage:
    python scripts/generate-og-pages.py
    python scripts/generate-og-pages.py --dry-run
"""

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
    import io
except ImportError:
    print("ERROR: Pillow required. Run: pip install Pillow")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = PROJECT_ROOT / "public"

API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("ERROR: GEMINI_API_KEY not set")
    sys.exit(1)

MODEL = "gemini-2.5-flash-image"

# Pages OG à générer
PAGES = {
    "og-trouver-audioprothesiste.jpg": {
        "prompt": (
            "Create a professional Open Graph image (1200x630 pixels) for a French hearing aid website. "
            "Design: solid dark navy blue background (#1B2E4A). "
            "Center text in bold white sans-serif font: 'Trouver un audioprothesiste' on the first line, "
            "'pres de chez vous' on the second line. "
            "Below the text, a thin orange (#D97B3D) horizontal accent line. "
            "Bottom-right corner: 'LeGuideAuditif.fr' in orange (#D97B3D) text. "
            "Top-left corner: a small white map pin/location icon. "
            "Clean, modern, professional healthcare design. No photos, no people. "
            "Flat design style, not 3D. High contrast text."
        ),
    },
    "og-default.jpg": {
        "prompt": (
            "Create a professional Open Graph image (1200x630 pixels) for a French hearing health information website. "
            "Design: solid dark navy blue background (#1B2E4A). "
            "Center text in bold white sans-serif font: 'LeGuideAuditif.fr' large. "
            "Below in smaller white text: 'Votre guide independant en sante auditive'. "
            "Below the text, a thin orange (#D97B3D) horizontal accent line. "
            "Subtle abstract sound wave pattern in slightly lighter navy (#2A4570) in the background. "
            "Clean, modern, professional healthcare design. No photos, no people. "
            "Flat design style, not 3D. High contrast text."
        ),
    },
}


def generate_image(client, prompt: str, output_path: Path, dry_run: bool = False):
    """Génère une image via Gemini et la sauvegarde en JPG 1200x630."""
    print(f"\n--- Generating: {output_path.name}")
    print(f"    Prompt: {prompt[:80]}...")

    if dry_run:
        print("    [DRY RUN] Skipped.")
        return

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE", "TEXT"],
        ),
    )

    # Extraire l'image de la réponse
    image_data = None
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
            image_data = part.inline_data.data
            break

    if not image_data:
        print("    ERROR: No image in response")
        return

    # Ouvrir, redimensionner à 1200x630, sauver en JPG
    img = Image.open(io.BytesIO(image_data))
    img = img.resize((1200, 630), Image.LANCZOS)
    img = img.convert("RGB")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(str(output_path), "JPEG", quality=90, optimize=True)

    size_kb = output_path.stat().st_size / 1024
    print(f"    Saved: {output_path} ({size_kb:.0f} KB)")


def main():
    dry_run = "--dry-run" in sys.argv

    client = genai.Client(api_key=API_KEY)

    for filename, config in PAGES.items():
        output_path = PUBLIC_DIR / filename
        if output_path.exists() and "--force" not in sys.argv:
            print(f"\n--- {filename} already exists (use --force to overwrite)")
            continue
        generate_image(client, config["prompt"], output_path, dry_run=dry_run)

    print("\nDone!")


if __name__ == "__main__":
    main()

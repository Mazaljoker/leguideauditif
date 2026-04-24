#!/usr/bin/env python3
"""
LeGuideAuditif — Génération photos centre Premium via Gemini Imagen + upload Supabase Storage.

Pour une fiche Premium démo, génère 5 images (avatar audio + 4 photos cabine),
les upload dans le bucket centre-photos, met à jour la DB :
  - audio_photo_url = URL avatar
  - photos_cabine[] = URLs des 4 photos cabine (carré 1:1)

Usage :
    python scripts/generate-centre-photos.py --slug le-guide-auditif-demo-premium-franck-olivier
    python scripts/generate-centre-photos.py --slug ... --dry-run
    python scripts/generate-centre-photos.py --slug ... --only avatar
    python scripts/generate-centre-photos.py --slug ... --only cabine-0

Requires:
    pip install google-genai Pillow pyyaml requests python-dotenv
    .env avec GEMINI_API_KEY + SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import io
import logging
import os
import sys
import time
from pathlib import Path

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("ERROR: google-genai required. pip install google-genai")
    sys.exit(1)

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow required. pip install Pillow")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("ERROR: requests required. pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
except ImportError:
    print("ERROR: python-dotenv required. pip install python-dotenv")
    sys.exit(1)


# ─── Config ─────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
SUPABASE_URL = os.getenv("PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BUCKET = "centre-photos"
LOCAL_DIR = PROJECT_ROOT / "tmp" / "centre-photos"
DEFAULT_MODEL = "imagen-4.0-generate-001"
AVATAR_RATIO = "1:1"
CABINE_RATIO = "1:1"  # carré pour la grille 2x2
WEBP_QUALITY = 88
MAX_AVATAR_KB = 200
MAX_CABINE_KB = 350

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("lga-centre-photos")


# ─── Prompts optimisés pour une fiche Premium démo LGA ────────────────────
# Cadre : audioprothésiste senior expérimenté, cabine haut de gamme, patients
# seniors 60-80 ans. Palette chaleureuse crème + marine + orange.
# YMYL-safe : pas de texte promotionnel, ambiance pro rassurante.

PROMPTS = {
    "avatar": (
        "Photorealistic professional portrait of a distinguished French male audiologist in his early 50s, "
        "wearing a clean white professional coat over a light blue shirt. Short grey-brown hair, kind smile, "
        "blue eyes, light glasses. Neutral cream-colored background with soft natural warm lighting. "
        "Shot from chest up, looking directly at the camera with a warm but professional expression. "
        "Shallow depth of field, high-end editorial portrait photography style. "
        "No text, no watermark, no logo. Square 1:1 format, high resolution."
    ),
    "cabine-0": (
        "Photorealistic interior of a modern high-end hearing care clinic consultation room. "
        "A large audiometric booth with soundproof padded walls, a comfortable patient chair inside "
        "with professional headphones. Clean cream-colored walls, warm wooden floor, "
        "large window with natural daylight. Audiometer device visible on a sleek desk. "
        "Atmosphere: welcoming, professional, premium, absolutely pristine. "
        "No text, no watermark, no brand logos visible. Square 1:1 format, high resolution."
    ),
    "cabine-1": (
        "Photorealistic welcoming reception area of a premium French hearing care clinic. "
        "Modern designer armchairs in cream and navy blue fabric arranged around a low wooden coffee table "
        "with a vase of white flowers and a few magazines. Large floor-to-ceiling windows with natural light. "
        "A subtle reception desk in the background with a tasteful minimalist floor lamp. "
        "Warm cream walls, light oak floor, elegant atmosphere. "
        "No text, no watermark, no brand logos. Square 1:1 format, high resolution."
    ),
    "cabine-2": (
        "Photorealistic detail shot of premium audiology equipment on a clean modern desk. "
        "A state-of-the-art digital audiometer, otoscope, and a real-ear measurement probe microphone. "
        "Two modern hearing aids (RITE style, discreet beige) displayed on a velvet presentation tray. "
        "Warm desk lamp lighting, soft shadows, cream background. "
        "Premium professional medical equipment, clean composition. "
        "No text, no watermark, no brand logos. Square 1:1 format, high resolution."
    ),
    "cabine-3": (
        "Photorealistic image of a senior French audiologist explaining a hearing aid to a smiling senior woman "
        "in her early 70s. Both seated at a clean desk in a bright hearing care clinic. "
        "The audiologist holds a small RITE hearing aid between thumb and forefinger, "
        "the patient listens attentively with a warm smile. "
        "Cream walls, natural daylight, composed reassuring atmosphere. "
        "Shot from a slight angle, professional editorial style, shallow depth of field. "
        "No text, no watermark, no brand logos. Square 1:1 format, high resolution."
    ),
}


# ─── Helpers Supabase ──────────────────────────────────────────────────────
def get_centre(slug: str) -> dict | None:
    """Récupère un centre depuis Supabase via REST API."""
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/centres_auditifs",
        headers={
            "apikey": SERVICE_ROLE,
            "Authorization": f"Bearer {SERVICE_ROLE}",
        },
        params={"slug": f"eq.{slug}", "select": "id,slug,nom,plan,is_demo"},
    )
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def upload_to_storage(centre_id: str, name: str, webp_bytes: bytes) -> str:
    """Upload le WebP dans le bucket centre-photos avec upsert. Retourne l'URL publique."""
    path = f"{centre_id}/{name}"
    r = requests.post(
        f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{path}",
        headers={
            "Authorization": f"Bearer {SERVICE_ROLE}",
            "apikey": SERVICE_ROLE,
            "Content-Type": "image/webp",
            "x-upsert": "true",
        },
        data=webp_bytes,
    )
    r.raise_for_status()
    return f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{path}?v={int(time.time())}"


def update_centre_photos(centre_id: str, avatar_url: str | None, cabine_urls: list[str] | None):
    """Met à jour audio_photo_url + photos_cabine dans la DB."""
    payload = {}
    if avatar_url is not None:
        payload["audio_photo_url"] = avatar_url
    if cabine_urls is not None:
        payload["photos_cabine"] = cabine_urls
    if not payload:
        return
    payload["updated_at"] = "now()"

    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/centres_auditifs",
        headers={
            "apikey": SERVICE_ROLE,
            "Authorization": f"Bearer {SERVICE_ROLE}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        params={"id": f"eq.{centre_id}"},
        json=payload,
    )
    r.raise_for_status()


# ─── Génération image ──────────────────────────────────────────────────────
def generate_and_save(
    client: genai.Client,
    prompt: str,
    model: str,
    aspect_ratio: str,
    out_path: Path,
    max_kb: int,
    target_size: int = 1080,
) -> bytes | None:
    """Génère une image Gemini, la convertit en WebP optimisé, sauve localement."""
    log.info(f"Génération en cours : {out_path.name}")
    try:
        if "imagen" in model:
            resp = client.models.generate_images(
                model=model,
                prompt=prompt,
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                ),
            )
            if not resp.generated_images:
                log.error("Aucune image retournée par Imagen.")
                return None
            raw = resp.generated_images[0].image.image_bytes
        else:
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
            )
            raw = None
            if resp.candidates and resp.candidates[0].content and resp.candidates[0].content.parts:
                for part in resp.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.data:
                        raw = part.inline_data.data
                        break
            if not raw:
                log.error("Aucune image retournée par Gemini Flash.")
                return None

        img = Image.open(io.BytesIO(raw))
        # Redimensionne au target_size (côté carré 1:1)
        if img.width != target_size:
            img = img.resize((target_size, target_size), Image.LANCZOS)

        out_path.parent.mkdir(parents=True, exist_ok=True)
        quality = WEBP_QUALITY
        while quality >= 50:
            buf = io.BytesIO()
            img.save(buf, format="WebP", quality=quality, method=6)
            size_kb = buf.tell() / 1024
            if size_kb <= max_kb:
                out_path.write_bytes(buf.getvalue())
                log.info(f"Sauvé {out_path.name} ({size_kb:.0f} KB, q={quality})")
                return buf.getvalue()
            quality -= 5
        # Fallback min quality
        buf = io.BytesIO()
        img.save(buf, format="WebP", quality=50, method=6)
        out_path.write_bytes(buf.getvalue())
        log.warning(f"Sauvé {out_path.name} à quality min ({buf.tell()/1024:.0f} KB)")
        return buf.getvalue()
    except Exception as e:
        log.error(f"Erreur génération {out_path.name}: {e}")
        return None


# ─── Main ──────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Génère les photos d'une fiche Premium démo via Gemini")
    parser.add_argument("--slug", required=True, help="Slug du centre")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--dry-run", action="store_true", help="Affiche les prompts sans appeler l'API")
    parser.add_argument("--only", help="Génère uniquement un kind : avatar, cabine-0, cabine-1, cabine-2, cabine-3")
    parser.add_argument("--skip-upload", action="store_true", help="Génère en local, pas d'upload Supabase")
    args = parser.parse_args()

    if not GEMINI_API_KEY:
        log.error("GEMINI_API_KEY manquante dans .env")
        sys.exit(1)
    if not SUPABASE_URL or not SERVICE_ROLE:
        log.error("PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY requis dans .env")
        sys.exit(1)

    centre = get_centre(args.slug)
    if not centre:
        log.error(f"Centre introuvable : {args.slug}")
        sys.exit(1)
    centre_id = centre["id"]
    log.info(f"Centre : {centre['nom']} ({centre_id}) · plan={centre['plan']} · is_demo={centre['is_demo']}")

    if args.dry_run:
        for k, p in PROMPTS.items():
            if args.only and k != args.only:
                continue
            print(f"\n=== {k} ===\n{p}\n")
        return

    client = genai.Client(api_key=GEMINI_API_KEY)
    slug_dir = LOCAL_DIR / args.slug
    slug_dir.mkdir(parents=True, exist_ok=True)

    results = {}
    for name, prompt in PROMPTS.items():
        if args.only and name != args.only:
            continue
        out_path = slug_dir / f"{name}.webp"
        max_kb = MAX_AVATAR_KB if name == "avatar" else MAX_CABINE_KB
        ratio = AVATAR_RATIO if name == "avatar" else CABINE_RATIO
        webp = generate_and_save(client, prompt, args.model, ratio, out_path, max_kb)
        if webp:
            results[name] = (out_path, webp)

    if args.skip_upload:
        log.info("Skip upload Supabase (--skip-upload)")
        return

    # Upload Supabase
    avatar_url = None
    cabine_urls = []
    for name, (path, webp) in results.items():
        storage_name = "avatar.webp" if name == "avatar" else f"cabine-{name.split('-')[1]}.webp"
        url = upload_to_storage(centre_id, storage_name, webp)
        log.info(f"Uploadé {name} → {url}")
        if name == "avatar":
            avatar_url = url
        else:
            slot = int(name.split("-")[1])
            # Assure taille 4
            while len(cabine_urls) <= slot:
                cabine_urls.append(None)
            cabine_urls[slot] = url

    # Update DB
    final_cabine = [u for u in cabine_urls if u] if cabine_urls else None
    update_centre_photos(centre_id, avatar_url, final_cabine)
    log.info(f"DB mise à jour : avatar={bool(avatar_url)}, cabine_urls={len(final_cabine or [])}")


if __name__ == "__main__":
    main()

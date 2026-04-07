#!/usr/bin/env python3
"""
LeGuideAuditif — Generate 30s Homepage Video via Gemini Veo 3.1

Generates 4 clips of 8s each in French, then concatenates into a single
30s video for the homepage VideoExpert section.

Usage:
    python scripts/generate-homepage-video.py
    python scripts/generate-homepage-video.py --dry-run

Requires:
    pip install google-genai python-dotenv moviepy
    GEMINI_API_KEY in .env or environment
"""

import logging
import os
import sys
import time
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
    from moviepy import VideoFileClip, concatenate_videoclips
except ImportError:
    print("ERROR: moviepy required. Run: pip install moviepy")
    sys.exit(1)


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "videos" / "homepage"
MODEL = "veo-3.1-lite-generate-preview"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("homepage-videogen")

# ─── 4 clips en francais — scenes differentes ────────────────────────────

CLIPS = [
    {
        "filename": "clip-01-accueil.mp4",
        "prompt": (
            "Un audioprothesiste francais d'une cinquantaine d'annees, en blouse blanche, "
            "est assis dans un cabinet d'audioprothese moderne et lumineux. Il regarde la camera "
            "avec un sourire chaleureux et parle en francais d'un ton rassurant, comme s'il "
            "accueillait un patient. Il fait un geste d'invitation de la main droite. "
            "Derriere lui, on voit un audiometre et des appareils auditifs exposes. "
            "Lumiere naturelle douce, ambiance professionnelle et chaleureuse. "
            "Camera fixe en plan moyen. Audio en francais avec voix masculine posee. "
            "Format cinematique 16:9, haute qualite."
        ),
    },
    {
        "filename": "clip-02-explication.mp4",
        "prompt": (
            "Gros plan sur les mains d'un audioprothesiste francais en blouse blanche "
            "qui montre un appareil auditif miniature de type RIC a un patient senior "
            "de 70 ans assis en face de lui. L'audioprothesiste explique en francais "
            "le fonctionnement de l'appareil en le tenant delicatement. "
            "Le patient ecoute attentivement avec un air interesse. "
            "Lumiere chaude de cabinet medical, tons creme et bois. "
            "Leger mouvement de camera en travelling avant. "
            "Audio ambiance cabinet calme avec voix masculine en francais. "
            "Format cinematique 16:9, haute qualite."
        ),
    },
    {
        "filename": "clip-03-test.mp4",
        "prompt": (
            "Dans un cabinet d'audioprothese moderne en France, un audioprothesiste "
            "d'une cinquantaine d'annees en blouse blanche place delicatement "
            "un appareil auditif derriere l'oreille d'une patiente senior de 70 ans. "
            "La patiente sourit avec soulagement en entendant mieux. "
            "Lumiere naturelle douce depuis une fenetre. Tons chauds et accueillants. "
            "Camera en plan rapproche sur les visages. "
            "Audio en francais avec sons ambiants doux de cabinet medical. "
            "Format cinematique 16:9, haute qualite."
        ),
    },
    {
        "filename": "clip-04-satisfaction.mp4",
        "prompt": (
            "Un couple de seniors francais d'environ 70 ans dans un salon chaleureux "
            "et lumineux. La femme porte des appareils auditifs discrets. "
            "Ils discutent et rient ensemble assis sur un canape confortable. "
            "Le mari lui parle et elle entend parfaitement, visiblement heureuse. "
            "Lumiere dorée d'après-midi, ambiance familiale chaleureuse. "
            "Camera lente en leger travelling arriere. "
            "Audio ambiance domestique paisible avec voix en francais. "
            "Format cinematique 16:9, haute qualite."
        ),
    },
]

FINAL_FILENAME = "expert-presentation.mp4"


def generate_clip(client: genai.Client, prompt: str, output_path: Path) -> bool:
    """Generate a single 8s clip via Veo 3.1."""
    try:
        operation = client.models.generate_videos(
            model=MODEL,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1,
                duration_seconds=8,
            ),
        )

        log.info(f"  Operation: {operation.name}")

        poll_count = 0
        while not operation.done:
            time.sleep(15)
            poll_count += 1
            operation = client.operations.get(operation)
            log.info(f"  Poll #{poll_count}: processing...")
            if poll_count > 40:
                log.error("  Timeout!")
                return False

        if operation.response and operation.response.generated_videos:
            video = operation.response.generated_videos[0]
            video_data = client.files.download(file=video.video)
            with open(output_path, "wb") as f:
                f.write(video_data)
            size_mb = output_path.stat().st_size / (1024 * 1024)
            log.info(f"  Saved: {output_path.name} ({size_mb:.1f} MB)")
            return True
        else:
            log.error(f"  No video returned")
            if operation.error:
                log.error(f"  Error: {operation.error}")
            return False

    except Exception as e:
        log.error(f"  Generation failed: {e}")
        return False


def concatenate_clips(clip_paths: list[Path], output_path: Path) -> bool:
    """Concatenate multiple MP4 clips into one using moviepy."""
    try:
        log.info(f"Concatenating {len(clip_paths)} clips...")
        clips = [VideoFileClip(str(p)) for p in clip_paths]
        final = concatenate_videoclips(clips, method="compose")
        final.write_videofile(
            str(output_path),
            codec="libx264",
            audio_codec="aac",
            fps=24,
            logger=None,
        )
        for c in clips:
            c.close()
        final.close()
        size_mb = output_path.stat().st_size / (1024 * 1024)
        duration = sum(VideoFileClip(str(p)).duration for p in clip_paths)
        log.info(f"Final video: {output_path.name} ({size_mb:.1f} MB, ~{duration:.0f}s)")
        return True
    except Exception as e:
        log.error(f"Concatenation failed: {e}")
        return False


def main():
    dry_run = "--dry-run" in sys.argv

    env_path = PROJECT_ROOT / ".env"
    if load_dotenv and env_path.exists():
        load_dotenv(env_path)
        log.info(f"Loaded .env from {env_path}")

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key and not dry_run:
        log.error("GEMINI_API_KEY not found")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    final_path = OUTPUT_DIR / FINAL_FILENAME

    log.info(f"Model: {MODEL}")
    log.info(f"Clips: {len(CLIPS)} x 8s = ~32s")
    log.info(f"Estimated cost: ~$1.60 (4 x $0.40)")
    log.info("")

    if dry_run:
        for clip in CLIPS:
            log.info(f"[DRY RUN] {clip['filename']}")
            log.info(f"  Prompt: {clip['prompt'][:80]}...")
        return

    client = genai.Client(api_key=api_key)

    # Generate individual clips
    generated_paths: list[Path] = []
    for i, clip in enumerate(CLIPS):
        clip_path = OUTPUT_DIR / clip["filename"]
        log.info(f"{'='*50}")
        log.info(f"Clip {i+1}/{len(CLIPS)}: {clip['filename']}")

        if clip_path.exists():
            log.info(f"  Already exists, skipping generation")
            generated_paths.append(clip_path)
            continue

        ok = generate_clip(client, clip["prompt"], clip_path)
        if ok:
            generated_paths.append(clip_path)
        else:
            log.error(f"  FAILED — skipping this clip")

    if len(generated_paths) < 2:
        log.error("Not enough clips generated to concatenate")
        sys.exit(1)

    # Remove old final video if exists
    if final_path.exists():
        final_path.unlink()
        log.info(f"Removed old {FINAL_FILENAME}")

    # Concatenate
    log.info(f"\n{'='*50}")
    ok = concatenate_clips(generated_paths, final_path)
    if ok:
        log.info(f"\nDone! Final video: {final_path}")
    else:
        log.error("Failed to create final video")
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
LeGuideAuditif — Generate Homepage Video via Gemini Veo 3 API

Generates a hero video for the homepage VideoExpert section.

Usage:
    python scripts/generate-homepage-video.py
    python scripts/generate-homepage-video.py --dry-run

Requires:
    pip install google-genai python-dotenv
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


PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "public" / "videos" / "homepage"
MODEL = "veo-3.1-lite-generate-preview"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("homepage-videogen")

# ─── Video prompt ─────────────────────────────────────────────────────────

HERO_VIDEO_PROMPT = (
    "A male audiologist in his early 50s wearing a clean white medical coat "
    "sits at a desk in a modern audiology clinic. He faces the camera directly "
    "with a warm, friendly smile and speaks naturally, gesturing gently with "
    "his right hand as if explaining something important to a patient. "
    "Behind him: a professional audiometer, a sound booth with a glass window, "
    "and hearing aid display cases on shelves. "
    "Warm natural lighting from a window on the left creates soft shadows. "
    "The camera slowly pushes in from a medium shot to a medium close-up. "
    "Professional, trustworthy, welcoming healthcare atmosphere. "
    "Ambient sounds of a quiet medical office. "
    "Cinematic quality, shallow depth of field, 16:9 format."
)


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
    output_path = OUTPUT_DIR / "expert-presentation.mp4"

    if output_path.exists():
        log.info(f"Video already exists at {output_path}, skipping")
        return

    log.info(f"Model: {MODEL}")
    log.info(f"Prompt: {HERO_VIDEO_PROMPT[:100]}...")
    log.info(f"Output: {output_path}")
    log.info(f"Estimated cost: ~$0.40 (Veo 3.1 Lite, 8s)")

    if dry_run:
        log.info("[DRY RUN] Would generate video with above prompt")
        return

    client = genai.Client(api_key=api_key)

    log.info("Submitting video generation request...")

    try:
        operation = client.models.generate_videos(
            model=MODEL,
            prompt=HERO_VIDEO_PROMPT,
            config=types.GenerateVideosConfig(
                aspect_ratio="16:9",
                number_of_videos=1,
                duration_seconds=8,
            ),
        )

        log.info(f"Operation started: {operation.name}")
        log.info("Polling for completion (this may take 2-5 minutes)...")

        # Poll until done
        poll_count = 0
        while not operation.done:
            time.sleep(15)
            poll_count += 1
            operation = client.operations.get(operation)
            log.info(f"  Poll #{poll_count}: still processing...")

            if poll_count > 40:  # 10 min timeout
                log.error("Timeout: video generation took too long")
                sys.exit(1)

        log.info("Video generation complete!")

        # Download the video
        if operation.response and operation.response.generated_videos:
            video = operation.response.generated_videos[0]
            video_data = client.files.download(file=video.video)

            # Write video bytes
            with open(output_path, "wb") as f:
                f.write(video_data)

            size_mb = output_path.stat().st_size / (1024 * 1024)
            log.info(f"Saved: {output_path} ({size_mb:.1f} MB)")
            log.info("Done!")
        else:
            log.error("No video returned in operation response")
            if operation.error:
                log.error(f"Error: {operation.error}")
            sys.exit(1)

    except Exception as e:
        log.error(f"Video generation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()

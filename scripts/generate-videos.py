#!/usr/bin/env python3
"""
LeGuideAuditif — Automated Video Generation via Veo 3.1 API

Scans content directories for articles missing videos,
generates prompts based on article frontmatter, and calls
Veo 3.1 to produce hero videos + social shorts.

Usage:
    python scripts/generate-videos.py                    # scan & generate all missing
    python scripts/generate-videos.py --slug mon-article # generate for specific article
    python scripts/generate-videos.py --dry-run          # show what would be generated
    python scripts/generate-videos.py --model veo-3.1-generate-preview  # higher quality

Requires:
    pip install google-genai pyyaml
    GEMINI_API_KEY environment variable
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

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


# ─── Config ────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIRS = [
    PROJECT_ROOT / "src" / "content" / "guides",
    PROJECT_ROOT / "src" / "content" / "comparatifs",
]
VIDEO_OUTPUT_DIR = PROJECT_ROOT / "public" / "videos" / "blog"

# LeGuideAuditif Palette
PALETTE = {
    "marine": "#1B2E4A",
    "creme": "#F8F5F0",
    "orange": "#D97B3D",
    "blanc": "#FFFFFF",
}

# Video specs
DEFAULT_MODEL = "veo-3.1-lite-generate-preview"  # $0.05/s — cheapest
PREMIUM_MODEL = "veo-3.1-generate-preview"        # $0.15/s — higher quality
DEFAULT_DURATION = 8  # seconds
POLL_INTERVAL = 10    # seconds between status checks
MAX_POLL_TIME = 300   # 5 min max wait per video

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("lga-videogen")


# ─── Video Scene Library (LeGuideAuditif-specific) ────────────────────────

VIDEO_SCENES: dict[str, dict[str, str]] = {
    "perte-auditive": {
        "hero_video": (
            "A warm, softly lit hearing clinic. Camera slowly dollies toward an "
            "audiologist in a white coat sitting with an elderly patient. "
            "The audiologist gently places a hearing aid behind the patient's ear. "
            "The patient smiles with relief. Warm natural light from windows. "
            "Ambient sounds: quiet clinic, soft background music. "
            "Cinematic, empathetic, professional healthcare atmosphere. 8 seconds."
        ),
        "short_video": (
            "Close-up portrait of an elderly person cupping their ear, then "
            "an audiologist places a tiny hearing aid. The person's face lights up "
            "with a genuine smile of recognition. Shallow depth of field, warm tones. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "appareils-auditifs": {
        "hero_video": (
            "Elegant product shot: camera slowly orbits around modern hearing aids "
            "displayed on a clean surface. A hand gently picks one up and places it "
            "behind an ear model. The charging case LED glows softly. "
            "Warm studio lighting, shallow depth of field. "
            "Ambient sound: soft electronic hum, gentle click of case. 8 seconds."
        ),
        "short_video": (
            "Quick montage: hearing aid comes out of charging case, hand places it "
            "behind ear, person taps it to connect Bluetooth, smiles at phone screen "
            "showing music playing. Modern, clean aesthetic. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "acouphenes": {
        "hero_video": (
            "A person sits in a calm therapy room, puts on over-ear headphones. "
            "Camera slowly pushes in on their face as tension visibly releases. "
            "Soft ambient light, plants in background. "
            "Sound design: initial subtle ringing fades into peaceful nature sounds. "
            "Cinematic, calming, therapeutic atmosphere. 8 seconds."
        ),
        "short_video": (
            "Split screen effect: left side shows chaotic city noise visualization, "
            "right side shows person with headphones in peaceful setting. "
            "The calm side gradually takes over the whole frame. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "prevention": {
        "hero_video": (
            "Active senior couple walking through a sunlit park. Camera follows them "
            "from behind, then slowly moves to reveal their smiling faces in conversation. "
            "Small hearing aids visible behind one person's ears. Birds singing, "
            "leaves rustling. Warm golden hour light. Lifestyle, healthy, hopeful. 8 seconds."
        ),
        "short_video": (
            "Montage of hearing protection moments: person putting in earplugs "
            "at concert, wearing ear protection while mowing, turning down headphone "
            "volume. Ends with happy senior hearing clearly. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "remboursement": {
        "hero_video": (
            "Modern office: audiologist slides a clear cost breakdown document across "
            "the desk to a senior couple. Camera shows the document with highlighted "
            "reimbursement amounts. The couple nods, relieved. "
            "Carte Vitale visible on desk. Professional, reassuring atmosphere. "
            "Ambient office sounds. 8 seconds."
        ),
        "short_video": (
            "Animated-style overlay on real footage: hearing aid price tag appears, "
            "then Sécurité sociale logo covers part of it, then mutuelle covers more. "
            "Final remaining amount highlighted. Person smiles. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "vie-quotidienne": {
        "hero_video": (
            "Family dinner scene: camera slowly pans across a warm dining table "
            "with multiple generations. Grandfather with small hearing aids laughs "
            "at something a grandchild says. Natural evening home lighting, "
            "real dinner sounds, laughter. Heartwarming, emotional, genuine. 8 seconds."
        ),
        "short_video": (
            "Day-in-the-life montage: senior wakes up, puts in hearing aids, "
            "answers phone call, watches TV at normal volume, "
            "has conversation with neighbor. Ends with peaceful evening. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
    "comparatif": {
        "hero_video": (
            "Top-down shot of 5 hearing aids laid out in a row on navy surface. "
            "An audiologist's hand with a pen points to each model in sequence. "
            "Camera smoothly tracks the pen movement. Each model briefly highlighted "
            "by a warm light. Clinical precision meets warm presentation. "
            "Soft ambient sound. 8 seconds."
        ),
        "short_video": (
            "Quick cuts between different hearing aid models being placed "
            "behind an ear, each with a brief pause to show the device. "
            "Speed ramps between cuts. Modern, editorial style. "
            "Vertical 9:16 format. 8 seconds."
        ),
    },
}

DEFAULT_VIDEO_SCENE = {
    "hero_video": (
        "A welcoming hearing clinic entrance. Camera pushes through the door "
        "to reveal a bright, modern reception area. An audiologist warmly greets "
        "a senior patient. Natural light, plants, professional healthcare atmosphere. "
        "Ambient sounds: soft reception area, gentle greeting. 8 seconds."
    ),
    "short_video": (
        "Close-up of a modern hearing aid, then camera pulls back to reveal "
        "it being worn by a smiling senior. Warm lighting. "
        "Vertical 9:16 format. 8 seconds."
    ),
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
        return None
    try:
        return yaml.safe_load(match.group(1))
    except yaml.YAMLError as e:
        log.error(f"Invalid YAML in {filepath}: {e}")
        return None


# ─── Article Scanner ───────────────────────────────────────────────────────

def scan_articles(slug_filter: str | None = None) -> list[dict[str, Any]]:
    """Scan content directories for articles needing videos."""
    articles = []
    for content_dir in CONTENT_DIRS:
        if not content_dir.exists():
            continue
        collection_type = content_dir.name
        for filepath in sorted(content_dir.glob("**/*.md*")):
            if filepath.name.startswith("."):
                continue
            fm = parse_frontmatter(filepath)
            if not fm or fm.get("draft", False):
                continue
            slug = filepath.stem
            if slug_filter and slug != slug_filter:
                continue

            hero_path = VIDEO_OUTPUT_DIR / slug / f"{slug}.mp4"
            short_path = VIDEO_OUTPUT_DIR / slug / f"{slug}-short.mp4"
            needs_hero = not hero_path.exists()
            needs_short = not short_path.exists()

            if not needs_hero and not needs_short:
                continue

            category = fm.get("category", "")
            articles.append({
                "slug": slug,
                "title": fm.get("title", slug),
                "description": fm.get("description", ""),
                "category": category,
                "collection": collection_type,
                "is_comparatif": collection_type == "comparatifs",
                "filepath": str(filepath),
                "needs_hero": needs_hero,
                "needs_short": needs_short,
                "hero_path": str(hero_path),
                "short_path": str(short_path),
            })

    log.info(f"Found {len(articles)} article(s) needing videos")
    return articles


# ─── Prompt Builder ────────────────────────────────────────────────────────

def build_video_prompt(article: dict[str, Any], video_type: str) -> str:
    """Build a video prompt based on article category."""
    category = article["category"]
    if article["is_comparatif"]:
        scene = VIDEO_SCENES.get("comparatif", DEFAULT_VIDEO_SCENE)
    else:
        scene = VIDEO_SCENES.get(category, DEFAULT_VIDEO_SCENE)
    return scene.get(video_type, DEFAULT_VIDEO_SCENE[video_type])


# ─── Video Generator ──────────────────────────────────────────────────────

def generate_video(
    client: genai.Client,
    prompt: str,
    model: str,
    aspect_ratio: str = "16:9",
) -> bytes | None:
    """Call Veo API and return video bytes after polling."""
    try:
        log.info(f"  Submitting video generation request ({model})...")
        operation = client.models.generate_videos(
            model=model,
            prompt=prompt,
            config=types.GenerateVideosConfig(
                number_of_videos=1,
                aspect_ratio=aspect_ratio,
                person_generation="allow_all",
            ),
        )

        # Poll until done
        elapsed = 0
        while not operation.done:
            if elapsed >= MAX_POLL_TIME:
                log.error(f"  Timeout after {MAX_POLL_TIME}s")
                return None
            log.info(f"  Waiting... ({elapsed}s elapsed)")
            time.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL
            operation = client.operations.get(operation)

        log.info(f"  Video generated in {elapsed}s")

        if operation.response and operation.response.generated_videos:
            video = operation.response.generated_videos[0]
            return video.video.video_bytes
        else:
            log.warning("  No video returned by API")
            return None

    except Exception as e:
        log.error(f"  Veo API error: {e}")
        return None


def save_video(video_bytes: bytes, output_path: Path) -> bool:
    """Save video bytes to file."""
    try:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_bytes(video_bytes)
        size_mb = len(video_bytes) / (1024 * 1024)
        log.info(f"  Saved {output_path.name} ({size_mb:.1f}MB)")
        return True
    except Exception as e:
        log.error(f"  Error saving {output_path}: {e}")
        return False


# ─── Cost Estimator ────────────────────────────────────────────────────────

def estimate_cost(model: str, duration: int = DEFAULT_DURATION, count: int = 1) -> float:
    """Estimate cost in USD."""
    rates = {
        "veo-3.1-lite-generate-preview": 0.05,
        "veo-3.1-generate-preview": 0.15,
        "veo-3.1-fast-generate-preview": 0.15,
    }
    rate = rates.get(model, 0.05)
    return rate * duration * count


# ─── Main Pipeline ─────────────────────────────────────────────────────────

def run(args: argparse.Namespace) -> dict[str, Any]:
    """Main pipeline: scan → prompt → generate → save → report."""
    report = {
        "date": datetime.now().isoformat(),
        "model": args.model,
        "dry_run": args.dry_run,
        "generated": [],
        "errors": [],
        "cost_total_usd": 0.0,
    }

    articles = scan_articles(args.slug)
    if not articles:
        log.info("No articles need videos. Done.")
        return report

    # Estimate total cost
    total_videos = sum((1 if a["needs_hero"] else 0) + (1 if a["needs_short"] else 0) for a in articles)
    estimated_cost = estimate_cost(args.model, DEFAULT_DURATION, total_videos)
    log.info(f"Estimated cost: ${estimated_cost:.2f} for {total_videos} video(s)")

    if not args.dry_run and not args.force and estimated_cost > 5.0:
        log.warning(f"Cost exceeds $5.00. Use --force to proceed.")
        return report

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
        log.info(f"Processing: {slug} — {article['title']}")

        entry = {"slug": slug, "title": article["title"], "videos": []}

        # Hero video (16:9)
        if article["needs_hero"]:
            prompt = build_video_prompt(article, "hero_video")
            log.info(f"  HERO prompt: {prompt[:80]}...")
            cost = estimate_cost(args.model, DEFAULT_DURATION, 1)

            if args.dry_run:
                entry["videos"].append({
                    "type": "hero_video", "path": article["hero_path"],
                    "prompt": prompt, "cost_usd": cost,
                })
            else:
                video_bytes = generate_video(client, prompt, args.model, "16:9")
                if video_bytes:
                    if save_video(video_bytes, Path(article["hero_path"])):
                        entry["videos"].append({
                            "type": "hero_video", "path": article["hero_path"],
                            "cost_usd": cost,
                        })
                        report["cost_total_usd"] += cost
                    else:
                        report["errors"].append({"slug": slug, "type": "hero_video", "error": "save failed"})
                else:
                    report["errors"].append({"slug": slug, "type": "hero_video", "error": "API error"})

        # Short video (9:16) for social
        if article["needs_short"]:
            prompt = build_video_prompt(article, "short_video")
            log.info(f"  SHORT prompt: {prompt[:80]}...")
            cost = estimate_cost(args.model, DEFAULT_DURATION, 1)

            if args.dry_run:
                entry["videos"].append({
                    "type": "short_video", "path": article["short_path"],
                    "prompt": prompt, "cost_usd": cost,
                })
            else:
                video_bytes = generate_video(client, prompt, args.model, "9:16")
                if video_bytes:
                    if save_video(video_bytes, Path(article["short_path"])):
                        entry["videos"].append({
                            "type": "short_video", "path": article["short_path"],
                            "cost_usd": cost,
                        })
                        report["cost_total_usd"] += cost
                    else:
                        report["errors"].append({"slug": slug, "type": "short_video", "error": "save failed"})
                else:
                    report["errors"].append({"slug": slug, "type": "short_video", "error": "API error"})

        if entry["videos"]:
            report["generated"].append(entry)

    total_vids = sum(len(e["videos"]) for e in report["generated"])
    log.info(f"\n{'='*50}")
    log.info(f"DONE: {total_vids} video(s) for {len(report['generated'])} articles")
    log.info(f"Total cost: ${report['cost_total_usd']:.2f}")

    return report


def main():
    parser = argparse.ArgumentParser(
        description="LeGuideAuditif — Generate blog videos via Veo 3.1 API"
    )
    parser.add_argument("--slug", type=str, default=None, help="Generate for specific article")
    parser.add_argument("--dry-run", action="store_true", help="Show prompts without calling API")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL, help=f"Veo model (default: {DEFAULT_MODEL})")
    parser.add_argument("--report", type=str, default=None, help="Save JSON report to file")
    parser.add_argument("--force", action="store_true", help="Skip cost confirmation")
    parser.add_argument("--verbose", action="store_true", help="Debug logging")

    args = parser.parse_args()
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    report = run(args)

    if args.report:
        report_path = Path(args.report)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False))
        log.info(f"Report saved to {args.report}")

    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

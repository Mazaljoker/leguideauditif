#!/usr/bin/env python3
"""
LeGuideAuditif — Generate animated outro clip

Favicon grows from small to medium, then morphs into full logo.
4 seconds, marine background, smooth animation.

Usage:
    python scripts/generate-outro-clip.py
"""

import numpy as np
from pathlib import Path
from PIL import Image
from moviepy import VideoClip, ImageClip, CompositeVideoClip, concatenate_videoclips, VideoFileClip

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC = PROJECT_ROOT / "public"
VIDEO_DIR = PUBLIC / "videos" / "homepage"

# Video specs
WIDTH = 1280
HEIGHT = 720
FPS = 30
MARINE = (27, 46, 74)  # #1B2E4A


def load_image_rgba(path: Path, max_size: tuple[int, int] | None = None) -> Image.Image:
    """Load image as RGBA, optionally resize."""
    img = Image.open(path).convert("RGBA")
    if max_size:
        img.thumbnail(max_size, Image.LANCZOS)
    return img


def pil_to_array(img: Image.Image) -> np.ndarray:
    """Convert PIL RGBA image to numpy array."""
    return np.array(img)


def ease_out_cubic(t: float) -> float:
    """Cubic ease-out for smooth deceleration."""
    return 1 - (1 - t) ** 3


def ease_in_out_cubic(t: float) -> float:
    """Cubic ease-in-out."""
    if t < 0.5:
        return 4 * t * t * t
    else:
        return 1 - (-2 * t + 2) ** 3 / 2


def main():
    # Load assets
    favicon_pil = load_image_rgba(PUBLIC / "favicon.png")
    logo_pil = load_image_rgba(PUBLIC / "logo-leguideauditif.png")

    # Prepare logo at target size (fit in 600px wide)
    logo_target_w = 600
    logo_scale = logo_target_w / logo_pil.width
    logo_target_h = int(logo_pil.height * logo_scale)
    logo_resized = logo_pil.resize((logo_target_w, logo_target_h), Image.LANCZOS)
    logo_arr = pil_to_array(logo_resized)

    # Favicon target sizes
    favicon_start = 30   # starting size (small)
    favicon_mid = 180    # grown size
    favicon_arr_full = pil_to_array(favicon_pil)

    # Marine background
    bg = ImageClip(np.full((HEIGHT, WIDTH, 3), MARINE, dtype=np.uint8))

    # ─── Phase 1: Favicon grows (0s → 2s) ────────────────────────
    def make_favicon_frame(t):
        """Render favicon at current scale on marine bg."""
        canvas = np.full((HEIGHT, WIDTH, 4), (*MARINE, 255), dtype=np.uint8)

        progress = min(t / 2.0, 1.0)
        eased = ease_out_cubic(progress)
        size = int(favicon_start + (favicon_mid - favicon_start) * eased)

        if size < 2:
            return canvas[:, :, :3]

        fav = favicon_pil.resize((size, size), Image.LANCZOS)
        fav_arr = np.array(fav)

        # Center on canvas
        x = (WIDTH - size) // 2
        y = (HEIGHT - size) // 2

        # Alpha compositing
        alpha = fav_arr[:, :, 3:4].astype(np.float32) / 255.0
        h, w = fav_arr.shape[:2]

        # Clamp to canvas bounds
        y2, x2 = min(y + h, HEIGHT), min(x + w, WIDTH)
        h_clamp, w_clamp = y2 - max(y, 0), x2 - max(x, 0)
        if h_clamp <= 0 or w_clamp <= 0:
            return canvas[:, :, :3]

        sy, sx = max(-y, 0), max(-x, 0)
        dy, dx = max(y, 0), max(x, 0)

        region = canvas[dy:dy+h_clamp, dx:dx+w_clamp, :3].astype(np.float32)
        src = fav_arr[sy:sy+h_clamp, sx:sx+w_clamp, :3].astype(np.float32)
        a = alpha[sy:sy+h_clamp, sx:sx+w_clamp]

        blended = src * a + region * (1 - a)
        canvas[dy:dy+h_clamp, dx:dx+w_clamp, :3] = blended.astype(np.uint8)

        return canvas[:, :, :3]

    phase1 = VideoClip(make_favicon_frame, duration=2.0).with_fps(FPS)

    # ─── Phase 2: Crossfade favicon → logo (2s → 3.5s) ──────────
    def make_crossfade_frame(t):
        """Crossfade from centered favicon to centered logo."""
        canvas = np.full((HEIGHT, WIDTH, 3), MARINE, dtype=np.uint8)
        progress = min(t / 1.5, 1.0)
        eased = ease_in_out_cubic(progress)

        # Favicon fading out (shrinking slightly)
        fav_size = int(favicon_mid * (1 - eased * 0.3))
        fav_alpha_mult = 1.0 - eased

        if fav_size > 2 and fav_alpha_mult > 0.01:
            fav = favicon_pil.resize((fav_size, fav_size), Image.LANCZOS)
            fav_arr = np.array(fav)
            x = (WIDTH - fav_size) // 2
            y = (HEIGHT - fav_size) // 2
            alpha = (fav_arr[:, :, 3:4].astype(np.float32) / 255.0) * fav_alpha_mult
            h, w = fav_arr.shape[:2]
            y2, x2 = min(y + h, HEIGHT), min(x + w, WIDTH)
            h_c, w_c = y2 - max(y, 0), x2 - max(x, 0)
            if h_c > 0 and w_c > 0:
                sy, sx = max(-y, 0), max(-x, 0)
                dy, dx = max(y, 0), max(x, 0)
                region = canvas[dy:dy+h_c, dx:dx+w_c].astype(np.float32)
                src = fav_arr[sy:sy+h_c, sx:sx+w_c, :3].astype(np.float32)
                a = alpha[sy:sy+h_c, sx:sx+w_c]
                canvas[dy:dy+h_c, dx:dx+w_c] = (src * a + region * (1 - a)).astype(np.uint8)

        # Logo fading in (scaling up from 80% to 100%)
        logo_scale_anim = 0.8 + 0.2 * eased
        lw = int(logo_target_w * logo_scale_anim)
        lh = int(logo_target_h * logo_scale_anim)

        if lw > 2 and lh > 2 and eased > 0.01:
            logo_frame = logo_resized.resize((lw, lh), Image.LANCZOS)
            logo_frame_arr = np.array(logo_frame)
            x = (WIDTH - lw) // 2
            y = (HEIGHT - lh) // 2
            alpha = (logo_frame_arr[:, :, 3:4].astype(np.float32) / 255.0) * eased
            h, w = logo_frame_arr.shape[:2]
            y2, x2 = min(y + h, HEIGHT), min(x + w, WIDTH)
            h_c, w_c = y2 - max(y, 0), x2 - max(x, 0)
            if h_c > 0 and w_c > 0:
                sy, sx = max(-y, 0), max(-x, 0)
                dy, dx = max(y, 0), max(x, 0)
                region = canvas[dy:dy+h_c, dx:dx+w_c].astype(np.float32)
                src = logo_frame_arr[sy:sy+h_c, sx:sx+w_c, :3].astype(np.float32)
                a = alpha[sy:sy+h_c, sx:sx+w_c]
                canvas[dy:dy+h_c, dx:dx+w_c] = (src * a + region * (1 - a)).astype(np.uint8)

        return canvas

    phase2 = VideoClip(make_crossfade_frame, duration=1.5).with_fps(FPS)

    # ─── Phase 3: Logo hold (3.5s → 4.5s) ────────────────────────
    def make_logo_hold_frame(t):
        """Static logo centered on marine."""
        canvas = np.full((HEIGHT, WIDTH, 3), MARINE, dtype=np.uint8)
        x = (WIDTH - logo_target_w) // 2
        y = (HEIGHT - logo_target_h) // 2
        alpha = logo_arr[:, :, 3:4].astype(np.float32) / 255.0
        h, w = logo_arr.shape[:2]
        region = canvas[y:y+h, x:x+w].astype(np.float32)
        src = logo_arr[:, :, :3].astype(np.float32)
        canvas[y:y+h, x:x+w] = (src * alpha + region * (1 - alpha)).astype(np.uint8)
        return canvas

    phase3 = VideoClip(make_logo_hold_frame, duration=1.0).with_fps(FPS)

    # ─── Assemble outro ──────────────────────────────────────────
    outro = concatenate_videoclips([phase1, phase2, phase3])
    outro_path = VIDEO_DIR / "clip-05-outro.mp4"
    outro.write_videofile(str(outro_path), codec="libx264", fps=FPS, logger=None)
    outro.close()

    size_mb = outro_path.stat().st_size / (1024 * 1024)
    print(f"Outro saved: {outro_path} ({size_mb:.1f} MB, {outro.duration:.1f}s)")

    # ─── Reassemble full video with outro ────────────────────────
    clips = []
    for i in range(1, 5):
        p = VIDEO_DIR / f"clip-0{i}-{'accueil' if i==1 else 'explication' if i==2 else 'test' if i==3 else 'satisfaction'}.mp4"
        if p.exists():
            clips.append(VideoFileClip(str(p)))

    clips.append(VideoFileClip(str(outro_path)))

    final_path = VIDEO_DIR / "expert-presentation.mp4"
    if final_path.exists():
        final_path.unlink()

    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(str(final_path), codec="libx264", audio_codec="aac", fps=24, logger=None)

    total_duration = final.duration
    for c in clips:
        c.close()
    final.close()

    size_mb = final_path.stat().st_size / (1024 * 1024)
    print(f"Final video: {final_path.name} ({size_mb:.1f} MB, {total_duration:.0f}s)")


if __name__ == "__main__":
    main()

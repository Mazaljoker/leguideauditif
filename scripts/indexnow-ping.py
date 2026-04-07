#!/usr/bin/env python3
"""
IndexNow — Ping Bing/Yandex with all site URLs for instant indexing.

Usage:
    python scripts/indexnow-ping.py              # ping all URLs from sitemap
    python scripts/indexnow-ping.py --dry-run    # show URLs without pinging
"""

import argparse
import json
import re
import sys
import urllib.request
from pathlib import Path

SITE_URL = "https://leguideauditif.fr"
INDEXNOW_KEY = "26374fbe3ef54433984b93a37912255e"
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_DIR = PROJECT_ROOT / "dist"


def get_urls_from_sitemap() -> list[str]:
    """Extract URLs from built sitemap files."""
    urls = []
    for sitemap_file in sorted(DIST_DIR.glob("sitemap-*.xml")):
        if "index" in sitemap_file.name:
            continue
        text = sitemap_file.read_text(encoding="utf-8")
        urls.extend(re.findall(r"<loc>(https?://[^<]+)</loc>", text))
    return urls


def ping_indexnow(urls: list[str]) -> bool:
    """Submit URLs to IndexNow API."""
    payload = json.dumps({
        "host": "leguideauditif.fr",
        "key": INDEXNOW_KEY,
        "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
        "urlList": urls,
    }).encode("utf-8")

    req = urllib.request.Request(
        INDEXNOW_ENDPOINT,
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(f"IndexNow response: {resp.status} {resp.reason}")
            return resp.status in (200, 202)
    except Exception as e:
        print(f"IndexNow error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Ping IndexNow with site URLs")
    parser.add_argument("--dry-run", action="store_true", help="Show URLs without pinging")
    args = parser.parse_args()

    urls = get_urls_from_sitemap()
    if not urls:
        print("No URLs found in sitemap. Run 'npm run build' first.")
        sys.exit(1)

    print(f"Found {len(urls)} URLs in sitemap:\n")
    for url in urls:
        print(f"  {url}")

    if args.dry_run:
        print(f"\n[DRY RUN] Would ping IndexNow with {len(urls)} URLs.")
        return

    print(f"\nPinging IndexNow with {len(urls)} URLs...")
    success = ping_indexnow(urls)

    if success:
        print(f"\nIndexNow: {len(urls)} URLs submitted successfully.")
        print("Bing and Yandex will crawl these pages within minutes to hours.")
    else:
        print("\nIndexNow ping failed. URLs will still be indexed via sitemap (slower).")


if __name__ == "__main__":
    main()

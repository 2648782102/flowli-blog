#!/usr/bin/env python3
"""Download the TTF sources used by generate-site-fonts.mjs.

The Google Fonts CSS endpoint serves a full TTF when the caller does not
advertise a modern browser. Pinning that behaviour avoids depending on
third-party release mirrors, and the TTFs are never shipped to visitors.
"""
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE_DIR = ROOT / "work" / "fonts" / "sources"
FAMILIES = {
    "serif": ("Noto+Serif+SC:wght@500;600;700", [500, 600, 700]),
    "sans": ("Noto+Sans+SC:wght@400;500;600;700", [400, 500, 600, 700]),
}

SOURCE_DIR.mkdir(parents=True, exist_ok=True)

for family, (query, weights) in FAMILIES.items():
    css_url = f"https://fonts.googleapis.com/css2?family={query}&display=swap"
    with urllib.request.urlopen(css_url, timeout=30) as response:
        css = response.read().decode("utf-8")

    urls = {}
    for block in re.findall(r"@font-face\s*\{(.*?)\}", css, re.S):
        match_weight = re.search(r"font-weight:\s*(\d+)", block)
        match_url = re.search(r"url\((https://[^)]+)\)", block)
        if match_weight and match_url:
            urls[int(match_weight.group(1))] = match_url.group(1)

    for weight in weights:
        name = f"Noto{family.capitalize()}SC-{weight}.ttf"
        target = SOURCE_DIR / name
        if not target.exists():
            print(f"Downloading {name}")
            urllib.request.urlretrieve(urls[weight], target)
        print(f"{name}: {target.stat().st_size} bytes")

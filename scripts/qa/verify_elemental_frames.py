#!/usr/bin/env python3
"""Assert that real Chromium screenshots contain their elemental VFX signatures.

This catches invisible/blank effects and unexpected palettes even when the
combat event itself fired. It does NOT claim to measure artistic polish.
"""
import argparse
import json
from pathlib import Path

from PIL import Image

CHECKS = [
    ("09-agni-smash-heavy-contact", "fire", 900),
    ("09-vayu-green-gale-heavy-contact", "wind", 900),
    ("09-vajra-thunder-heavy-contact", "thunder", 150),
    ("10-smash-light-parashu", "any", 175),
    ("10-pillar-light-parashu", "any", 175),
    ("10-light-parashu", "any", 175),
    ("10-agneyastra-fire", "fire", 400),
    ("10-vayavyastra-wind", "wind", 650),
    ("10-vajrastra-thunder", "thunder", 150),
    ("10-varuna-water-dragon", "water", 500),
    ("10-guardian-heavy-contact", "fire", 600),
    ("13-execution-downward_crush", "fire", 600),
    ("13-execution-spin_360_cleave", "wind", 650),
    ("13-execution-impaling_lunge", "thunder", 80),
]


def count_signatures(filepath: Path) -> dict:
    with Image.open(filepath) as source:
        img = source.convert("HSV")
        w, h = img.size
        # HUD, menus and corner torches are excluded. The area includes
        # Rudra's blade and the struck enemy, not unrelated UI highlights.
        roi = img.crop((int(w * 0.30), int(h * .27), int(w * .86), int(h * .74)))
        counts = {key: 0 for key in ("fire", "wind", "water", "thunder", "any")}
        for hue, sat, val in roi.getdata():
            if sat < 160 or val < 192:
                continue
            counts["any"] += 1
            if hue <= 28 or hue >= 246:
                counts["fire"] += 1
            if 58 <= hue <= 122:
                counts["wind"] += 1
            if 125 <= hue <= 184:
                counts["water"] += 1
            if 28 <= hue <= 59 or 125 <= hue <= 184:
                counts["thunder"] += 1
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    folder = args.directory
    passed = True
    results = []
    for stem, palette, minimum in CHECKS:
        path = next(
            (p for p in (folder / (stem + ext) for ext in (".png", ".jpg")) if p.exists()),
            None,
        )
        if path is None:
            entry = {"attack": stem, "passed": False, "error": "missing screenshot"}
            passed = False
        else:
            counts = count_signatures(path)
            count = counts[palette]
            entry = {
                "attack": stem,
                "palette": palette,
                "bright_pixels": count,
                "min_required": minimum,
                "passed": count >= minimum,
                "file": path.name,
            }
            passed = passed and entry["passed"]
        print("{} {}: {}".format("PASS" if entry["passed"] else "FAIL", stem, entry))
        results.append(entry)
    manifest = {
        "passed": passed, "count": len(results), "results": results,
        "note": "Color-signature liveness only; artistic quality and M3 Air frame time require visual playtesting.",
    }
    (folder / "visual-signature-report.json").write_text(json.dumps(manifest, indent=2))
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())

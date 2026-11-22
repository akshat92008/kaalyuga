#!/usr/bin/env python3
"""Reject the oversized neon-magenta cage that obscured Dundubhi's boss entrance.

This checks one explicit known visual regression rather than pretending color
thresholds alone establish AAA-quality cinematography.
"""
from pathlib import Path
from PIL import Image
import json
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('artifacts/act1-phase1-4')
source = next((root / f'11-live-dundubhi-boss-entrance.{ext}' for ext in ('png', 'jpg')
               if (root / f'11-live-dundubhi-boss-entrance.{ext}').exists()), None)
if source is None:
    raise SystemExit('FAIL: no rendered Dundubhi entrance frame')

im = Image.open(source).convert('RGB')
w, h = im.size
# Crop to the fight's center/right; deliberately exclude the UI at top/bottom.
roi = im.crop((round(w * 0.52), round(h * 0.18), round(w * 0.95), round(h * 0.77)))
hot_magenta = sum(
    1 for r, g, b in roi.getdata()
    if r > 210 and b > 180 and g < 150
)
max_allowed = 420  # Older giant cage registered >1500 pixels in this region.
report = {
    'passed': hot_magenta <= max_allowed,
    'source': source.name,
    'hot_magenta_pixels': hot_magenta,
    'threshold': max_allowed,
    'note': 'Checks giant magenta geometry only; this is not an artistic approval.',
}
(root / 'boss-entrance-visual-regression.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
if not report['passed']:
    raise SystemExit('FAIL: giant neon-magenta boss cage still visible')

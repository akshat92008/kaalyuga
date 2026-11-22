#!/usr/bin/env python3
"""Build an offline visual-review index for existing Kaliyuga gameplay QA artifacts.

Does not modify gameplay, rerun the game, or claim aesthetic approval. Reads the
browser smoke screenshots and reports as evidence, and leaves the originals intact.

Usage:
    python3 scripts/qa/build_director_review.py artifacts/act1-phase1-4
"""

import argparse
import html
import json
from pathlib import Path
from urllib.parse import quote

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}


def read_json(path):
    if not path.is_file():
        return None
    with path.open("r", encoding="utf-8") as file:
        value = json.load(file)
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object in {path}")
    return value


def escape(value):
    return html.escape(str(value), quote=True)


def category(name):
    stem = Path(name).stem
    if stem.startswith(("01-", "02-")):
        return "Opening / baseline"
    if stem.startswith(("03-", "04-", "05-", "06-", "07-")):
        return "Cinematic lab"
    if stem.startswith(("08-", "09-", "10-")):
        return "Live combat / VFX"
    if stem.startswith(("11-", "12-")):
        return "Live boss entrance"
    if stem.startswith("13-"):
        return "Executions"
    return "Other / failure evidence"


def evidence(folder):
    browser = read_json(folder / "browser-verification.json")
    visual = read_json(folder / "visual-signature-report.json")
    images = sorted(p.name for p in folder.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES)
    announced = browser.get("screenshots", []) if browser is not None else []
    if not isinstance(announced, list) or any(not isinstance(n, str) for n in announced):
        raise ValueError("browser-verification.json screenshots must be an array of filenames")
    missing = [name for name in announced if name not in images]
    failures = browser.get("screenshotFailures", []) if browser is not None else []
    if not isinstance(failures, list):
        raise ValueError("screenshotFailures must be an array")
    browser_ok = (
        browser is not None
        and browser.get("passed") is True
        and browser.get("visualCoverageComplete") is True
        and not missing
        and not failures
        and len(announced) > 0
    )
    visual_checks = visual.get("results", []) if visual is not None else []
    if not isinstance(visual_checks, list):
        raise ValueError("visual-signature-report.json results must be an array")
    visual_ok = visual is not None and visual.get("passed") is True and len(visual_checks) > 0 and all(
        isinstance(x, dict) and x.get("passed") is True for x in visual_checks
    )
    result = {
        "browser_smoke_status": "PASS" if browser_ok else "INCOMPLETE_OR_FAILED",
        "pixel_signature_status": "PASS" if visual_ok else ("INCOMPLETE_OR_FAILED" if visual else "NOT_RUN"),
        "screenshot_count": len(images),
        "declared_screenshot_count": len(announced),
        "missing_declared_screenshots": missing,
        "screenshot_capture_failures": failures,
        "human_visual_approval": "NOT_REVIEWED",
        "limitations": [
            "Pixel-color checks prove effect presence, not visual quality or attack-to-blade alignment.",
            "Offline screenshots do not prove frame pacing, animations, audio, or M3 Air performance.",
            "Human director review of moving gameplay footage is required for final approval.",
        ],
    }
    return result, images, announced, visual_checks


def render_html(status, images, announced, visual_checks):
    visual_by_stem = {
        x.get("attack"): x for x in visual_checks if isinstance(x, dict) and isinstance(x.get("attack"), str)
    }
    order = list(dict.fromkeys([*announced, *images]))
    order = [n for n in order if n in images]
    grouped = {}
    for name in order:
        grouped.setdefault(category(name), []).append(name)
    cards = []
    for group, filenames in grouped.items():
        cards.append(f'<h2>{escape(group)} · {len(filenames)} screenshots</h2><section class="grid">')
        for name in filenames:
            image_url = quote(name, safe="")
            signature = visual_by_stem.get(Path(name).stem)
            label = "No pixel-signature test"
            if signature is not None:
                label = ("Signature PASS" if signature.get("passed") is True else "Signature FAIL") + (
                    f" · {signature.get('palette', 'unknown')} · {signature.get('bright_pixels', '?')} pixels"
                )
            cards.append(
                '<article><a href="' + image_url + '"><img loading="lazy" alt="' + escape(name) +
                '" src="' + image_url + '"></a><div class="body"><strong>' + escape(name) +
                '</strong><small>' + escape(label) +
                '</small><p>Review: weapon alignment · effect readability · subject framing · silhouette/clipping</p>' +
                '<label>Director notes<textarea placeholder="Observed defects / required changes"></textarea></label></div></article>'
            )
        cards.append('</section>')
    if not images:
        cards.append('<p>No screenshots found. Visual approval is not possible.</p>')
    browser = escape(status["browser_smoke_status"])
    pixels = escape(status["pixel_signature_status"])
    count = status["screenshot_count"]
    declared = status["declared_screenshot_count"]
    missing = " · ".join(status["missing_declared_screenshots"]) or "None"
    fails = " · ".join(str(x) for x in status["screenshot_capture_failures"]) or "None"
    return f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kaliyuga · Director visual evidence review</title>
<style>
:root {{ color-scheme: dark; }} body {{ background:#131315; color:#ece9e2; font-family:system-ui, sans-serif; margin:auto; max-width:1500px; padding:24px; }}
h1 {{ margin: 0 0 12px; }} h2 {{ border-bottom:1px solid #4b4140; padding-bottom:8px; margin-top:32px; }}
.summary {{ display:flex; flex-wrap:wrap; gap:12px; }} .metric {{ border:1px solid #524744; border-radius:8px; padding:14px; min-width:220px; background:#231f20; }}
.metric strong {{ display:block; font-size:1.05rem; margin-top:6px; }} .warning {{ border-left:4px solid #c48b53; padding:10px 16px; background:#282322; }}
.grid {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:16px; }}
article {{ background:#201f22; border:1px solid #4e4647; border-radius:8px; overflow:hidden; }}
article img {{ width:100%; display:block; aspect-ratio:16 / 9; object-fit:contain; background:#080808; }}
.body {{ padding:14px; }} .body strong {{ display:block; overflow-wrap:anywhere; }} small {{ display:block; color:#c8b59f; margin-top:6px; }}
textarea {{ width:100%; box-sizing:border-box; min-height:66px; margin-top:8px; background:#161517; color:white; border:1px solid #655c58; border-radius:4px; padding:8px; }}
label {{ display:block; font-size:0.9rem; }} p {{ line-height:1.5; }} a {{ color:#d8b68b; }}
@media print {{ textarea {{ border:1px solid black; }} body {{ background:white; color:black; }} article {{ break-inside:avoid; }} }}
</style></head><body>
<h1>KALIYUGA · Director visual evidence review</h1>
<p>Independent review index for existing Chromium gameplay evidence. This does not edit the game and does not certify premium or AAA aesthetics.</p>
<div class="summary"><div class="metric">Browser evidence<strong>{browser}</strong></div>
<div class="metric">Elemental pixel-signature checks<strong>{pixels}</strong></div>
<div class="metric">Screenshots available<strong>{count} / {declared} declared</strong></div>
<div class="metric">Human visual approval<strong>NOT REVIEWED</strong></div></div>
<p>Missing declared screenshots: {escape(missing)}. Capture failures: {escape(fails)}.</p>
<div class="warning"><b>Release gate:</b> Color-signature tests indicate effect presence, not beauty, blade alignment, motion, audio, or GPU performance.
Review moving footage on the target hardware before approving any phase. Notes in this file are not automatically saved; copy them to your review report.</div>
{''.join(cards)}
</body></html>'''


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path, help="Existing screenshot artifact directory")
    args = parser.parse_args(argv)
    folder = args.folder.resolve()
    if not folder.is_dir():
        parser.error(f"Not a directory: {folder}")
    status, images, announced, signatures = evidence(folder)
    (folder / "director-review.html").write_text(render_html(status, images, announced, signatures), encoding="utf-8")
    (folder / "director-review-summary.json").write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(status, indent=2))
    return 0 if status["browser_smoke_status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

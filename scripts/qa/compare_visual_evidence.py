#!/usr/bin/env python3
"""Non-mutating Kaliyuga Phase 13 before/after screenshot evidence comparator.

This is *not* an aesthetic or gameplay acceptance test. Only compares images
with the same capture stem, checks dimensions, and reports where pixels changed.
Capture timestamps/camera position must be aligned for comparisons to be useful.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def image_index(folder):
    result = {}
    for path in sorted(folder.iterdir()):
        if not path.is_file() or path.suffix.lower() not in EXTS:
            continue
        stem = path.stem
        if stem not in result or (path.suffix.lower() == ".png" and result[stem].suffix.lower() != ".png"):
            result[stem] = path
    return result


def compare_pair(old_path, new_path, diff_path, change_threshold=20):
    if not 0 <= change_threshold <= 255:
        raise ValueError("change_threshold must be in [0, 255]")
    with Image.open(old_path) as old_src, Image.open(new_path) as new_src:
        old = old_src.convert("RGB")
        new = new_src.convert("RGB")
    if old.size != new.size:
        return {"status": "size_mismatch", "before_dimensions": old.size, "after_dimensions": new.size}
    delta = ImageChops.difference(old, new)
    stats = ImageStat.Stat(delta)
    mean_abs = sum(stats.mean) / 3
    mono = delta.convert("L")
    hist = mono.histogram()
    changed = sum(hist[change_threshold + 1:])
    total = old.width * old.height
    # Amplify small changes only for reviewing changed areas; not a visual quality score.
    delta.point(lambda x: min(255, x * 3)).save(diff_path)
    return {
        "status": "compared",
        "dimensions": list(old.size),
        "mean_absolute_rgb_difference": round(mean_abs, 3),
        "changed_pixels_above_threshold": changed,
        "changed_percent": round(100 * changed / total, 3) if total else 0,
        "threshold_grayscale": change_threshold,
        "diff_image": diff_path.name,
    }


def audit(before, after, output, threshold=20):
    originals = image_index(before)
    candidates = image_index(after)
    output.mkdir(parents=True, exist_ok=True)
    results = []
    for stem in sorted(originals.keys() & candidates.keys()):
        name = stem + ".png"
        details = compare_pair(originals[stem], candidates[stem], output / name, threshold)
        results.append({"stem": stem, "before": originals[stem].name,
                        "after": candidates[stem].name, **details})
    report = {
        "scope": "pixel-level before/after evidence only, not proof of artistic polish or FPS",
        "compared_count": sum(x["status"] == "compared" for x in results),
        "size_mismatches": sum(x["status"] == "size_mismatch" for x in results),
        "only_in_before": sorted(originals.keys() - candidates.keys()),
        "only_in_after": sorted(candidates.keys() - originals.keys()),
        "results": results,
        "human_visual_approval": "NOT_REVIEWED",
        "cautions": [
            "Changing scene timing, character position, lighting, or camera may produce high pixel differences without a regression.",
            "Small pixel changes cannot prove weapon synchronization or player input responsiveness.",
            "Compare same camera, resolution, frame timing and game state, then inspect the diff PNGs manually.",
        ],
    }
    (output / "comparison-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    return report


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--before", type=Path, required=True)
    p.add_argument("--after", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-comparison"))
    p.add_argument("--threshold", type=int, default=20)
    args = p.parse_args(argv)
    if not args.before.is_dir() or not args.after.is_dir():
        p.error("Before and after must be existing screenshot directories")
    if not 0 <= args.threshold <= 255:
        p.error("Threshold must be between 0 and 255")
    result = audit(args.before, args.after, args.output_dir, args.threshold)
    print(f"Phase13 screenshot comparator: {result['compared_count']} compared, "
          f"{result['size_mismatches']} size mismatches, "
          f"{len(result['only_in_before'])} old-only, "
          f"{len(result['only_in_after'])} new-only.")
    if result["compared_count"] == 0:
        print("No comparable screenshots; no visual comparison can be claimed.")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Read-only dimensions and theoretical RGBA8 memory of game textures.

Pillow opens local headers but does not resize or re-save images. Reported GPU
estimates are illustrative upper-order RGBA8 allocations, NOT measured VRAM
or the browser engine's actual texture format/mipmap residency.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, UnidentifiedImageError

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
MIB = 1024**2


def probe(path):
    result = {"path": str(path), "source_bytes": path.stat().st_size}
    try:
        with Image.open(path) as img:
            width, height = img.size
            mode, fmt = img.mode, img.format
        if width <= 0 or height <= 0:
            raise ValueError("invalid image size")
        rgba8 = width*height*4
        result.update({
            "status": "readable",
            "width": width, "height": height,
            "format": fmt, "mode": mode,
            "decoded_rgba8_mib": round(rgba8/MIB, 3),
            "rgba8_with_full_mip_chain_mib": round(rgba8*4/3/MIB, 3),
            "dimension_review": width > 4096 or height > 4096,
        })
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        result.update({"status": "unreadable", "reason": str(exc)[:200]})
    return result


def audit(folders):
    files = sorted({
        f.resolve()
        for folder in folders if folder.is_dir()
        for f in folder.rglob("*")
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS
    })
    results = [probe(p) for p in files]
    good = [x for x in results if x["status"] == "readable"]
    return {
        "scope": "locally checked-out image dimensions; illustrative uncompressed RGBA8 sizes",
        "images_scanned": len(results),
        "readable": len(good),
        "unreadable": [x for x in results if x["status"] != "readable"],
        "highest_uncompressed_candidates": sorted(good, key=lambda x: -x["decoded_rgba8_mib"])[:30],
        "sum_single_rgba8_mib_assuming_all_resident": round(sum(x["width"]*x["height"]*4 for x in good)/MIB, 2),
        "images": results,
        "limitations": [
            "Most assets are not resident simultaneously; sum is NOT an actual game memory measurement.",
            "WebGL formats, runtime downscaling, mip generation, compression, and loading strategy can change true usage.",
            "Theoretical RGBA8 is a diagnostic comparison, not grounds to downgrade visual resolution automatically.",
            "No changes to source images or game code were performed.",
        ],
    }


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--directories", nargs="+", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independent"))
    p.add_argument("--minimum-files", type=int, default=1)
    args = p.parse_args(argv)
    result = audit(args.directories)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir/"texture-dimensions.json").write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
    lines = [
        "# Kaliyuga Phase 12 — decoded texture cost candidates",
        "", f"- Files scanned: {result['images_scanned']}",
        f"- Header readable: {result['readable']}",
        f"- Sum of single RGBA8 estimates if all loaded: {result['sum_single_rgba8_mib_assuming_all_resident']} MiB (NOT actual VRAM)",
        "", "| Path | Dimensions | Source MiB | RGBA8 MiB |",
        "|---|---:|---:|---:|",
    ]
    for image in result["highest_uncompressed_candidates"][:30]:
        path = image["path"].replace("|", chr(92)+"|")
        lines.append(f"| {path} | {image['width']}×{image['height']} | "
                     f"{image['source_bytes']/MIB:.2f} | {image['decoded_rgba8_mib']:.2f} |")
    lines += ["", "This report is not an actual GPU memory or FPS benchmark.", ""]
    (args.output_dir/"texture-dimensions.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Texture probe: {result['readable']}/{result['images_scanned']} readable; "
          f"{result['sum_single_rgba8_mib_assuming_all_resident']} MiB hypothetical RGBA8 sum")
    if result["images_scanned"] < args.minimum_files:
        print(f"Not enough materialized images: {result['images_scanned']} < {args.minimum_files}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

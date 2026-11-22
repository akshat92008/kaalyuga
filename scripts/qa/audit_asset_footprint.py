#!/usr/bin/env python3
"""Non-mutating Kaliyuga Phase 12 tracked-asset footprint audit.

Reads Git tree metadata, including entries not materialized by sparse checkout.
Size numbers are *tracked source bytes*, NOT browser transfer sizes, VRAM usage,
actual FPS, or disk size after Git blob deduplication.
"""
import argparse
from collections import defaultdict
from dataclasses import asdict, dataclass
import json
from pathlib import Path
import subprocess

MEDIA_TYPES = {
    ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image",
    ".gif": "image", ".ktx": "image", ".ktx2": "image",
    ".mp4": "video", ".webm": "video", ".mov": "video",
    ".fbx": "model", ".glb": "model", ".gltf": "model", ".blend": "model",
    ".wav": "audio", ".mp3": "audio", ".ogg": "audio", ".flac": "audio", ".m4a": "audio",
}
WARNING_MIB = {
    ".png": 8, ".jpg": 8, ".jpeg": 8, ".webp": 8,
    ".fbx": 20, ".glb": 20, ".mp4": 10, ".webm": 10, ".wav": 5, ".mp3": 5,
}
MIB = 1024 * 1024


@dataclass(frozen=True)
class Asset:
    path: str
    sha: str
    size: int
    ext: str
    category: str
    location: str


def parse_ls_tree(blob):
    """Parse null-delimited git ls-tree -r -l -z output; paths may contain tabs/spaces."""
    out = []
    for record in blob.split(b"\0"):
        if not record:
            continue
        head, sep, raw_path = record.partition(b"\t")
        if not sep:
            raise ValueError("Git tree record has no tab separator")
        items = head.split(b" ")
        if len(items) != 4:
            raise ValueError("Invalid Git tree record")
        mode, kind, sha, size = items
        if kind != b"blob" or size == b"-":
            continue
        path = raw_path.decode("utf-8", "surrogateescape")
        ext = Path(path).suffix.lower()
        if ext not in MEDIA_TYPES:
            continue
        out.append(Asset(
            path=path, sha=sha.decode("ascii"), size=int(size),
            ext=ext, category=MEDIA_TYPES[ext],
            location="public/" if path.startswith("public/") else "repo / alias or source",
        ))
    return out


def parse_github_tree(payload):
    """GitHub recursive-tree API includes blob byte sizes without fetching any binary files."""
    if payload.get("truncated") is not False:
        raise ValueError("GitHub tree missing or truncated; refusing incomplete inventory")
    entries = payload.get("tree")
    if not isinstance(entries, list):
        raise ValueError("GitHub tree response has no entries")
    out = []
    for item in entries:
        if item.get("type") != "blob":
            continue
        path, sha, size = item.get("path"), item.get("sha"), item.get("size")
        if not isinstance(path, str) or not isinstance(sha, str) or not isinstance(size, int):
            raise ValueError("Invalid GitHub blob entry or missing byte size")
        ext = Path(path).suffix.lower()
        if ext in MEDIA_TYPES:
            out.append(Asset(path, sha, size, ext, MEDIA_TYPES[ext],
                             "public/" if path.startswith("public/") else "repo / alias or source"))
    return out


def read_assets(rev="HEAD", repo=".", tree_json=None):
    if tree_json is not None:
        return parse_github_tree(json.loads(Path(tree_json).read_text(encoding="utf-8")))
    raw = subprocess.run(
        ["git", "-C", str(repo), "ls-tree", "-r", "-l", "-z", rev],
        check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    ).stdout
    return parse_ls_tree(raw)


def summarize(assets, top_n=30):
    by_type = defaultdict(lambda: {"count": 0, "bytes": 0})
    by_category = defaultdict(lambda: {"count": 0, "bytes": 0})
    by_location = defaultdict(lambda: {"count": 0, "bytes": 0})
    by_sha = defaultdict(list)
    warnings = []
    total_bytes = 0
    for asset in assets:
        total_bytes += asset.size
        for d, key in ((by_type, asset.ext), (by_category, asset.category), (by_location, asset.location)):
            d[key]["count"] += 1
            d[key]["bytes"] += asset.size
        by_sha[asset.sha].append(asset)
        threshold = WARNING_MIB.get(asset.ext)
        if threshold is not None and asset.size >= threshold * MIB:
            warnings.append({"path": asset.path, "size_bytes": asset.size,
                             "rule": f"{asset.ext} ≥ {threshold} MiB", "requires_in_game_review": True})
    duplicate_groups = [
        {"sha": sha, "paths": [a.path for a in group], "source_bytes_each": group[0].size}
        for sha, group in by_sha.items() if len(group) > 1
    ]
    return {
        "scope": "tracked media source tree (Git blob sizes); not delivered payload or measured GPU cost",
        "asset_count": len(assets), "total_source_bytes_with_paths_counted": total_bytes,
        "by_extension": dict(sorted(by_type.items())),
        "by_category": dict(sorted(by_category.items())),
        "by_location": dict(sorted(by_location.items())),
        "largest_assets": [asdict(x) for x in sorted(assets, key=lambda a: (-a.size, a.path))[:top_n]],
        "size_review_candidates": sorted(warnings, key=lambda x: (-x["size_bytes"], x["path"])),
        "identical_git_blob_groups": sorted(duplicate_groups, key=lambda x: -x["source_bytes_each"]),
        "cautions": [
            "Many assets outside public/ are intentionally served through the static-asset proxy.",
            "Identical Git blob SHA paths do not imply duplicate storage inside Git; do not subtract their sizes as savings.",
            "Not every tracked asset is requested by a normal Act I playthrough.",
            "No compression, re-encoding, deletion, rendering or runtime changes were made.",
            "Runtime network/VRAM/thermal/FPS measurements need a real game session on target hardware.",
        ],
    }


def markdown(report):
    out = [
        "# Kaliyuga Phase 12 — tracked asset footprint (static audit)",
        "",
        "**Scope:** repository Git-tree sizes, not live memory, runtime transfer or measured performance.",
        "",
        f"- Tracked media paths: **{report['asset_count']}**",
        f"- Total media bytes counted across paths: **{report['total_source_bytes_with_paths_counted'] / MIB:.1f} MiB**",
        f"- Large-file review candidates: **{len(report['size_review_candidates'])}**",
        f"- Identical Git blob SHA groups: **{len(report['identical_git_blob_groups'])}**",
        "",
        "## By category",
        "",
        "| Category | Files | Source MiB |",
        "|---|---:|---:|",
    ]
    for kind, v in report["by_category"].items():
        out.append(f"| {kind} | {v['count']} | {v['bytes']/MIB:.1f} |")
    out.extend(["", "## Largest paths", "",
                "| Path | MiB |", "|---|---:|"])
    for a in report["largest_assets"][:20]:
        safe_path = a["path"].replace("|", chr(92) + "|")
        out.append(f"| \`{safe_path}\` | {a['size']/MIB:.1f} |")
    out.extend(["", "## Caveats", ""])
    out.extend("- " + p for p in report["cautions"])
    out.append("")
    return "\n".join(out)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo", default=".")
    p.add_argument("--revision", default="HEAD")
    p.add_argument("--tree-json", type=Path, help="GitHub recursive tree API JSON; avoids media download")
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independence"))
    args = p.parse_args(argv)
    assets = read_assets(args.revision, args.repo, args.tree_json)
    if not assets:
        p.error("No tracked media files; repository/tree missing or sparse metadata incomplete")
    report = summarize(assets)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "asset-inventory.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    (args.output_dir / "asset-inventory.md").write_text(markdown(report), encoding="utf-8")
    print(f"Phase12 asset audit: {report['asset_count']} paths, {len(report['size_review_candidates'])} review candidates, reports in {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

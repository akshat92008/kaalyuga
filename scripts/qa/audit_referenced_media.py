#!/usr/bin/env python3
"""Read-only Phase 12: rank game-referenced assets using tracked source sizes.

This is static visibility, not runtime request telemetry. Direct public paths
and deliberate CLEAN_ASCII_REPO_MAP aliases count as source-resolved. Other
special routes are flagged for review, never falsely declared 404s.
"""
import argparse
from collections import Counter, defaultdict
import json
from pathlib import Path
import re

from audit_asset_footprint import read_assets
from audit_audio_delivery import extract_aliases

ASSET_PREFIXES = (
    "assets", "audio", "kaalyuga", "videos", "images",
    "models", "models_v2", "cutscenes", "vfx", "animations", "new_3d_assets",
)
ASSET_PATTERN = re.compile(
    r"""(?P<quote>['"])(?P<url>/(?:assets|audio|kaalyuga|videos|images|models|models_v2|cutscenes|vfx|animations|new_3d_assets)/[^'"\r\n]{1,260})(?P=quote)"""
)
SCAN_FOLDERS = ("lib", "components", "app")
SOURCE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ktx", ".ktx2",
    ".fbx", ".glb", ".gltf", ".mp4", ".webm", ".mov",
    ".wav", ".mp3", ".ogg", ".m4a", ".flac",
}
HIGH_VALUE_FILES = {
    "components/game/KaliyugaArena.tsx",
    "lib/game/assets.ts",
    "lib/game/audio.ts",
    "lib/game/boss3dRenderer.ts",
    "lib/game/rudra3dRenderer.ts",
    "lib/game/enemy3dRenderer.ts",
}


def scan_literals(root):
    by_url = defaultdict(set)
    code_files = 0
    for folder in SCAN_FOLDERS:
        base = root / folder
        if not base.is_dir():
            continue
        for file in base.rglob("*"):
            if not file.is_file() or file.suffix.lower() not in {".ts", ".tsx", ".js", ".jsx"}:
                continue
            code_files += 1
            try:
                source = file.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                continue
            for match in ASSET_PATTERN.finditer(source):
                url = match.group("url")
                if Path(url.split("?", 1)[0]).suffix.lower() not in SOURCE_EXTENSIONS:
                    continue
                by_url[url].add(file.relative_to(root).as_posix())
    return by_url, code_files


def inspect_reference(url, aliases, asset_sizes):
    """Verify source-path presence, not whether the browser can load this URL."""
    name = url.split("?", 1)[0].split("/")[-1]
    actual = aliases.get(name)
    if actual in asset_sizes:
        return ("mapped_source_present", actual, asset_sizes[actual])
    direct = "public/" + url.split("?", 1)[0].lstrip("/")
    if direct in asset_sizes:
        return ("direct_source_present", direct, asset_sizes[direct])
    if actual:
        return ("mapped_source_missing", actual, None)
    return ("route_or_dynamic_resolution_needed", None, None)


def audit(root, assets, aliases):
    refs, code_count = scan_literals(root)
    sizes = {a.path: a.size for a in assets}
    rows = []
    for url in sorted(refs):
        status, source, size = inspect_reference(url, aliases, sizes)
        files = sorted(refs[url])
        rows.append({
            "url": url, "status": status, "source_path": source,
            "source_bytes": size, "source_mib": round(size/(1024**2), 3) if size is not None else None,
            "source_files": files,
            "critical_source_file_referenced": any(x in HIGH_VALUE_FILES for x in files),
        })
    resolved = [x for x in rows if x["source_bytes"] is not None]
    prioritized = sorted(
        resolved,
        key=lambda x: (-int(x["critical_source_file_referenced"]), -x["source_bytes"], x["url"]),
    )
    return {
        "scope": "statically visible literal URLs; not an actual runtime request/scene loading trace",
        "code_files_scanned": code_count,
        "literal_media_urls": len(rows),
        "source_resolved": len(resolved),
        "by_resolution": dict(sorted(Counter(x["status"] for x in rows).items())),
        "resolved_source_bytes_sum_unadjusted": sum(x["source_bytes"] for x in resolved),
        "priority_references": prioritized[:60],
        "route_or_missing_path_review": [x for x in rows if x["source_bytes"] is None],
        "all_references": rows,
        "limitations": [
            "Dynamic string construction, remote sources, and imports are not captured.",
            "An asset URL may be registered but never requested during an Act I playthrough.",
            "The same source can be referenced by multiple URLs; summed source bytes are not download size.",
            "Route-specific files under /assets and /models_v2 may resolve without direct or clean alias mapping.",
            "Source existence does not prove runtime HTTP 200/206, correct media decoding, or M3 Air frame time.",
        ],
    }


def markdown(report):
    out = [
        "# Kaliyuga Phase 12 — live-code asset reference review",
        "",
        f"- TS/TSX/JS files scanned: **{report['code_files_scanned']}**",
        f"- Literal media URLs in code: **{report['literal_media_urls']}**",
        f"- URLs with a resolved repo source path: **{report['source_resolved']}**",
        f"- Resolution types: **{report['by_resolution']}**",
        "",
        "## High-priority source references (static heuristic)",
        "",
        "| URL | Source MiB | Critical code |",
        "|---|---:|---|",
    ]
    for x in report["priority_references"][:30]:
        url = x["url"].replace("|", chr(92)+"|")
        out.append(f"| {url} | {x['source_mib']:.2f} | {'Yes' if x['critical_source_file_referenced'] else 'No'} |")
    out += [
        "",
        "## Special-route or missing mapped sources to investigate",
        "",
        "These are **not confirmed 404s**. Route-specific handlers may supply content.",
        "",
    ]
    for x in report["route_or_missing_path_review"][:80]:
        out.append(f"- [{x['status']}] {x['url']}")
    if not report["route_or_missing_path_review"]:
        out.append("- None")
    out += ["", "## Limitations", ""]
    out.extend("- " + s for s in report["limitations"])
    return "\n".join(out) + "\n"


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo", type=Path, default=Path("."))
    p.add_argument("--tree-json", type=Path, required=True)
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independent"))
    args = p.parse_args(argv)
    assets = read_assets(tree_json=args.tree_json)
    proxy = (args.repo / "lib/server/staticAssetProxy.ts").read_text(encoding="utf-8")
    aliases = extract_aliases(proxy)
    report = audit(args.repo, assets, aliases)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "referenced-media.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    (args.output_dir / "referenced-media.md").write_text(markdown(report), encoding="utf-8")
    print(f"Referenced media: {report['source_resolved']}/{report['literal_media_urls']} source paths resolved; {len(report['route_or_missing_path_review'])} route/dynamic review candidates")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

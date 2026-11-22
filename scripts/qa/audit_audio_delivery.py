#!/usr/bin/env python3
"""Read-only Phase 10 Kaliyuga audio registry/source audit.

Resolves CLEAN_ASCII_REPO_MAP aliases before flagging broken source files.
A resolved URL is only a static source check, not evidence of browser playback,
mixing, voice audibility, clipping, cue timing, or rights clearance.
"""
import argparse
from collections import Counter
import json
from pathlib import Path
import re
import shutil
import subprocess

from audit_asset_footprint import read_assets

REGISTRIES = ("BGM_TRACKS", "SFX_FILES", "VOICE_CLIPS")


def extract_aliases(source):
    match = re.search(
        r"\bCLEAN_ASCII_REPO_MAP\s*:\s*Record<string,\s*string\[\]>\s*=\s*\{(.*?)^\};",
        source, re.M | re.S,
    )
    if not match:
        raise ValueError("CLEAN_ASCII_REPO_MAP not found; asset URL resolution is unverified")
    aliases = {}
    for alias, raw_parts in re.findall(r"'([^']+)'\s*:\s*\[([^\]]*)\]", match.group(1)):
        parts = re.findall(r"'([^']+)'", raw_parts)
        if not parts:
            raise ValueError(f"Empty alias: {alias}")
        aliases[alias] = "/".join(parts)
    if not aliases:
        raise ValueError("No parseable repo aliases; refusing misleading audit")
    return aliases


def extract_registries(source):
    result = {}
    for registry in REGISTRIES:
        match = re.search(
            rf"\b{registry}\s*=\s*\{{(.*?)^\s*\}}\s+as\s+const\s*;",
            source, re.M | re.S,
        )
        if not match:
            raise ValueError(f"{registry} missing/changed in lib/game/audio.ts")
        pairs = re.findall(r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*'([^']+)'", match.group(1), re.M)
        if not pairs:
            raise ValueError(f"{registry} could not be parsed")
        if len(dict(pairs)) != len(pairs):
            raise ValueError(f"Repeated audio keys in {registry}")
        result[registry] = dict(pairs)
    return result


def resolve_audio_url(url, aliases, paths):
    # Aliases can point outside /public; the on-demand proxy deliberately
    # serves both repository-relative and /public source files.
    filename = url.rsplit("/", 1)[-1]
    alternatives = []
    if filename in aliases:
        alternatives.append(aliases[filename])
    if url.startswith("/"):
        alternatives.append("public" + url)
    if url.startswith("/audio/repo/"):
        alternatives.extend(("audio and sound effects/" + filename,
                             "public/audio/" + filename,
                             "public/kaalyuga/audio/" + filename))
    for candidate in alternatives:
        if candidate in paths:
            return {"status": "source_present", "source_path": candidate,
                    "resolution": "repo_alias" if aliases.get(filename) == candidate else "direct_or_fallback"}
    return {
        "status": "needs_runtime_verification",
        "source_path": None,
        "alias_target": aliases.get(filename),
        "candidate_paths": alternatives[:5],
    }


def literal_voice_calls(code_root):
    """Count *literal* playVoiceBark calls; dynamically computed keys remain unknown."""
    usage = Counter()
    considered = 0
    for base in ("components", "lib", "app"):
        folder = code_root / base
        if not folder.exists():
            continue
        for path in folder.rglob("*"):
            if path.suffix not in (".ts", ".tsx", ".js", ".jsx") or not path.is_file():
                continue
            try:
                source = path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                continue
            considered += 1
            if path.name == "audio.ts" and path.parent.name == "game":
                continue
            for key in re.findall(r"\bplayVoiceBark\s*\(\s*['\"]([^'\"]+)['\"]", source):
                usage[key] += 1
    return usage, considered


def audit(tree, aliases, registries, calls, files_scanned):
    paths = {a.path for a in tree}
    media = [a for a in tree if a.ext in (".wav", ".mp3", ".ogg", ".m4a", ".flac")]
    assets = []
    for registry, entries in registries.items():
        for key, url in entries.items():
            resolved = resolve_audio_url(url, aliases, paths)
            assets.append({"registry": registry, "key": key, "url": url, **resolved,
                           **({"literal_voice_call_sites": calls.get(key, 0)} if registry == "VOICE_CLIPS" else {})})
    missing_sources = [x for x in assets if x["status"] != "source_present"]
    voice_not_seen = [
        x["key"] for x in assets if x["registry"] == "VOICE_CLIPS" and x["literal_voice_call_sites"] == 0
    ]
    return {
        "scope": "static source-tree and literal voice call-site audit; not sound playback analysis",
        "tracked_audio_assets": len(media),
        "tracked_audio_source_bytes": sum(a.size for a in media),
        "registry_counts": {name: len(val) for name, val in registries.items()},
        "repo_alias_count": len(aliases),
        "resolved_entries": len(assets) - len(missing_sources),
        "needs_runtime_verification": missing_sources,
        "registered_audio": assets,
        "voice_keys_without_literal_call_sites": voice_not_seen,
        "typescript_js_files_scanned": files_scanned,
        "literal_voice_call_sites_total": sum(calls.values()),
        "voice_call_count_by_key": dict(sorted(calls.items())),
        "cautions": [
            "An alias may resolve to a valid repository file outside public/; this is expected.",
            "A zero literal call-site count does not prove a voice is unused if calls use dynamic keys.",
            "A resolved source file does not prove the CDN/proxy serves playable bytes or supports Range on first load.",
            "WAV or MP3 file extension and size do not establish codec correctness, peaks, LUFS, latency or licensing.",
            "Do not auto-wire missing barks, normalize files, or change audio event timing without a gameplay review.",
        ],
    }


def to_markdown(report):
    out = [
        "# Kaliyuga Phase 10 — audio delivery and usage audit",
        "",
        "**Source-only report, not audio mix or timing approval.**",
        "",
        f"- Tracked WAV/MP3/other audio: {report['tracked_audio_assets']} files",
        f"- Total tracked audio source size: {report['tracked_audio_source_bytes']/(1024**2):.1f} MiB",
        f"- Registries: {report['registry_counts']}",
        f"- Resolved source paths: {report['resolved_entries']} / {len(report['registered_audio'])}",
        f"- Voice keys not found in literal calls: {len(report['voice_keys_without_literal_call_sites'])}",
        f"- Code files scanned: {report['typescript_js_files_scanned']}",
        "",
        "## Audio entries needing runtime verification",
        "",
    ]
    for a in report["needs_runtime_verification"]:
        out.append(f"- \`{a['registry']}.{a['key']}\` → \`{a['url']}\` (alias: \`{a.get('alias_target')}\`)")
    if not report["needs_runtime_verification"]:
        out.append("- None flagged by static source lookup.")
    out.extend(["", "## Voice keys not found at literal call sites", ""])
    out.extend(f"- \`{key}\`" for key in report["voice_keys_without_literal_call_sites"])
    if not report["voice_keys_without_literal_call_sites"]:
        out.append("- None")
    out.extend(["", "## Required live checks", "",
        "- Listen in headphones to boss intros, deaths and overlapping combat cues.",
        "- Capture cold-cache MP3/WAV request latency, HTTP statuses and Range responses.",
        "- Measure integrated LUFS/true peaks and reduce clipping only after listening.",
        "- Verify first bark after page load and ducking while boss music is playing.",
        "- Verify source/licensing rights before public distribution.",
        "",
    ])
    return "\n".join(out)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--repo", type=Path, default=Path("."))
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independence"))
    args = p.parse_args(argv)
    source = (args.repo / "lib/game/audio.ts").read_text(encoding="utf-8")
    proxy = (args.repo / "lib/server/staticAssetProxy.ts").read_text(encoding="utf-8")
    tree = read_assets(repo=args.repo)
    aliases = extract_aliases(proxy)
    registries = extract_registries(source)
    calls, files_scanned = literal_voice_calls(args.repo)
    result = audit(tree, aliases, registries, calls, files_scanned)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "audio-audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "audio-audit.md").write_text(to_markdown(result), encoding="utf-8")
    print(f"Phase10 audio: {result['resolved_entries']}/{len(result['registered_audio'])} registry sources resolved; {len(result['voice_keys_without_literal_call_sites'])} voice keys need usage review")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

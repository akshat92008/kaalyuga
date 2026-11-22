#!/usr/bin/env python3
"""Inspect actual checked-out MP3/WAV audio headers, without changing media.

Uses Mutagen for codec/duration/channel/sample-rate metadata. It does NOT
decode/measure perceptual loudness, clipping, rights, playback latency, or cues.
"""
import argparse
from collections import Counter
import json
from pathlib import Path

from mutagen import File as MutagenFile

EXTENSIONS = {".mp3", ".wav", ".ogg", ".flac", ".m4a"}


def probe(path):
    result = {"path": str(path), "source_bytes": path.stat().st_size}
    if result["source_bytes"] == 0:
        return {**result, "status": "unreadable", "reason": "empty file"}
    try:
        metadata = MutagenFile(path)
        if metadata is None or not hasattr(metadata, "info") or not metadata.info:
            raise ValueError("Mutagen did not recognize the audio codec")
        info = metadata.info
        length = getattr(info, "length", 0.0)
        if length is None or not (0 < float(length) < 60 * 60 * 6):
            raise ValueError("invalid or unreasonably long duration")
        result.update({
            "status": "header_readable",
            "duration_seconds": round(float(length), 3),
            "sample_rate": getattr(info, "sample_rate", None),
            "channels": getattr(info, "channels", None),
            "bitrate": getattr(info, "bitrate", None),
            "bits_per_sample": getattr(info, "bits_per_sample", None),
        })
    except Exception as error:
        result.update({"status": "unreadable", "reason": str(error)[:180]})
    return result


def audit(directories):
    paths = sorted({
        path.resolve() for folder in directories if folder.is_dir()
        for path in folder.rglob("*") if path.is_file() and path.suffix.lower() in EXTENSIONS
    })
    results = [probe(path) for path in paths]
    totals = Counter(p.suffix.lower() for p in paths)
    failed = [a for a in results if a["status"] != "header_readable"]
    rates = Counter(str(x.get("sample_rate")) for x in results if x["status"] == "header_readable")
    channels = Counter(str(x.get("channels")) for x in results if x["status"] == "header_readable")
    return {
        "scope": "audio file header inspection from checked-out files only",
        "scanned_files": len(paths),
        "readable_headers": len(paths) - len(failed),
        "unreadable_headers": failed,
        "by_extension": dict(sorted(totals.items())),
        "sample_rate_distribution": dict(sorted(rates.items())),
        "channel_distribution": dict(sorted(channels.items())),
        "files": results,
        "human_listening_approval": "NOT_REVIEWED",
        "limitations": [
            "An audio header may be readable even if the sound is distorted or clips.",
            "This does not establish loudness, true peaks, audio ducking, cue synchronization, HTTP streaming, or rights.",
            "Only materialized audio in the supplied directories is scanned; the Git-tree static audit covers all tracked assets.",
        ],
    }


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--directories", nargs="+", type=Path, required=True)
    p.add_argument("--minimum-files", type=int, default=1)
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independent"))
    args = p.parse_args(argv)
    result = audit(args.directories)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir/"audio-probe.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Kaliyuga audio header probe",
        "", f"Scanned files: {result['scanned_files']}",
        f"Readable headers: {result['readable_headers']}",
        f"Unrecognized or unreadable headers: {len(result['unreadable_headers'])}",
        f"Sample rates: {result['sample_rate_distribution']}",
        f"Channel counts: {result['channel_distribution']}",
        "", "## Files needing manual investigation", "",
    ]
    lines.extend(f"- {x['path']}: {x['reason']}" for x in result["unreadable_headers"])
    if not result["unreadable_headers"]:
        lines.append("- No header failures in this checked-out subset")
    lines.extend(["", "Passing this metadata probe does NOT imply release-approved audio.", ""])
    (args.output_dir/"audio-probe.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"Audio header probe: {result['readable_headers']}/{result['scanned_files']} files readable")
    if result["scanned_files"] < args.minimum_files:
        print(f"FAIL: only {result['scanned_files']} audio files materialized, required {args.minimum_files}")
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

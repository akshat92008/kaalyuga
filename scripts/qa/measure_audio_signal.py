#!/usr/bin/env python3
"""Read-only Phase 10 decoded audio signal triage.

Uses ffprobe and FFmpeg's volumedetect to decode the entire selected audio
file, measuring approximate sample RMS / digital peak dBFS. Never rewrites a
source. Review flags do not prove clipping or establish mix quality.
"""
from __future__ import annotations

import argparse
from collections import Counter
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys

EXTENSIONS = frozenset({".wav", ".mp3", ".ogg", ".flac", ".m4a"})
MEAN_PATTERN = re.compile(r"\bmean_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s+dB", re.IGNORECASE)
MAX_PATTERN = re.compile(r"\bmax_volume:\s*(-?(?:inf|\d+(?:\.\d+)?))\s+dB", re.IGNORECASE)
LIMITATIONS = [
    "mean_volume is FFmpeg volumedetect's approximate sample RMS in dBFS, not integrated LUFS.",
    "max_volume is digital sample peak in dBFS, not inter-sample/true peak.",
    "Sample-peak near 0 dBFS suggests review, not proof of clipping or audible distortion.",
    "Low RMS can be correct for silence, sparse cues, ambiences, or pre-roll.",
    "Decoding does not validate in-game mix, event timing, overlap, perceived quality, or licensing.",
    "Only checked-out audio sources in supplied directories were measured.",
]


def ffmpeg_available() -> bool:
    return shutil.which("ffmpeg") is not None and shutil.which("ffprobe") is not None


def parse_db(text: str, pattern: re.Pattern[str]) -> float:
    matches = pattern.findall(text)
    if not matches:
        raise ValueError("FFmpeg volumedetect did not emit a required volume measurement")
    value = matches[-1].lower()
    if value == "-inf":
        return float("-inf")
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Non-finite numerical FFmpeg volume output")
    return result


def probe(path: Path, timeout: int = 120) -> dict:
    """Decode one whole audio file without shell or writing to source."""
    result = {"path": str(path), "source_bytes": path.stat().st_size}
    if result["source_bytes"] == 0:
        return {**result, "status": "decode_failed", "reason": "empty file"}
    try:
        metadata = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries",
             "stream=codec_name,sample_rate,channels:format=duration", "-of", "json", str(path)],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, errors="replace",
            timeout=timeout, check=False,
        )
        if metadata.returncode:
            raise ValueError("ffprobe error: " + metadata.stderr[-350:].strip())
        info = json.loads(metadata.stdout)
        streams = info.get("streams", [])
        if not streams:
            raise ValueError("ffprobe found no audio stream")
        stream = streams[0]
        duration_string = info.get("format", {}).get("duration")
        duration = float(duration_string) if duration_string is not None else None
        if duration is not None and (not math.isfinite(duration) or duration <= 0):
            raise ValueError("invalid duration from ffprobe")
        result.update({
            "duration_seconds": round(duration, 3) if duration is not None else None,
            "codec": stream.get("codec_name"),
            "sample_rate": int(stream["sample_rate"]) if stream.get("sample_rate") else None,
            "channels": stream.get("channels"),
        })
        # Deliberately no -t: impacts and silence at the tail must be included.
        decoded = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostdin", "-v", "info", "-i", str(path),
             "-map", "0:a:0", "-vn", "-sn", "-dn", "-af", "volumedetect",
             "-f", "null", "-"],
            stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, errors="replace",
            timeout=timeout, check=False,
        )
        if decoded.returncode:
            raise ValueError("ffmpeg decode error: " + decoded.stderr[-450:].strip())
        mean = parse_db(decoded.stderr, MEAN_PATTERN)
        peak = parse_db(decoded.stderr, MAX_PATTERN)
        flags = []
        if peak >= -0.1:
            flags.append("near_full_scale_sample_peak_review")
        if mean <= -60.0:
            flags.append("very_low_average_signal_review")
        result.update({
            "status": "decoded", "mean_dbfs": mean if math.isfinite(mean) else None,
            "sample_peak_dbfs": peak if math.isfinite(peak) else None,
            "at_or_below_16bit_measurement_floor": mean <= -90.5 and peak <= -90.5,
            "review_flags": flags,
        })
        return result
    except (OSError, subprocess.TimeoutExpired, ValueError, KeyError, TypeError, json.JSONDecodeError) as error:
        return {**result, "status": "decode_failed", "reason": str(error)[-500:]}


def audit(directories: list[Path], timeout: int = 120) -> dict:
    paths = sorted({
        p.resolve() for root in directories if root.is_dir()
        for p in root.rglob("*") if p.is_file() and p.suffix.lower() in EXTENSIONS
    }, key=str)
    entries = [probe(p, timeout=timeout) for p in paths]
    review = [e for e in entries if e.get("review_flags")]
    failures = [e for e in entries if e["status"] != "decoded"]
    return {
        "scope": "entire checked-out decoded audio signal (read-only), not in-game mix approval",
        "scanned_files": len(entries), "decoded_files": len(entries) - len(failures),
        "decode_failures": failures, "review_candidates": review,
        "flag_counts": dict(sorted(Counter(flag for e in review for flag in e["review_flags"]).items())),
        "files": entries, "human_listening_approval": "NOT_REVIEWED",
        "source_rights_approval": "NOT_REVIEWED", "limitations": LIMITATIONS,
    }


def to_markdown(report: dict) -> str:
    out = [
        "# Kaliyuga Phase 10 — decoded audio signal triage", "",
        "**Decoded-file evidence only; not mix, timing, gameplay or rights approval.**", "",
        f"- Audio files found: {report['scanned_files']}",
        f"- Entire files decoded: {report['decoded_files']}",
        f"- Decode failures: {len(report['decode_failures'])}",
        f"- Human-review candidates: {len(report['review_candidates'])}",
        f"- Flag counts: {report['flag_counts']}", "",
        "## Review candidates", "",
        "| Path | Digital sample peak dBFS | Approx mean dBFS | Review reason |",
        "|---|---:|---:|---|",
    ]
    for item in report["review_candidates"]:
        out.append("| " + " | ".join([
            item["path"].replace("|", r"\|"),
            "-inf" if item["sample_peak_dbfs"] is None else str(item["sample_peak_dbfs"]),
            "-inf" if item["mean_dbfs"] is None else str(item["mean_dbfs"]),
            ", ".join(item["review_flags"]),
        ]) + " |")
    if not report["review_candidates"]:
        out.append("| No automatic flags | — | — | — |")
    out.extend(["", "## Decode failures", ""])
    out.extend(f"- {r['path']}: {r['reason']}" for r in report["decode_failures"])
    if not report["decode_failures"]:
        out.append("- No failures in this subset")
    out.extend(["", "## Limitations", ""])
    out.extend("- " + note for note in report["limitations"])
    out.extend(["", "## Human playback still required", "",
                "- Hear flagged cues at normal game gain with concurrent combat/music.",
                "- Check boss roar/drum timing, bark ducking, interruption, and loops.",
                "- Clear source rights before public demo release.", ""])
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directories", nargs="+", type=Path, required=True)
    parser.add_argument("--minimum-files", type=int, default=1)
    parser.add_argument("--timeout-seconds", type=int, default=120)
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-audio-signal"))
    args = parser.parse_args(argv)
    if not ffmpeg_available():
        parser.error("ffprobe and ffmpeg are required for full decoded signal audit")
    if args.minimum_files < 1 or args.timeout_seconds < 1:
        parser.error("minimum-files and timeout-seconds must be positive")
    report = audit(args.directories, args.timeout_seconds)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "audio-signal.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + "\n", encoding="utf-8")
    (args.output_dir / "audio-signal.md").write_text(to_markdown(report), encoding="utf-8")
    print(f"Audio signal: {report['decoded_files']}/{report['scanned_files']} files decoded; "
          f"{len(report['review_candidates'])} review candidates; "
          f"{len(report['decode_failures'])} decoding failures")
    if report["scanned_files"] < args.minimum_files:
        print(f"FAIL: {report['scanned_files']} materialized; minimum is {args.minimum_files}", file=sys.stderr)
        return 1
    if report["decode_failures"]:
        print("FAIL: some checked-out audio sources could not be decoded", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

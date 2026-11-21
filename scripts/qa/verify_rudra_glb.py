#!/usr/bin/env python3
"""Validate Blender-generated Rudra GLB structure, NLA clips and contact-sheet render."""
from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path

EXPECTED_CLIPS = {"idle", "run", "dodge", "attack1", "attack2", "attack3", "heavy", "cast", "block", "hurt"}

def validate(report_path: Path) -> dict:
    report = json.loads(report_path.read_text(encoding="utf8"))
    assert report.get("blender_execution") is True, "Blender never completed export"
    assert not report.get("fatal_error"), report.get("fatal_error")
    assert not report.get("rejected"), "Rejected clips: " + json.dumps(report["rejected"])
    accepted = {Path(c["clip"]).stem for c in report.get("accepted", [])}
    assert accepted == EXPECTED_CLIPS, f"Missing/unexpected animation clips: {EXPECTED_CLIPS ^ accepted}"
    assert report.get("canonical_bone_count", 0) >= 20, "Skeleton has too few bones"
    assert report.get("mesh_count", 0) >= 1, "No mesh was imported"

    glb = Path(report["glb"])
    assert glb.exists(), f"GLB was not written: {glb}"
    with glb.open("rb") as f:
        magic, version, length = struct.unpack("<4sII", f.read(12))
        assert magic == b"glTF" and version == 2 and length == glb.stat().st_size, "Invalid GLB header"
        json_len, json_type = struct.unpack("<II", f.read(8))
        assert json_type == 0x4E4F534A, "Missing GLB JSON chunk"
        root = json.loads(f.read(json_len))
    animation_count = len(root.get("animations", []))
    assert animation_count >= 8, f"Exported only {animation_count} animation clips"
    assert root.get("skins"), "Exported GLB does not contain a skeleton skin"
    assert root.get("meshes"), "Exported GLB does not contain a mesh"
    for anim in root["animations"]:
        assert anim.get("channels") and anim.get("samplers"), "Empty animation channel"

    png = Path(report.get("preview", ""))
    assert png.is_file(), "Blender preview missing; no actual visual render generated"
    with png.open("rb") as f:
        header = f.read(24)
    assert header[:8] == b"\x89PNG\r\n\x1a\n", "Preview is not a PNG"
    width, height = struct.unpack(">II", header[16:24])
    assert width >= 640 and height >= 360, "Preview resolution insufficient"
    result = {
        "passed": True,
        "accepted": sorted(accepted),
        "animation_count": animation_count,
        "skinned_meshes": len(root["meshes"]),
        "bones": report["canonical_bone_count"],
        "preview": [width, height],
    }
    (report_path.parent / "verified.json").write_text(json.dumps(result, indent=2), encoding="utf8")
    print(json.dumps(result, indent=2))
    return result

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", type=Path, required=True)
    validate(ap.parse_args().report)

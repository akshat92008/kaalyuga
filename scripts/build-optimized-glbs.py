"""Offline FBX -> game-ready GLB batch build (run inside Blender 4.2+).

Examples:
  blender -b --python scripts/build-optimized-glbs.py -- --max-files 4 --contains Dundubhi
  blender -b --python scripts/build-optimized-glbs.py -- --all
  blender -b --python scripts/build-optimized-glbs.py -- --all --gltfpack /path/to/gltfpack

Outputs are written under public/optimized/ and indexed by /optimized/asset-manifest.json.
No runtime FBX downloads are necessary for converted assets. Original FBXs remain a
fallback until the generated manifest + GLBs are uploaded/deployed together.
"""
import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

import bpy


def args():
    flags = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--all", action="store_true", help="Convert ALL FBX assets, including animation packs")
    parser.add_argument("--contains", default="", help="Case-insensitive path filter for an incremental build")
    parser.add_argument("--max-files", type=int, default=0, help="Stop after N successful/failed sources (0 = unlimited)")
    parser.add_argument("--gltfpack", default="", help="Optional gltfpack executable for mesh compression")
    parser.add_argument("--strict", action="store_true", help="Fail if any selected source cannot be exported")
    return parser.parse_args(flags)


def original_url(root, path):
    rel = path.relative_to(root).as_posix()
    if rel.startswith("public/"):
        return "/" + rel[len("public/"):]
    if rel.startswith("new 3D assets and animations/"):
        return "/new_3d_assets/" + rel[len("new 3D assets and animations/"):]
    return None


def find_sources(root, all_assets, contains):
    roots = [root / "public/models", root / "public/animations",
             root / "new 3D assets and animations"]
    if not all_assets:
        # Curated Act I rigs, NPCs, weapons and combat animation packs.
        markers = ("Ashen_", "Blood", "Warlord", "Dundubhi", "Vrikodara",
                   "Bellhorn", "Molten", "Oracle", "Lotus_Empress",
                   "Sovereign", "Skullclad", "Pro Melee Axe Pack",
                   "Creature Pack", "Pro Sword and Shield Pack")
    else:
        markers = ()
    selected = []
    for directory in roots:
        if not directory.exists():
            continue
        for file in directory.rglob("*.fbx"):
            rel = file.relative_to(root).as_posix()
            if contains and contains.lower() not in rel.lower():
                continue
            if markers and not any(m.lower() in rel.lower() for m in markers):
                continue
            if original_url(root, file):
                selected.append(file)
    return sorted(set(selected))


def inspect_glb(path):
    with path.open("rb") as fp:
        head = fp.read(12)
        if len(head) != 12 or head[:4] != b"glTF" or struct.unpack("<I", head[4:8])[0] != 2:
            raise ValueError("Invalid GLB header")
        json_len, chunk_type = struct.unpack("<I4s", fp.read(8))
        if chunk_type != b"JSON":
            raise ValueError("Missing GLB JSON chunk")
        data = json.loads(fp.read(json_len).decode("utf-8"))
    return data


def export_one(source, output, packer):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for action in list(bpy.data.actions):
        if action.users == 0:
            bpy.data.actions.remove(action)
    # Blender 5.0 removed the legacy use_anim FBX-import option. Keep this
    # script compatible with different runner/desktop Blender versions.
    import_options = {
        "filepath": str(source),
        "use_anim": True,
        "ignore_leaf_bones": False,
    }
    available_import = {prop.identifier for prop in bpy.ops.import_scene.fbx.get_rna_type().properties}
    bpy.ops.import_scene.fbx(**{
        key: value for key, value in import_options.items() if key in available_import
    })
    if not bpy.context.scene.objects:
        raise ValueError("No objects imported from FBX")
    has_skin = any(obj.type == "MESH" and any(mod.type == "ARMATURE" for mod in obj.modifiers)
                   for obj in bpy.context.scene.objects)
    has_animation = any(obj.animation_data is not None and obj.animation_data.action is not None
                        for obj in bpy.context.scene.objects)
    output.parent.mkdir(parents=True, exist_ok=True)
    raw = output.with_suffix(".raw.glb") if packer else output
    options = {
        "filepath": str(raw),
        "export_format": "GLB",
        "export_skins": True,
        "export_animations": True,
        "export_nla_strips": False,
        "export_image_format": "AUTO",
        "use_selection": False,
    }
    available = {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    bpy.ops.export_scene.gltf(**{key: value for key, value in options.items() if key in available})
    if packer:
        try:
            # -kn retains bone/node names used by the engine's clip retargeting.
            subprocess.run([packer, "-i", str(raw), "-o", str(output), "-kn", "-km", "-cc"],
                           check=True, timeout=300)
        finally:
            raw.unlink(missing_ok=True)
    if not output.exists() or output.stat().st_size <= 1024:
        raise ValueError("Exporter produced empty GLB")
    gltf = inspect_glb(output)
    if has_skin and not gltf.get("skins"):
        raise ValueError("Skinned FBX lost bone/skin data during export")
    if has_animation and not gltf.get("animations"):
        raise ValueError("Animated FBX lost its animation clips")
    return len(gltf.get("meshes", [])), len(gltf.get("skins", [])), len(gltf.get("animations", []))


def main():
    cfg = args()
    root = cfg.root.resolve()
    outdir = root / "public" / "optimized"
    manifest_file = outdir / "asset-manifest.json"
    manifest = json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
    failures = []
    sources = find_sources(root, cfg.all, cfg.contains)
    if cfg.max_files:
        sources = sources[:cfg.max_files]
    print(f"Found {len(sources)} FBX sources to convert")
    for i, source in enumerate(sources, start=1):
        url = original_url(root, source)
        suffix = re.sub(r"[^A-Za-z0-9_-]", "_", source.stem)[:54]
        digest = hashlib.sha256(str(source.relative_to(root)).encode()).hexdigest()[:12]
        filename = f"{digest}_{suffix}.glb"
        relative_output = f"/optimized/glb/{filename}"
        output = root / "public" / relative_output.lstrip("/")
        try:
            if output.exists():
                info = inspect_glb(output)
                count = (len(info.get("meshes", [])), len(info.get("skins", [])),
                         len(info.get("animations", [])))
            else:
                count = export_one(source, output, cfg.gltfpack)
            manifest[url] = relative_output
            print(f"[{i}/{len(sources)}] OK {source.name} meshes/skins/clips={count} bytes={output.stat().st_size}")
        except Exception as error:
            manifest.pop(url, None)
            output.unlink(missing_ok=True)
            failures.append((str(source), str(error)))
            print(f"[{i}/{len(sources)}] FAIL {source}: {error}", file=sys.stderr)
    # Optional URL aliases for models exposed by the static asset proxy.
    aliases_file = root / "scripts" / "optimized-asset-aliases.json"
    if aliases_file.exists():
        for url_alias, source_url in json.loads(aliases_file.read_text()).items():
            if source_url in manifest:
                manifest[url_alias] = manifest[source_url]
    outdir.mkdir(parents=True, exist_ok=True)
    manifest_file.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n")
    print(f"Wrote {len(manifest)} URL entries to {manifest_file}; {len(failures)} failures")
    if failures:
        report = outdir / "conversion-errors.json"
        report.write_text(json.dumps(failures, indent=2))
        if cfg.strict:
            raise SystemExit(1)


if __name__ == "__main__":
    main()

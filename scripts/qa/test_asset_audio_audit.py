#!/usr/bin/env python3
"""Regression tests for isolated Phase 12 media and Phase 10 audio audits."""
import tempfile
import unittest
from pathlib import Path

from audit_asset_footprint import MIB, Asset, markdown, parse_ls_tree, parse_github_tree, summarize
from audit_audio_delivery import audit, extract_aliases, extract_registries, literal_voice_calls, resolve_audio_url


def record(path, sha="a" * 40, size=1234):
    return (f"100644 blob {sha} {size}\t{path}".encode() + b"\0")


class AssetFootprintTests(unittest.TestCase):
    def test_null_delimited_unicode_space_and_tab(self):
        tree = record("public/Images/ruins — final\tA.png", size=10*MIB) + record(
            "audio and sound effects/voice/sample.mp3", sha="b"*40, size=257
        )
        assets = parse_ls_tree(tree)
        self.assertEqual(len(assets), 2)
        self.assertEqual(assets[0].ext, ".png")
        self.assertEqual(assets[0].category, "image")
        self.assertIn("\t", assets[0].path)
        self.assertEqual(assets[1].location, "repo / alias or source")
        self.assertEqual(len(summarize(assets)["size_review_candidates"]), 1)

    def test_git_identical_blobs_not_claimed_as_wasted_bytes(self):
        data = record("public/a.fbx", "c"*40, 7*MIB) + record("archive/b.fbx", "c"*40, 7*MIB)
        report = summarize(parse_ls_tree(data))
        self.assertEqual(report["total_source_bytes_with_paths_counted"], 14*MIB)
        self.assertEqual(len(report["identical_git_blob_groups"]), 1)
        self.assertIn("do not subtract", report["cautions"][1].lower())

    def test_markdown_with_pipe_in_filename(self):
        report = summarize(parse_ls_tree(record("public/a|b.png", size=10*MIB)))
        self.assertIn(r"a\|b.png", markdown(report))

    def test_github_tree_complete_metadata(self):
        payload = {"truncated": False, "tree": [
            {"path": "public/scene.mp4", "type": "blob", "sha": "a"*40, "size": 5000},
            {"path": "public/", "type": "tree", "sha": "b"*40},
        ]}
        result = parse_github_tree(payload)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].size, 5000)

    def test_github_tree_truncated_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_github_tree({"truncated": True, "tree": []})

    def test_reject_bad_tree_record(self):
        with self.assertRaises(ValueError):
            parse_ls_tree(b"broken\0")


class AudioDeliveryTests(unittest.TestCase):
    def test_alias_with_multiline_source(self):
        source = """export const CLEAN_ASCII_REPO_MAP: Record<string, string[]> = {
 'hit.wav': [
  'audio and sound effects',
  'A_hero_hit.wav',
 ],
};"""
        aliases = extract_aliases(source)
        self.assertEqual(aliases["hit.wav"], "audio and sound effects/A_hero_hit.wav")
        resolved = resolve_audio_url("/audio/repo/hit.wav", aliases, {aliases["hit.wav"]})
        self.assertEqual(resolved["status"], "source_present")
        self.assertEqual(resolved["resolution"], "repo_alias")

    def test_unresolved_audio_is_not_labeled_broken(self):
        result = resolve_audio_url("/audio/repo/missing.wav", {}, set())
        self.assertEqual(result["status"], "needs_runtime_verification")

    def test_registry_parsing(self):
        code = "\n".join(
            f"public static readonly {key} = {{\n  sample: '/audio/repo/sample.mp3',\n}} as const;"
            for key in ("BGM_TRACKS", "SFX_FILES", "VOICE_CLIPS")
        )
        result = extract_registries(code)
        self.assertEqual(len(result["VOICE_CLIPS"]), 1)

    def test_dynamic_voice_keys_are_not_called_unused(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/"components").mkdir()
            (root/"components"/"KaliyugaArena.tsx").write_text(
                "player.playVoiceBark('dundubhi_intro'); player.playVoiceBark(dynamicVoiceKey);",
                encoding="utf-8"
            )
            calls, scanned = literal_voice_calls(root)
            self.assertEqual(scanned, 1)
            self.assertEqual(calls.get("dundubhi_intro"), 1)
            self.assertEqual(calls.get("dynamicVoiceKey", 0), 0)

    def test_registry_asset_resolution_and_voice_reporting(self):
        assets = [
            Asset("audio and sound effects/intro.wav", "f"*40, 100, ".wav", "audio", "repo / alias or source"),
        ]
        reg = {
            "BGM_TRACKS": {"theme": "/audio/repo/intro.wav"},
            "SFX_FILES": {"smash": "/audio/repo/nope.wav"},
            "VOICE_CLIPS": {"dundubhi_intro": "/audio/repo/intro.wav"},
        }
        results = audit(assets, {"intro.wav": "audio and sound effects/intro.wav"}, reg, {"dundubhi_intro": 2}, 12)
        self.assertEqual(results["resolved_entries"], 2)
        self.assertEqual(len(results["needs_runtime_verification"]), 1)
        self.assertEqual(results["voice_keys_without_literal_call_sites"], [])


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Tests for non-mutating reference-based asset prioritization."""
import tempfile
import unittest
from pathlib import Path

from audit_asset_footprint import Asset
from audit_referenced_media import audit, inspect_reference, scan_literals


class ReferencedMediaTests(unittest.TestCase):
    def test_resolved_repo_alias_and_direct_file(self):
        sizes = {"audio and sound effects/voice.wav": 256, "public/videos/boss.mp4": 1024}
        aliases = {"voice.wav": "audio and sound effects/voice.wav"}
        self.assertEqual(inspect_reference("/audio/repo/voice.wav", aliases, sizes),
                         ("mapped_source_present", "audio and sound effects/voice.wav", 256))
        self.assertEqual(inspect_reference("/videos/boss.mp4", aliases, sizes),
                         ("direct_source_present", "public/videos/boss.mp4", 1024))

    def test_missing_or_special_routes_not_assumed_404(self):
        self.assertEqual(inspect_reference("/assets/aistudio/vision.png", {}, {})[0],
                         "route_or_dynamic_resolution_needed")
        self.assertEqual(inspect_reference("/audio/repo/voice.wav", {"voice.wav": "lost/file.wav"}, {})[0],
                         "mapped_source_missing")

    def test_code_search_deduplicates_occurrences_and_prioritizes_critical(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "lib/game").mkdir(parents=True)
            (root / "components/game").mkdir(parents=True)
            (root / "lib/game/assets.ts").write_text(
                "const a='/videos/boss.mp4'; const b='/videos/boss.mp4';"
                "const c='/assets/aistudio/special.png'; const bad='http://example.com/file.mp4';",
                encoding="utf-8",
            )
            (root / "components/game/KaliyugaArena.tsx").write_text(
                "const intro='/videos/boss.mp4';", encoding="utf-8"
            )
            (root/"lib/game/audio.ts").write_text("const cue='/audio/repo/cue.wav';", encoding="utf-8")
            refs, count = scan_literals(root)
            self.assertEqual(count, 3)
            self.assertEqual(len(refs["/videos/boss.mp4"]), 2)
            assets = [
                Asset("public/videos/boss.mp4", "a"*40, 11*1024*1024, ".mp4", "video", "public/"),
                Asset("audio and sound effects/cue.wav", "b"*40, 120, ".wav", "audio", "repo / alias or source"),
            ]
            report = audit(root, assets, {"cue.wav": "audio and sound effects/cue.wav"})
            self.assertEqual(report["literal_media_urls"], 3)
            self.assertEqual(report["source_resolved"], 2)
            self.assertTrue(report["priority_references"][0]["critical_source_file_referenced"])
            self.assertEqual(report["priority_references"][0]["url"], "/videos/boss.mp4")

    def test_query_string_not_confused_for_filename(self):
        result = inspect_reference("/videos/boss.mp4?ver=1", {}, {"public/videos/boss.mp4": 200})
        self.assertEqual(result[2], 200)


if __name__ == "__main__":
    unittest.main()

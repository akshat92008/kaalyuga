#!/usr/bin/env python3
"""Actual-file header probe checks using synthesized WAV fixtures."""
import json
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from probe_audio_headers import audit, main, probe


class AudioProbeTests(unittest.TestCase):
    def test_valid_pcm_wav(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            file = folder / "impact.wav"
            with wave.open(str(file), "wb") as out:
                out.setnchannels(1)
                out.setsampwidth(2)
                out.setframerate(24000)
                out.writeframes(struct.pack("<" + "h" * 2400, *([2000] * 2400)))
            details = probe(file)
            self.assertEqual(details["status"], "header_readable")
            self.assertAlmostEqual(details["duration_seconds"], 0.1, places=2)
            self.assertEqual(details["channels"], 1)
            self.assertEqual(details["sample_rate"], 24000)
            self.assertEqual(audit([folder])["readable_headers"], 1)
            self.assertEqual(main(["--directories", str(folder), "--minimum-files", "1", "--output-dir", str(folder/"out")]), 0)
            self.assertTrue((folder/"out"/"audio-probe.json").exists())

    def test_invalid_header_flagged_without_crashing(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root/"invalid.mp3").write_bytes(b"not actually an mp3")
            result = audit([root])
            self.assertEqual(result["readable_headers"], 0)
            self.assertEqual(result["scanned_files"], 1)
            self.assertEqual(result["unreadable_headers"][0]["status"], "unreadable")

    def test_missing_sparse_checkout_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.assertEqual(main(["--directories", str(root), "--minimum-files", "1",
                                   "--output-dir", str(root/"out")]), 1)


if __name__ == "__main__":
    unittest.main()

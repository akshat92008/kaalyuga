#!/usr/bin/env python3
"""Real FFmpeg decoding regression tests for independent audio-signal QA."""
import json
import struct
import tempfile
import unittest
import wave
from pathlib import Path

from measure_audio_signal import (
    MEAN_PATTERN, MAX_PATTERN, audit, ffmpeg_available, main, parse_db, probe,
)


def write_wav(path, samples, rate=24000):
    with wave.open(str(path), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(rate)
        output.writeframes(struct.pack("<" + "h" * len(samples), *samples))


@unittest.skipUnless(ffmpeg_available(), "ffmpeg and ffprobe required")
class DecodedAudioTests(unittest.TestCase):
    def test_full_scale_is_flag_not_proven_clip(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "potential-full-scale.wav"
            write_wav(path, [32767] * 2400)
            result = probe(path)
            self.assertEqual(result["status"], "decoded")
            self.assertIn("near_full_scale_sample_peak_review", result["review_flags"])
            self.assertGreaterEqual(result["sample_peak_dbfs"], -0.1)
            self.assertFalse(result["at_or_below_16bit_measurement_floor"])

    def test_healthy_moderate_signal_and_json_report(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            path = folder / "moderate.wav"
            write_wav(path, [3000, -3000] * 1200)
            result = probe(path)
            self.assertEqual(result["status"], "decoded")
            self.assertEqual(result["review_flags"], [])
            self.assertLess(result["sample_peak_dbfs"], -15)
            out = folder / "results"
            self.assertEqual(main(["--directories", str(folder), "--minimum-files", "1", "--output-dir", str(out)]), 0)
            data = json.loads((out / "audio-signal.json").read_text(encoding="utf-8"))
            self.assertEqual(data["decoded_files"], 1)
            self.assertEqual(data["human_listening_approval"], "NOT_REVIEWED")

    def test_silence_is_review_candidate(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / "silence.wav"
            write_wav(path, [0] * 2400)
            result = probe(path)
            self.assertEqual(result["status"], "decoded")
            self.assertLessEqual(result["mean_dbfs"], -90.5)
            self.assertTrue(result["at_or_below_16bit_measurement_floor"])
            self.assertIn("very_low_average_signal_review", result["review_flags"])

    def test_corrupt_file_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            (folder / "bad.mp3").write_bytes(b"not an mp3")
            report = audit([folder])
            self.assertEqual(report["decoded_files"], 0)
            self.assertEqual(len(report["decode_failures"]), 1)
            self.assertEqual(main(["--directories", str(folder), "--output-dir", str(folder / "out")]), 1)
            self.assertTrue((folder / "out" / "audio-signal.json").exists())

    def test_no_materialized_files_fails_closed(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d)
            self.assertEqual(main(["--directories", str(path), "--minimum-files", "2",
                                   "--output-dir", str(path / "out")]), 1)

    def test_volume_parser_handles_negative_infinity(self):
        self.assertEqual(parse_db("[Parsed_volumedetect_0] max_volume: -inf dB", MAX_PATTERN), float("-inf"))
        self.assertAlmostEqual(parse_db("mean_volume: -22.2 dB", MEAN_PATTERN), -22.2)
        with self.assertRaises(ValueError):
            parse_db("volumedetect is missing", MAX_PATTERN)


if __name__ == "__main__":
    unittest.main()

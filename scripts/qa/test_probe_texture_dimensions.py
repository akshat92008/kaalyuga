#!/usr/bin/env python3
"""Tests for non-mutating RGBA8 texture size estimates."""
import tempfile
import unittest
from pathlib import Path
from PIL import Image

from probe_texture_dimensions import audit, main, probe


class TextureDimensionTests(unittest.TestCase):
    def test_exact_dimensions_and_rgba8_estimate(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/"test.png"
            Image.new("RGB", (1024, 1024), (10, 20, 30)).save(p)
            result = probe(p)
            self.assertEqual(result["status"], "readable")
            self.assertEqual(result["decoded_rgba8_mib"], 4.0)
            self.assertAlmostEqual(result["rgba8_with_full_mip_chain_mib"], 5.333, places=2)
            self.assertFalse(result["dimension_review"])

    def test_large_texture_flag(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/"wide.png"
            Image.new("RGBA", (5000, 2), (0, 0, 0, 0)).save(p)
            self.assertTrue(probe(p)["dimension_review"])

    def test_unreadable_is_reported(self):
        with tempfile.TemporaryDirectory() as temp:
            p = Path(temp)/"fake.png"
            p.write_bytes(b"not an image")
            result = audit([Path(temp)])
            self.assertEqual(result["readable"], 0)
            self.assertEqual(result["images_scanned"], 1)
            self.assertEqual(result["unreadable"][0]["status"], "unreadable")

    def test_empty_checkout_fails_without_false_success(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            self.assertEqual(main(["--directories", str(folder),
                                   "--output-dir", str(folder/"out"), "--minimum-files", "1"]), 1)


if __name__ == "__main__":
    unittest.main()

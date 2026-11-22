#!/usr/bin/env python3
"""Unit tests for non-destructive visual before/after comparison."""
import tempfile
import unittest
from pathlib import Path

from PIL import Image

from compare_visual_evidence import audit, compare_pair, image_index, main


class VisualComparatorTests(unittest.TestCase):
    def test_identical_images_zero_changed_pixels(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            old, new, diff = (folder / name for name in ("old.png", "new.png", "delta.png"))
            Image.new("RGB", (8, 8), (24, 30, 40)).save(old)
            Image.new("RGB", (8, 8), (24, 30, 40)).save(new)
            result = compare_pair(old, new, diff)
            self.assertEqual(result["status"], "compared")
            self.assertEqual(result["mean_absolute_rgb_difference"], 0)
            self.assertEqual(result["changed_percent"], 0)
            self.assertTrue(diff.exists())

    def test_changed_pixels_are_reported_not_auto_failed(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            old, new, diff = (folder / name for name in ("old.png", "new.png", "delta.png"))
            Image.new("RGB", (4, 4), (0, 0, 0)).save(old)
            changed = Image.new("RGB", (4, 4), (0, 0, 0))
            changed.putpixel((1, 1), (255, 255, 255))
            changed.save(new)
            result = compare_pair(old, new, diff)
            self.assertEqual(result["changed_pixels_above_threshold"], 1)
            self.assertEqual(result["changed_percent"], 6.25)

    def test_mismatched_dimensions_do_not_get_resized_silently(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            old, new, diff = (folder / name for name in ("old.png", "new.png", "delta.png"))
            Image.new("RGB", (8, 8)).save(old)
            Image.new("RGB", (7, 8)).save(new)
            self.assertEqual(compare_pair(old, new, diff)["status"], "size_mismatch")
            self.assertFalse(diff.exists())

    def test_empty_comparison_cannot_pass(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("before", "after"):
                (root / name).mkdir()
            self.assertEqual(main(["--before", str(root/"before"), "--after", str(root/"after"),
                                   "--output-dir", str(root/"report")]), 1)
            self.assertTrue((root/"report"/"comparison-report.json").exists())

    def test_unmatched_stems_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for name in ("before", "after"):
                (root/name).mkdir()
            Image.new("RGB", (8, 8)).save(root/"before"/"09-agni.png")
            Image.new("RGB", (8, 8)).save(root/"after"/"10-vayu.png")
            result = audit(root/"before", root/"after", root/"out")
            self.assertEqual(result["only_in_before"], ["09-agni"])
            self.assertEqual(result["only_in_after"], ["10-vayu"])
            self.assertEqual(result["human_visual_approval"], "NOT_REVIEWED")


if __name__ == "__main__":
    unittest.main()

#!/usr/bin/env python3
"""Standard-library regression tests for the independent director-review generator."""
import json
import tempfile
import unittest
from pathlib import Path

from build_director_review import category, evidence, main


class DirectorReviewTests(unittest.TestCase):
    def save(self, folder, name, value):
        (folder / name).write_text(json.dumps(value), encoding="utf-8")

    def test_happy_path_and_html_escaping(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            name = '09-agni-smash-heavy-contact.png'
            (folder / name).write_bytes(b'PNG testing placeholder')
            self.save(folder, 'browser-verification.json', {
                'passed': True, 'visualCoverageComplete': True, 'screenshots': [name], 'screenshotFailures': [],
            })
            self.save(folder, 'visual-signature-report.json', {
                'passed': True, 'results': [{'attack': Path(name).stem, 'passed': True, 'palette': '<fire>', 'bright_pixels': 950}],
            })
            self.assertEqual(main([str(folder)]), 0)
            output = (folder / 'director-review.html').read_text(encoding='utf-8')
            self.assertIn('Signature PASS', output)
            self.assertIn('&lt;fire&gt;', output)
            self.assertNotIn('<fire>', output)
            summary = json.loads((folder / 'director-review-summary.json').read_text(encoding='utf-8'))
            self.assertEqual(summary['browser_smoke_status'], 'PASS')
            self.assertEqual(summary['human_visual_approval'], 'NOT_REVIEWED')

    def test_missing_declared_capture_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            self.save(folder, 'browser-verification.json', {
                'passed': True, 'visualCoverageComplete': True,
                'screenshots': ['13-execution-impaling_lunge.png'], 'screenshotFailures': [],
            })
            self.assertEqual(main([str(folder)]), 1)
            status, *_ = evidence(folder)
            self.assertEqual(status['missing_declared_screenshots'], ['13-execution-impaling_lunge.png'])
            self.assertEqual(status['pixel_signature_status'], 'NOT_RUN')

    def test_no_manifest_cannot_be_approved(self):
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / 'shot with spaces.jpg').write_bytes(b'placeholder')
            self.assertEqual(main([str(folder)]), 1)
            self.assertIn('shot%20with%20spaces.jpg', (folder / 'director-review.html').read_text())

    def test_groups(self):
        self.assertEqual(category('13-execution-test.png'), 'Executions')
        self.assertEqual(category('11-live-dundubhi-boss-entrance.jpg'), 'Live boss entrance')


if __name__ == '__main__':
    unittest.main()

#!/usr/bin/env python3
"""Regression tests for bounded real HTTP HEAD/Range probing."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import tempfile
import threading
import unittest

from probe_http_media import audit, main


class MediaHandler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        return

    def do_HEAD(self):
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Length", "4096")
        self.end_headers()

    def do_GET(self):
        if self.path == "/supports.mp4" and self.headers.get("Range") == "bytes=0-1023":
            self.send_response(206)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", "1024")
            self.send_header("Content-Range", "bytes 0-1023/4096")
            self.end_headers()
            self.wfile.write(b"0"*1024)
        else:
            self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Content-Length", "4096")
            self.end_headers()
            try:
                self.wfile.write(b"1"*4096)
            except BrokenPipeError:
                pass


class HttpMediaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), MediaHandler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_reports_206_and_ignored_range_without_overreading(self):
        report = audit(self.base, ["/supports.mp4", "/ignores.mp4"])
        self.assertEqual(report["supports_206_count"], 1)
        self.assertEqual(report["responses"][0]["range_get"]["bytes_read"], 1024)
        self.assertEqual(report["responses"][0]["range_response"], "supports_206")
        self.assertEqual(report["responses"][1]["range_response"], "range_ignored_or_not_supported")
        self.assertEqual(report["responses"][1]["range_get"]["bytes_read"], 1024)

    def test_rejects_outside_origin_paths(self):
        for path in ("https://other.example/a.mp4", "//other.example/a.mp4", "relative.mp4"):
            with self.assertRaises(ValueError):
                audit(self.base, [path])

    def test_serializes_actual_responses(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            self.assertEqual(main(["--base-url", self.base, "--path", "/supports.mp4",
                                   "--output-dir", str(folder)]), 0)
            data = json.loads((folder/"http-range-probe.json").read_text())
            self.assertEqual(data["supports_206_count"], 1)
            self.assertEqual(data["human_runtime_approval"], "NOT_REVIEWED")


if __name__ == "__main__":
    unittest.main()

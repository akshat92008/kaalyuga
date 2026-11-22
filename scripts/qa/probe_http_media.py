#!/usr/bin/env python3
"""Read-only Phase 12 HTTP media delivery probe.

Requests HEAD then a small GET Range (bytes 0-1023) for each user-specified
game asset URL. Reads at most 1KiB from each response, never uploads/writes to
server. Run only against a preview server you own; not a performance benchmark
for the actual player's device or a synthetic cold-cache guarantee.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

BYTES_TO_READ = 1024
HTTP_TIMEOUT = 12


def probe_url(url, timeout=HTTP_TIMEOUT, skip_head=False):
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("A complete http:// or https:// URL is required")
    result = {"url": url, "head": {"status": "skipped"} if skip_head else {}, "range_get": {}}
    for method in (("GET",) if skip_head else ("HEAD", "GET")):
        headers = {"User-Agent": "Kaliyuga-QA-Media-Probe/1.0", "Cache-Control": "no-cache"}
        if method == "GET":
            headers["Range"] = f"bytes=0-{BYTES_TO_READ - 1}"
        req = Request(url, headers=headers, method=method)
        started = time.perf_counter()
        try:
            with urlopen(req, timeout=timeout) as response:
                elapsed = (time.perf_counter() - started) * 1000
                content = response.read(BYTES_TO_READ) if method == "GET" else b""
                status = response.status
                headers_out = dict(response.headers)
                row = {
                    "status": status,
                    "first_response_ms": round(elapsed, 2),
                    "content_type": headers_out.get("Content-Type"),
                    "content_length": headers_out.get("Content-Length"),
                    "content_range": headers_out.get("Content-Range"),
                    "accept_ranges": headers_out.get("Accept-Ranges"),
                    "content_encoding": headers_out.get("Content-Encoding"),
                    "bytes_read": len(content),
                }
        except HTTPError as error:
            row = {"status": error.code, "error": str(error)[:250]}
        except (URLError, TimeoutError, OSError) as error:
            row = {"status": None, "error": str(error)[:250]}
        result["head" if method == "HEAD" else "range_get"] = row
    get = result["range_get"]
    result["range_response"] = (
        "supports_206" if get.get("status") == 206 and get.get("content_range")
        else "range_ignored_or_not_supported" if get.get("status") == 200
        else "failure_or_unverified"
    )
    result["caution"] = (
        "Range status is HTTP behavior only; this probe does not measure buffering before "
        "response or end-to-end full playback latency. HEAD support is optional."
    )
    return result


def audit(base_url, paths, timeout=HTTP_TIMEOUT, skip_head=False):
    base = base_url.rstrip("/") + "/"
    if not base_url.startswith(("http://", "https://")):
        raise ValueError("Base URL must be http(s)")
    reports = []
    for path in paths:
        if not path.startswith("/") or path.startswith("//"):
            raise ValueError("Every asset must be a root-relative URL path")
        target = urljoin(base, path.lstrip("/"))
        if urlparse(target).netloc != urlparse(base).netloc:
            raise ValueError("Asset URL unexpectedly leaves the specified server")
        reports.append(probe_url(target, timeout, skip_head=skip_head))
    return {
        "scope": "bounded HEAD and Range GET on one given preview server",
        "probed_at_utc": datetime.now(timezone.utc).isoformat(),
        "requested_paths": paths,
        "head_preflight_skipped": skip_head,
        "responses": reports,
        "supports_206_count": sum(x["range_response"] == "supports_206" for x in reports),
        "human_runtime_approval": "NOT_REVIEWED",
        "limitations": [
            "Timing from the runner is not Mac M3 Air player performance.",
            "A HEAD error alone does not prove GET fails.",
            "A response may serve 206 but still cold-fetch an entire origin object first.",
            "Use repeated controlled cold/warm checks in real staging, and inspect browser media playback.",
        ],
    }


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base-url", required=True, help="Your local/staging game server base URL")
    p.add_argument("--path", action="append", required=True, help="Root-relative media URL, repeatable")
    p.add_argument("--output-dir", type=Path, default=Path("artifacts/qa-independent"))
    p.add_argument("--timeout", type=float, default=HTTP_TIMEOUT)
    p.add_argument("--skip-head", action="store_true", help="Avoid priming server cache via HEAD before the first GET")
    args = p.parse_args(argv)
    if not 0 < args.timeout <= 60:
        p.error("Timeout must be in (0, 60] seconds")
    report = audit(args.base_url, args.path, args.timeout, skip_head=args.skip_head)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir/"http-range-probe.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print("Range 206 responses:", report["supports_206_count"], "/", len(report["responses"]))
    for x in report["responses"]:
        print(f"{x['url']} HEAD {x['head'].get('status')} GET {x['range_get'].get('status')}"
              f" first response {x['range_get'].get('first_response_ms')}ms -> {x['range_response']}")
    # Intentionally no hard fail when 206 is unsupported: it is a signal for
    # engine owner inspection, not an authorized gameplay change.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

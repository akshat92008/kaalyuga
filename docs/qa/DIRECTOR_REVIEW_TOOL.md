# Kaliyuga — independent visual evidence review

This tool **does not change gameplay**. It organizes existing Chromium screenshot
artifacts so a director can inspect effects and animation-frame evidence instead
of interpreting a green CI badge as visual-quality signoff.

## Run

After downloading and extracting the existing `act1-phase1-4` browser-smoke
artifact, from the repository root:

    python3 scripts/qa/build_director_review.py path/to/artifacts/act1-phase1-4

Open `path/to/artifacts/act1-phase1-4/director-review.html` in any browser.
Every thumbnail links to the original full-resolution capture. The generator
also writes `director-review-summary.json` containing evidence status and missing
files. It operates offline using only Python's standard library; it never alters
the source screenshots or the game.

Run its independent unit tests:

    python3 -m unittest discover -s scripts/qa -p 'test_build_director_review.py' -v

## What it checks (and does not check)

- Checks whether `browser-verification.json` declares a passing browser run,
  complete capture coverage, no screenshot errors, and whether every declared
  screenshot is present on disk.
- Displays any `visual-signature-report.json` pixel-liveness results beside the
  corresponding combat screenshots. Missing signature reports are shown as
  `NOT_RUN`, never silently treated as successful.
- Groups the existing title, live-combat, boss, execution, and cinematic screenshots
  for consistent manual assessment.
- **Does not evaluate beauty** or claim artist approval, fluid animation, correct
  blade-tip contacts, full game-story progression, audio, GPU FPS, or Mac M3 Air
  thermals. Review actual moving gameplay and the target machine for those gates.
- Returns a nonzero status if browser coverage is missing or failed, but the HTML
  evidence index is still generated for debugging.

Scope: `scripts/qa/build_director_review.py`, its unit tests, and this document.
No game source files, assets, CI workflows, or agent branches are changed.

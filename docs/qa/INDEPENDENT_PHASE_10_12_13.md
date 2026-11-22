# Kaliyuga — independent Phase 10 / 12 / 13 QA

**Scope:** ChatGPT QA branch, with no changes to Neon or Codex work.

## Phase 12 — static asset footprint
Run: python scripts/qa/audit_asset_footprint.py --tree-json /path/to/github-tree.json --output-dir artifacts/qa-independent

The JSON file must be a nontruncated GitHub recursive Git Trees REST response
for the exact revision. Outputs asset-inventory.json and asset-inventory.md:
tracked media sizes, extension totals, identical Git blob groups, and
large-file inspection candidates. The tool does not download media or alter
the engine. Git source bytes are not real browser transfer size, VRAM, FPS,
or Git packfile storage.

## Phase 10 — audio source and activation audit
Run: python scripts/qa/audit_audio_delivery.py --tree-json /path/to/github-tree.json --output-dir artifacts/qa-independent

Outputs audio-audit.json and audio-audit.md. Parses the game's actual BGM,
SFX and voice registries and the static proxy's intentional filename aliases,
then verifies target paths against the complete source tree. Counts literal
playVoiceBark key invocations in source (dynamic calls may not be detected).

Does NOT prove MP3/WAV audibility, audio loudness/peaks, clipping, HTTP media
range correctness, cue timing, music ducking, or licensing permission.
Unresolved sources need live investigation; no runtime files are altered.

## Phase 13 — screenshot evidence comparison
Render the existing visual review gallery:
python scripts/qa/build_director_review.py artifacts/act1-phase1-4

Compare before/after screenshots captured at matched positions and frames:
python scripts/qa/compare_visual_evidence.py --before /old/screenshots --after /new/screenshots --output-dir artifacts/qa-comparison

Outputs comparison-report.json and amplified difference PNGs. Changed pixels
are a review signal, never an automatic conclusion of good/bad aesthetics.
Matching resolution, camera, game state, and timing is essential.

## Verification
The new QA-only GitHub Actions workflow is:
.github/workflows/qa-independent-phases.yml

It compiles scripts, runs unittest/Pillow regression cases, fetches metadata
without downloading giant asset files, runs both audits, and uploads reports.
It triggers on the QA branch only. It does not alter existing workflows.

Unit tests can be run locally:
python -m pip install Pillow==11.3.0
python -m unittest discover -s scripts/qa -p 'test_*.py' -v

## Release gates NOT covered by static audits
- Real M3 Air GPU frame pacing, VRAM, thermal and long-run stability
- Live cold/warm-cache loading and actual HTTP range response timing
- Full sound audition and checking voice event frequency and rights
- Actual moving combat video reviewed for silhouettes, VFX clarity and
  parashu-to-effect alignment, all bosses, phases and executions
- Revalidation after the Neon and Codex branches have been integrated

"Static audit complete" does not mean Phases 10, 12 or 13 are entirely
production-verified. No automatic merge or gameplay modification is allowed.

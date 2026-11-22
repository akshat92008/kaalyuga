# Kaliyuga independent QA results — 22 November 2026

## Scope and evidence

- QA-only feature branch: qa/director-visual-review-20261122
- Verified workflow run: https://github.com/akshat92008/kaalyuga/actions/runs/44995271861
- Results archive: qa-independent-phase10-12-13 (artifact 14742868475)
- The archive includes full source-file size inventory, audio registry report,
  real audio header results, a director HTML screenshot index and a control
  screenshot diff. No game source, VFX, gameplay or cinematics were modified.

## CI verification

- **23/23 automated unit tests pass** (Python 3.12).
- Static source audits use complete, nontruncated GitHub tree metadata for
  the exact commit. No 3+ GB repository asset checkout was needed.
- Actual checked-out audio: **128/128 readable headers** (Mutagen).
- Historical Chromium game evidence: **22/22 images decoded**; gallery generated.
- Control comparator: all **22/22 captures** self-compared at the same resolution.
  This tests the comparator against real images, NOT a comparison of two builds.

## Phase 12 — source asset footprint

- Media paths (PNG/JPG/FBX/MP4/WAV/MP3 etc.): **2,520**
- Above review-size thresholds: **69** candidates (do not delete automatically)
- Same-blob source path groups: **562** (Git already shares identical blob objects).
- 858 media paths under public/ and 1,662 outside public/.
- Important runtime-candidate examples:
  - public/kaalyuga/dundubhi/model.fbx: approximately 17.2 MiB
  - public/kaalyuga/arena/dundubhi_mandapa.png: approximately 7.8 MiB
  - public/kaalyuga/arena/dundubhi_chamber.mp4: approximately 2.6 MiB
  - public/models/Meshy_AI_Runebound_Minotaur_Warlord_20261025_texture_fbx/Meshy_AI_Runebound_Minotaur_Warlord_Animations.fbx: approximately 25.7 MiB
- Source byte totals are NOT equivalent to per-scene transfer, thermal, VRAM,
  or game FPS. Much source media is never needed in a single room.

**Prioritized follow-up recommendations:**
1. Capture a real load trace for the 17.2 MiB Dundubhi model and concurrent
   entrance arena/video/music, cold and warm cache.
2. Investigate staticAssetProxy's first-request complete-byte buffering before
   responding to Range requests. This is a concrete time-to-first-media risk
   reported in the previous source audit; a streaming redesign belongs to
   the engine owner and should be measured before implementation.
3. On M3 Air, profile video ON/OFF + boss active VFX, frame median/p95 and
   transition stalls. Do not infer Apple GPU FPS from Linux CI software WebGL.
4. Avoid indiscriminate downscaling FBX/PNG models; verify textures and
   silhouettes at actual isometric camera before choosing compression.

## Phase 10 — audio

- Registered audio URLs: **78/78 source paths resolved** after honoring
  CLEAN_ASCII_REPO_MAP (including sources outside public/).
- Unresolved static source paths: **0**.
- **128/128 actual WAV/MP3 files sampled on this QA checkout have readable
  metadata headers**; these are not all tracked audio paths.
- Eight voice keys have no detected literal playVoiceBark call sites:
  dundubhi_charge, dundubhi_death, vrikodara_slag, vrikodara_stagger,
  vrikodara_death, rudra_heavy, rudra_execute, rudra_dash.
- Dynamic voice selection may still trigger these; classify as REVIEW, not
  confirmed missing audio or a runtime bug.

**Next live acceptance:** Listen to those eight contextually, inspect BGM
ducking, first-bark cooldown, peaks and voice intelligibility, and validate
source rights before distribution. Do not auto-spam previously unwired cues.

## Phase 13 — evidence and regression tooling

- Offline director-review HTML generator: checks capture completeness, groups
  title / elemental / execution / boss screenshots and requires human approval.
- Pixel comparator: checks matched capture stems, per-pixel changes and
  different image sizes, writing amplified diff PNGs and a JSON report.
- Applied both to historical *actual* Act I Chromium captures from:
  https://github.com/akshat92008/kaalyuga/actions/runs/44940706905
- A self-comparison is a sanity check, not evidence that the game improved.
  Before/after comparisons require aligned frames from two distinct builds.

## Release gates still open

Phase 12 cannot be fully signed off without target Mac M3 Air GPU/thermal/frame
measurements and real media cold-cache timing. Phase 10 cannot be fully signed
off without listening/rights/latency tests. Phase 13 cannot be fully signed
off without before/after moving video, correct blade contact, all executions,
and full Act I playthrough. The branch remains draft and unmerged.

The reports and scripts are separate from Neon's combat and Codex's cinematics.

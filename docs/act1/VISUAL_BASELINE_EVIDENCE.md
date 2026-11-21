# Act I — Rendered baseline evidence from real Chromium smoke test

**Source:** actual Next.js production app with tracked assets, GitHub Actions run [#44881803607](https://github.com/akshat92008/kaalyuga/actions/runs/44881803607), Chromium 141 + Linux SwiftShader, viewport **1280×720**, all captures at current Act I ultra settings. Screenshots and raw JSON are preserved in the [act1-real-browser-smoke artifact](https://github.com/akshat92008/kaalyuga/actions/runs/44881803607/artifacts/14698576330). This evidence was reviewed; it is not an M3 Air benchmark. It is a **before** snapshot from earlier on this draft branch (commit `55b758fc1f8504619ec5ca783c2332875a43f08d`).

## Actual screenshot observations

| Scene | Observed | Assessment / action |
|---|---|---|
| Chamber 1 | Painted river/shrine arena fills screen. Rudra is rendered and grounded with shadow; distant regular foe visible. HUD legible but numerous small controls. | Scene is usable/readable at idle, but character impact/presentation is small versus dominant background; animation not certified. |
| Chamber 4 | Dundubhi appears at far right. Arena and mid-boss health/posture bar visible. **Top-right menu buttons physically overlap boss health/name UI.** | HUD is a confirmed defect; corrected by shifting utilities below boss bar on this branch. Re-capture required. |
| Chamber 8 | Vrikodara appears at far right; phase 1 and HP/posture clear. **Top-right menu buttons overlap boss bar.** | Same HUD fix. Bosses need stronger entrance/fight-scale impression; static single frame cannot establish animation weight. |

All three captures entered `playing`, main 1280x720 canvas present, no JavaScript page exception, and no HTTP 4xx/5xx in the collection. `net::ERR_ABORTED` audio/video requests were recorded (possibly intentional player-transition cancellations); do not assume every sound played correctly.

## Raw frame timing (Linux software WebGL — NOT target hardware)

| Chamber | Median frame | p95 | p99 | Mean-based estimated FPS |
|---:|---:|---:|---:|---:|
| 1 | 116.6ms | 633.31ms | 733.4ms | 3.83 |
| 4 Dundubhi | 133.3ms | 483.3ms | 616.6ms | 6.00 |
| 8 Vrikodara | 83.4ms | 450.0ms | 733.3ms | 5.94 |

These are low-sample initial-load/capture estimates on a CPU/software renderer, **not gameplay steady-state measurements**; they show that this exact CI hardware is severely GPU-limited. No claim about 60 FPS on macOS is justified. The `Act1FrameProfiler` raw RAF measurement is meaningful, unlike the previous clamped HUD counter.

## Verified changes following this baseline

- Boss HUD controls moved down so Dundubhi/Vrikodara health and names are not covered.
- Added actual `performance` quality settings lowering VFX pixel ratio, spark count/live cap, and disabling the optional GPU bloom pass. Main gameplay visual actors and their attack trails stay visible.
- Added short, skippable and non-blocking in-engine 2.5D boss entrance/phase and execution camera cues, priority-ordered and interruption-safe.
- Added a bounded raw frame-time profiler and opt-in capture script.

**Status:** Those are code modifications, not certified **after** visual improvements until fresh screenshots of the same conditions are reviewed.

## Additional Blender evidence

The [Rudra rig preflight run #44881803618](https://github.com/akshat92008/kaalyuga/actions/runs/44881803618) succeeded as a diagnostic:
- Canonical Rudra mesh: **78 bones**, **1 skinned mesh**, **1 UV-mapped mesh**.
- Reference `Standing 1H Magic Attack 01.fbx`: **57 bones**, **1 action**, duration **2.3 seconds** at imported scene frame rate.
- Direct skeleton equality **FALSE** (extra bones in canonical); normalized missing names **0**. The clip has compatible naming for the bone subset but **requires retarget/stabilization validation** — do not blindly treat an armature-count mismatch as proof of visually invalid motion, nor as an approved animation retarget.
- The audit intentionally did not export a new retargeted clip or certify foot sliding / weapon grip.

## Blockers to a real final visual verdict

Need: 1080p + 720p screenshots for all 8 rooms, live gameplay recordings of light/heavy/parry/Astras, boss charge/pillar impact, Vrikodara phase transition, after-cue camera restoration, repeated win/lose, GPU performance on a real Apple Silicon Mac, and direct sound validation.

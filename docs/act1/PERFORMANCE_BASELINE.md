# Act I — Performance baseline: **measurement not yet established**

**Do not substitute claims for FPS data.** This report is a **baseline protocol and known-code-state record**, not a Mac M3 Air benchmark. No local game execution, WebGL profiling or complete playthrough was performed when first authored.

## Existing engineering safeguards (confirmed in code/CI, not hardware)

- GitHub Actions run #53 on prior draft PR: TypeScript, selected unit tests, Next.js production build **passed**. That does **not** measure gameplay latency.
- Gameplay canvas caps device pixel ratio to **1.0**; title/game render systems use shared 3D render resources.
- Game estimates FPS as `frameCounter / fpsAccum` on a 0.5s window, **clamped at 60**. This obscures 120/144 Hz vs a 60 FPS ceiling and ignores tail-frame latency.
- Simulation `dt` caps a single frame at 0.05 s to bound gameplay steps. Raw frame durations must also be recorded to reveal hitches.
- 3 concurrent FBX load slots, capped atlases (Rudra 128 frames, boss/enemy 48), released gameplay MP4s, limited caches and Susanoo GLBs already exist.
- `engine/ue5GraphicsEngine.ts` defines three backwards-compatible stored quality tiers: ultra/high/balanced; they are not equivalent to a measured Performance/Balanced/Cinematic ladder.

## What to measure for each run

| Metric | Collection | Target |
|---|---|---|
| FPS median, p95 frame time, p99 frame time, max frame | requestAnimationFrame raw `now - lastTime`, skip startup/hidden tabs | 60 FPS where supported; publish actual |
| Frame spikes `>33.3 ms` and `>50 ms` | bounded counter | quantify stutters |
| Startup-to-first-control, chamber transition | monotonic clock + loaded state | measure, do not invent |
| Browser JS heap | `performance.memory` if available | no upward drift over 3 full loops |
| GPU texture/geometries/programs | Three.js `renderer.info.memory` + program count where exposed | stable after repeats |
| WebGL context loss | browser log/events | zero unexpected losses |
| Network media bytes | browser PerformanceResourceTiming | compare original FBX vs optimized |
| Boss spikes | record markers on Dundubhi charge/impact, Vrikodara phase, rage | no unbounded stalls |
| Input latency/contact | timestamp input and first visible active frame | record measured delta |

**Do not assert any numeric FPS, heap or load latency until recorded on the actual machine with full assets.**

## Repeatable manual benchmark

1. Use a development build with logging/performance HUD opt-in; do not expose debug UI to release users.
2. Test at 1280×720 and 1920×1080; specify GPU renderer/driver, DPR, OS, preset, refresh rate, browser and power state.
3. Capture 30s idle + 60s active combat + 20s boss transition per chamber; repeat 3 times.
4. Warm and cold loading measured separately, record resource transfer size, crashes, 404s and failures.
5. Repeat hub → Dundubhi → Vrikodara → restart three times and track heap, material count, textures and unbounded caches.
6. Screenshot/contact sheet at 4–6 specific attacks per encounter, compare readability after optimization.

## Priority suspected bottlenecks

- Multiple FBX parses + animation retargeting on the browser main thread.
- Repeated offscreen canvas snapshots and 2D effect compositing.
- 1100-frame prior Rudra cache (already reduced); pixel/texture references retained in other maps.
- Excessive WebGL overlay draws and frequent particle allocation.
- Very large source image/video assets. Switching MP4 scenes mid-fight was already disabled.
- Stage/context resets without full GPU texture disposal: track `renderer.info` and browser memory to prove improvement.

## Current status

**Measured baseline: pending.** Automated typechecks/unit tests and a successful Blender conversion exist, but no authoritative per-chamber performance table. A benchmark should never be labeled "passed" merely because a 60 FPS counter is visible.

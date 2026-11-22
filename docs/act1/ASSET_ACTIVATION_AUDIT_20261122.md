# Act I asset activation audit — 22 November 2026

Branch is based on `main` (prior to Meru integration). **No VFX replacement** or shader/art-style change is proposed here.

## Confirmed gameplay activation defects
- `KaliyugaArena.tsx` initialized `videoBgEnabled: false`, so animated arena videos were never requested for normal gameplay unless HD VIDEO BG was manually switched on. Branch changes default to true while retaining the existing button for low-spec fallback. **Do not merge without M3 Air performance checking.**
- `audio.ts` treated an unknown prior sound timestamp as `0`, suppressing a first bark triggered during the first 1500 ms after page load (and some first SFX). Branch corrects cooldown behavior and adds targeted tests.
- 19 curated voice clips exist in the configured engine; only 10 are explicitly invoked by `KaliyugaArena.tsx`. The nine unconnected keys are: `dundubhi_charge`, `dundubhi_death`, `vrikodara_slag`, `vrikodara_stagger`, `vrikodara_death`, `smith_temper`, `rudra_heavy`, `rudra_execute`, `rudra_dash`. Trigger design and vocal frequency require actual audio review; do not wire them to every frame or spam them.
- All 96 explicit clean-name aliases in `staticAssetProxy.ts` mapped to tracked source paths in the current `main` tree. Thus many URL/path mismatches seen in a naive path check are **intentional**.
- `staticAssetProxy.ts` cold-fetches the *complete asset* before serving range requests. This can delay MP4 or voice/audio first playback, even with correct aliases. Profile and optimize server streaming/caching before claiming smooth playback.

## Character and animation review
- `new 3D assets and animations/Animations/` contains 584 FBX path entries across 17 animation pack directories.
- Rudra gameplay selects only 10 local action states with 10 fallback URLs. Existing clips require pose and rig compatibility review rather than blindly exposing every FBX.
- Boss renderer applies anime toon and ink-outline helpers to both Dundubhi and Vrikodara. Yet several gameplay paths instantiate the offscreen renderer at 224–256 pixels, leading to potential enlarged-image softness. Raising resolution may worsen boss lag: benchmark before altering.
- Rudra's axe attachment currently uses a fixed `weaponGroup.rotation.set(-PI/2, 0, -PI/2)` with offset; the backwards-axe report requires hand/socket/geometry visual inspection in Blender, not speculative rotation values.

## Visual preservation
- Keep `elementalImpactDirector.ts` and `webglDemonSlayerVfx.ts` as the working VFX pipeline.
- Agni's `spawnSolarFlameWheel` is a likely candidate for **within-pipeline** visual redesign (more blade-following calligraphic flame, fewer geometric spirals).
- Preserve the progress made with green Vayu effects; improve actual distance/readability.
- Do not call effects Demon Slayer-quality solely because tests passed. Assess screenshots and recorded gameplay at normal isometric distance.

## Required manual acceptance before merging
1. On M3 Air: normal entry and all eight chambers should display actual moving MP4 frames (including alternate boss phase video) without damaging FPS.
2. Loading progress must be measured on a cold cache, warm cache and bad network. Verify media GET/206 and playback start.
3. Play boss intro voice lines immediately after entering a fresh room, at start of new session.
4. Benchmark boss FPS/frametime with video ON and video OFF, and inspect toon lines with both settings.
5. Preserve the earlier playable baseline and keep current Meru integration isolated until coordinated merge.

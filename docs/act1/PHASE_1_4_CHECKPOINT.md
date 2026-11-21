# Kaliyuga Act I — Phase 1–4 implementation checkpoint
Date: 21 November 2026
Branch: feature/phase1-4-cinematic-combat-20261121

This document records code that exists on the branch, NOT an AAA visual-quality sign-off.
Do not mark any phase as "100%" until the acceptance checks below have been performed
on the actual game in a browser and animations have been inspected.

## Phase 1: elemental Parashu combat direction
Changed: lib/game/elementalImpactDirector.ts, lib/game/elementalImpactDirector.test.ts,
and KaliyugaArena.tsx heavy attack active-frame callback.
- Existing heavy impact paths are composed through a central, bounded effect director.
- Agni: wheel + grounded shockwave. Varuna: flowing water-serpent and directional ribbon.
- Vayu: emerald gale + narrow trailing slash. Vajra: forked bolt and crisp strike flash.
- Guardian (while Rudra transform active): crimson cleave, ring and impact flash.
- Heavy effects spawn at the active-frame contact point, not at attack button-down.
- Independent heavy budget caps avoid unrestricted full-screen particle accumulation.
- Existing Digit4 Varuna special, three Astra identities, normal combo light trails,
  executions, and current guardian implementation are preserved.
Still needed: actual blade-tip socket-driven trajectory (some geometry uses an
approximate swing contact offset), scene screenshots, gameplay-camera visibility
test, and measured low-end performance under combined boss effects.

## Phase 2: Rudra animation recovery & frame continuity
Changed: lib/game/rudra3dRenderer.ts, lib/game/rudraAnimationTiming.test.ts.
- Corrected a concrete double-trim bug in baked Parashu clip sampling.
- Normalized attack progress now maps once into the [0.14,0.88] clip interval.
- Stance transitions and attack recovery use a tiny 2D sprite crossfade.
- Hurts, parries and dashes bypass smoothing so responsive contact is not smeared.
Still needed: rig retarget inspection, foot planting, 3D-to-sprite transition
comparison video, and visual review of clip speed and grip on the real model.

## Phase 3: Blender animation-processing pipeline
Changed: cutscenes/scripts/process_rudra_animations.py.
- Deterministic FBX import, compatible bone-path validation, NLA assembly,
  GLB export, optional PNG preview, and JSON validation report.
- Rejects unknown bone paths and nonfinite keyframes rather than pretending
  that a clip was successfully retargeted.
- Never overwrites source assets.
- Validates existing clips first; does not invent new authored executions.
Still needed: RUN Blender (not installed in this working environment),
inspect generated mesh/animations, retarget mismatched actions, and author/test
Downward Crush, Sweeping Execution, and Armor Break paired enemy reactions.
A skeleton-name match does not prove correct motion or foot contact.

## Phase 4: hybrid 2.5D cinematic camera
Changed: lib/game/cinematicCamera.ts, lib/game/cinematicCamera.test.ts,
components/game/DundubhiCinematicLab.tsx.
- Bounded, deterministic keyframe shot framing with smooth interpolation.
- Screen-resolution-independent offsets and a short decaying impact impulse.
- Hard skip/interruption restores the resting camera and stops audio playback.
- Isolated Dundubhi preview: multiple authored camera moments and Skip control.
Still needed: integrate timeline with the LIVE boss entrance, execution sequence
and transitions in KaliyugaArena; handle gameplay-lock restoration there; verify
camera with all arena geometry, skip states, restarts and different screen sizes.

## How to run the targeted checks
From the repo root, with dependencies installed:

    npm ci
    npm run test:phase1-4
    npx tsc --noEmit
    npm run build

Run the Blender diagnostic on a machine with Blender installed:

    blender -b --python cutscenes/scripts/process_rudra_animations.py -- \
      --model "public/new_3d_assets/Animations/Pro Melee Axe Pack/Meshy_AI_Ashen_Warborn_20261025_generate.fbx" \
      --clips public/kaalyuga/anims/rudra \
      --output build/rudra_processed

Review build/rudra_processed/validation_report.json and the exported assets.
The generated image is a rig preview, not acceptance evidence for execution
animation quality. Missing Blender, GPU playback, or source files must be
reported explicitly.

## Release acceptance checklist (not yet signed off)
- Test all light/heavy combinations for Smash/Pillar/Thrust, the Varuna
  special, three Astras and guardian rage, including simultaneous boss VFX.
- Watch contact timing in screen recordings at normal game camera and close-up.
- Observe stable visible silhouettes and no giant square/offscreen clipping.
- Play and interrupt every execution without frozen input or misplaced player.
- Repeatedly skip Dundubhi cinematics and restore normal gameplay camera.
- Validate exported GLB clips visually, including feet/hand/socket alignment.
- Test visual quality presets and measured frame times on intended hardware.
- Complete a full Act I playthrough and compare before/after recordings.

Status: implementation work in progress; **not** 100% complete or AAA certified.

## Latest verified status — 22 November 2026

**Verified branch commit:** `3429336d0d06784406f374ba14c28367f4f762f1`  
**GitHub Actions evidence:** https://github.com/akshat92008/kaalyuga/actions/runs/44940706905

The latest full CI run completed successfully with both jobs green:

- **Full TypeScript check and production Next.js build:** passed.
- **Gameplay Chromium run with real WebGL software rendering:** passed. Opened the title, loaded the playable room, served the actual axe/rig/animation FBX assets, and executed the game input pipeline.
- **Light and heavy Parashu, Agni, Vayu, Vajra, all three Astras, Varuna water, and transformed Guardian:** contact events and relevant screenshots recorded.
- **Downward Crush, Spin 360 Cleave, Impaling Lunge:** once-only damage contact and camera recovery confirmed. Escape during execution camera did not cancel damage or lock input.
- **Dundubhi:** entrance camera stays paused while narrative dialogue is visible, resumes after ENGAGE, skips safely; separate 16:9 cinematic synchronized arena+boss zoom, video restored after skip, replay works.
- **Visual presence:** all **12** pixel-based color signature checks passed for the expected element within the combat focus area (this verifies liveness, not visual artistry).
- **Browser evidence:** 22 successful frame captures (including JPEG fallback for stalled PNG readback); no uncaught errors and no missing captures.
- **Blender:** imported the actual Rudra FBX rig and ten clips, exported a skinned animated GLB, rendered a preview and passed output verification.

### Release gates that STILL require human/gameplay acceptance

1. Frame-by-frame observation of the actual blade/head-to-effect alignment; the live sprite renderer uses approximate world-space contact positions, not a continuously sampled Parashu bone-tip socket.
2. True authored three-clip execution choreography and matching enemy reactions. The current system reuses existing FBX actions with authored contact beats/camera/VFX; code-level differences alone do not make a bespoke cinematic execution.
3. Visual direction review: Agni still has significant ring-like silhouette, water can read as a blue loop, characters appear small at some standard gameplay zooms, and fighting effects can obscure animation posing.
4. Measured frame-time / thermal / memory testing on the target **MacBook M3 Air** in extended fights with overlapping boss effects. Software WebGL CI proves render correctness, not 60 FPS on target hardware.
5. A complete human-played Act I sequence across arena changes, boss phases, transitions, Save/Load, and cutscenes.

**Conclusion:** Phase 1–4 is functionally implemented and verified under the defined automated checks. It is **not yet accepted as 100% AAA-quality or performance-certified**. Do not merge the draft PR to main solely because CI is green.

## Verification evidence update — 21 November 2026

A headless Chromium pass has actually exercised the game's start button and
live debug combat room (not just component tests). The saved evidence includes
screenshots for Agni, Vayu, Vajra heavy contact; the light Parashu; Agneyastra,
Vayavyastra, Vajrastra, Varuna water-dragon and guardian effects; and the live
Dundubhi boss camera entrance/skip. The browser test report recorded a final
**FAIL** in the separate cinematic lab: it waited to click Skip after the
8.6-second timeline had already auto-completed while heavy 3D screenshots were
being captured. The smoke script was corrected to restart and click Skip on an
active timeline; **the corrected run must pass before sign-off**.

A separate Blender verification report records **10 accepted animations,
57 bones, 1 skinned mesh, 960x540 preview**, with a passing export check.
This validates import/export mechanics, not the artistic quality of every
animation or finished execution choreography.

An automated GitHub Actions unit-test workflow now exists at
`.github/workflows/phase1-4-verify.yml`. Its status should be checked in
the repository Actions tab. Do not count an unexecuted workflow as a pass.

**Remaining release gates:** a fully passing browser smoke run with evidence,
all three executions played and interrupted in actual combat, blade-tip
contact synchronization visually inspected frame by frame, all elemental
light/heavy permutations checked, and real-hardware performance evaluation.
Keep Phase 1–4 open until those gates are satisfied.

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

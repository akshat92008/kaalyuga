# Combat animation

The player renderer samples poses into a cache keyed by action, stance, yaw, animation step and hit flash. At baseline the 24-step GPU attack sampler converted progress to the trimmed interval before choosing a step, then trimmed it again. This left steps 0–2 and 22–23 unreachable. The corrected sampler uses the full range of indices and maps each index into the source clip once. Pure vertical movement also uses the supplied zero horizontal direction.

For Rudra the inspected model and ten bundled action clips each contain 57 bones. Bone counts alone cannot establish bind-pose compatibility, foot contact or grip quality. The attack clock, hit-stop and slash orientation need a simultaneous game-camera recording. Executions already select downward crush, spin or lunge. A synchronized armor-break execution and paired enemy reaction still need authoring and visual validation.

The production boss files in the Creature Pack (4) and Pro Melee Axe Pack (5) each contain a 33-bone weighted mesh. The separate bundled Dundubhi model is static and the five bundled boss clips each contain 65 bones. Always identify the path used by the current renderer before retargeting. The avatar asset has no armature. Use a separately weighted derivative before trying to bind the creature or axe animations to that sculpt.

## Execution contact timing

Blender 5.3 imported the canonical rig and evaluated each existing finisher action on it. The maximum frame-to-frame right-hand displacement in the downward clip occurred on frame 26 of 1–69. The sweep peaked at 33 of 1–96 and the thrust at 32 of 1–83. Mapped through the runtime clip window of 14–88%, the provisional contact markers are 0.308, 0.266 and 0.322. These measure hand motion. Final blade-to-enemy contact still needs comparison from the gameplay camera.

The execution now schedules damage, reaction, sound, hit-stop and rewards together on that marker. Interrupting the action or leaving the chamber cancels pending contact. The original animation assets remain the runtime source. The Blender script exports a separate in-place GLB and per-frame hand positions for review:

```sh
blender -b --python-exit-code 1 -P cutscenes/scripts/prepare_rudra_execution.py -- \
  --model public/kaalyuga/rudra/rigged.fbx --clip public/kaalyuga/anims/rudra/heavy.fbx \
  --output /tmp/rudra-downward-review.glb
```

Use cast.fbx or attack3.fbx with a fresh output filename to reproduce the other two. Blender normalized the four largest weights per vertex during export. The diagnostic GLBs have not been promoted to release assets.

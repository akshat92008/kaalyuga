# Act I — Combat and animation audit

**Evidence:** Static analysis of `KaliyugaArena.tsx`, `modernCombat.ts`, `rules.ts`, `rudra3dRenderer.ts`, `enemy3dRenderer.ts`, `boss3dRenderer.ts`, `enemyAiStability.ts`, `visualCohesion.ts`. This is **not** a frame-by-frame review of captured gameplay.

## Already implemented

- Attack phases: `computeActionFramePhase` returns startup/active/recovery and input buffer. Light combo, stance heavies, dodge (0.16s), i-frames (0.13s), parry, execution and rage are represented.
- Rig/clip pipeline: Three.js FBX loading, clip binding/retargeting and state playback for Rudra, enemies and bosses. `resolveAtomicEnemyAnimState` keeps hit flashes from resetting committed attack animations.
- Weapon timing utilities: `evaluateStrikeActiveFrameGate`, `computeTrimmedCleaveClock`, `computeWeaponSlashRibbon`. They establish a basis for timed weapon/VFX contacts.
- Baseline tests cover parry and timing logic but do not prove rendered contact synchronization.

## Likely issues — verify before changing moves

1. Multiple entry points fire VFX/sounds from button handlers while physical animation advances in render loop. **Trace active frames** before moving any damage; changing hit registration alters balance and must be reviewed.
2. `Rudra3DRenderer.renderFrame()` selects quantized atlas frames from mixed clip sources, potentially exaggerating animation snapping or grip errors. Record active state/frame index/weapon contact over 30–60 frames.
3. Enemy clip mappings are archetype-specific; cannot assume all NPCs have idle/chase/windup/attack/hurt/death. Script a clip-coverage audit against actual imported armatures.
4. Dundubhi: charge anticipation, pillar collision, armor break and stagger logic present. Whether hoof impacts, body orientation, pole geometry and pillar hit frames align is **unverified**.
5. Vrikodara: phase transitions and furnace moves present, but giant anatomy, blade trajectories and foot sliding require video inspection.
6. Kala-Bhairava: separate skeleton renderer and core-lock exist; verify model has correctly skinned vertex deformation and never clips its offscreen canvas.
7. A large camera kick or hit-stop should occur on actual contact, not before/after a simulated hit.

## Animation state checklist

| State | Evidence | Required verification |
|---|---|---|
| Idle, run, dodge | existing state logic | root and feet do not slide |
| Light 1/2/3 | available attack states | three distinct readable silhouettes, combo timing |
| Heavy / charged heavy | `heavy_unleash` + styles | weight, preparation, active hit aligns with cleave |
| Parry / perfect parry | current action + evaluation | defensible counter window, exact audio contact |
| Cast / Astras | current state handling | posture and projectile origin |
| Stagger / hurt / death | rig states | no interrupted loops or frozen enemies |
| Execution | `execute` in gameplay | camera, enemy alignment, interrupt recovery |
| Rage / astral attack | `Susanoo3DRenderer` | bone movement and non-overlap with Rudra |

The state labels above are audit targets; not all are separate animation clips.

## Test protocol (required to certify)

For Rudra and each major archetype, capture normalized pose at 0, 10, 20, 40, 60, 80 and 100% of each clip; inspect feet, hips, right/left hands and weapon tip against an anchor. Record the first effective collision frame and whether the trail and sound peak there. Repeat at 30/60 FPS, left/right headings, after dash cancel and during hit-stop. Record failure and exact asset path rather than substituting a generic animation.

## Pass criteria (future)

No weapon/hand separation; no unplanned root drift; no active-frame duplicate damage; no hit flash cancel of windup/attack; no stalled recover; boss charge matches corridor; all executions return input control.

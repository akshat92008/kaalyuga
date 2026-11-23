# Phase 0 — Combat & Animation Audit (`Kaliyuga: The Bleeding Crown`)

**Date:** 2026-11-22  
**Inspected Files:** `KaliyugaArena.tsx`, `rudra3dRenderer.ts`, `combatPipeline.ts`, `modernCombat.ts`, `enemyArchetypesAndTelegraphs.ts`, `enemyAiStability.ts`, `bossEncounters.ts`.

---

## 1. Rudra 3D Rig & Parashu Weapon Socket Verification (`rudra3dRenderer.ts`)
- **Canonical Skeleton:** `/kaalyuga/rudra/rigged.fbx` bound 1:1 to `Ashen_Warborn` textured geometry (`493,632` verts), height normalized to `1.48m` (`baseGroup.position.set(0, -0.06, 0)`).
- **Studio Camera Framing:** `PerspectiveCamera(33, 1, 0.1, 100)` at `(0, 1.90, 3.92)` looking at `(0, 0.78, 0)`, baked into `256×256` frames (`HEROIC_DRAW_SIZES.rudra = 136px` base draw size in arena).
- **Parashu Attachment (`lines 415–464`):**
  - Attached directly to `mixamorigRightHand` (fallback `RightHand`) via `weaponSocket: THREE.Group`.
  - Normalized weapon length `desiredWorldLen = 1.04m`, rotated `(-Math.PI/2, 0, -Math.PI/2)` and shifted `+0.26 * maxDim * localWepScale` along local `X` inside `weaponSocket`.
  - `createParashuFlameSheathGroup(maxDim * localWepScale)` is already mounted inside `weaponSocket`, confirming the Parashu's primary shaft-to-blade axis extends cleanly along `weaponSocket`'s local `+X` axis!
- **Baked Frame Quantization (`lines 186–206, 710–744`):**
  - `yawBuckets`: `12` on GPU / `6` on software WebGL.
  - `steps`: `24` (GPU) / `12` (software) for attack clips (`attack1`, `attack2`, `attack3`, `heavy`, `cast`), trimmed once to active clip slice `[0.14..0.88]` of clip duration.
  - **CRITICAL DEFECT FOR PHASE 1:** After `renderer.render(this.scene, this.camera)`, `renderFrame()` caches only the 2D `HTMLCanvasElement` sprite and **discards the 3D world-space blade root/tip coordinates and depth Z**. As a result, `KaliyugaArena.tsx` has no knowledge of where the Parashu blade actually is on any frame.

---

## 2. Exact Combat Timing & Frame-0 Desync Audit (`KaliyugaArena.tsx`)

| Combat Path | Current VFX Timing | Current Damage / Recoil / Audio Timing | Defect Severity |
|---|---|---|---|
| **Light Combo 1–3 & Combo-4 Finisher** (`triggerLightAttack`, lines 5620–5850) | `pendingStrikeVfxRef` waits until `weaponSwingProgress >= 0.25` (Combo 1–3) or `0.28` (Combo 4). | `sim.enemies.forEach(...)` executes **synchronously on frame 0** of the button press (line 5705): damage, enemy recoil, parry deflect, hit-flash, knockback, and hit SFX all trigger *before* Rudra's axe swings forward! | **CRITICAL** — Visual cleave lags ~90–140ms behind actual enemy damage and recoil. |
| **Heavy Stance Unleash** (`triggerStanceHeavyUnleash`, lines 4971–5220) | `pendingStrikeVfxRef` waits until `weaponSwingProgress >= 0.28`. | `sim.enemies.forEach(...)` executes **synchronously on frame 0** (line 5155); `soundEngine.playSwing` + `playBreathingStyle` fire at frame 0 while `playHeavyIronSwing` fires at 0.28; battle scar & screen flash also fire at frame 0! | **CRITICAL** — Heavy impacts feel disconnected from the downward slam / sweeping release. |
| **Dodge / Stagger / Death Interruption** | `pendingStrikeVfxRef` can remain armed or spawned static ribbons continue spinning through mid-swing cancels. | Action switches immediately to `dodge`/`hurt`, but spawned static ribbons do not halt trail generation cleanly. | **HIGH** — Violates Roadmap §1.4 interruption rules. |
| **Action Frame Phases (`modernCombat.ts`)** | `computeActionFramePhase()` already defines clean normalized windows: Light (`startup < 0.22`, `active 0.22..0.68`, `recovery > 0.68`), Heavy (`startup < 0.26`, `active 0.26..0.70`, `recovery > 0.70`). | Not currently driving hit resolution in `KaliyugaArena.tsx`. | **OPPORTUNITY** — Phase 1 will bind both blade-trail emission and enemy hit resolution directly to this exact active window with per-`attackSerial` enemy deduplication! |

---

## 3. Stance × Element Coverage Gaps
- **Smash (`[1]`) → Agni (Fire)**: Supported on Light, Combo-4, Heavy, and Agneyastra (`Q`).
- **Pillar (`[2]`) → Vayu (Emerald Wind)**: Supported on Light, Combo-4, Heavy, and Vayavyastra (`E`), but Heavy currently produces a tiny 100px swirl.
- **Thrust (`[3]`) → Vajra (Thunder)**: Supported on Light, Combo-4, Heavy, and Vajrastra (`R`), but lightning forks detach into floating twigs.
- **Varuna (Water)**: Currently only triggered via `[4]` (`Constant Flux` burst). Needs first-class **Varuna Light/Heavy weapon stance or Water Infusion visual treatment** (preserving `[1][2][3]` + `[4]` controls cleanly so Varuna Light/Heavy combos + Constant Flux Water Dragon are all visually extraordinary).
- **Phase 2 & 3 Scope Note:** Full skeleton retargeting, cross-clip animation blending, and 3 Blender executions remain cleanly scheduled for Phases 2 and 3; Phase 1 provides exact hit-marker hooks without breaking Rudra's current clips.

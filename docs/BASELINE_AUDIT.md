# Phase 0 — Baseline Technical Audit (`Kaliyuga: The Bleeding Crown`)

**Date:** 2026-11-22  
**Scope:** Act I only (`Vaitarani Hub` + Chambers 1–8 + `Dundubhi` + `Vrikodara`)  
**Engine Stack:** Next.js 15.4.9, React 19.2.1, TypeScript 5.9.3, Three.js (`WebGLRenderer` + 2D hybrid isometric `<canvas>`), Meru Engine (`engine/*`).

---

## 1. Reproducible Build, Test & Verification Commands

| Check | Exact Command | Baseline Result (2026-11-22) |
|---|---|---|
| TypeScript + Next.js Production Build | `npm run build` / `compile_applet` | **PASS** (0 errors) |
| Full Unit Test Suite (`lib/game/*.test.ts`) | `npx --yes tsx --test lib/game/*.test.ts` | **167 / 172 PASS** (5 pre-existing failures documented below) |
| Targeted ESLint on Modified Files | `npx eslint <changed files>` | **PASS** (Note: repo-wide `eslint .` hits V8 4 GB heap OOM on 13.5k-line `KaliyugaArena.tsx`) |
| Live Browser QA Harness | `http://localhost:3000/?chamber=1&debug=1&qaFixtures=1` | **PASS** (0 console errors; `rudra3dReady=true`, `webglVfxReady=true`) |

### Pre-Existing Baseline Unit Test Failures (5 of 172 — Unchanged from Upstream Repo)
1. `soundEngine.resolveTrackForState`: Expected `/audio/repo/mythic_sanctuary.mp3`, actual `/audio/repo/vaitarani_realm.mp3` (upstream BGM rename not synced to test).
2. `phase3RosterAndSilhouettes.test.ts`: Expected rim color `#cbd5e1`, actual `#ffe6be` (upstream rim color update not synced to test).
3–5. `rudraAssetPaths.test.ts` (3 assertions): Checks `fs.existsSync(public/...)` for `/kaalyuga/rudra/rigged.fbx`, `/kaalyuga/anims/rudra/idle.fbx`, and `/animations/pro_melee_axe/standing idle.fbx`. In AI Studio, these static binary assets are served on demand via `/api/static/*` proxy (`lib/server/staticAssetProxy.ts` + `next.config.ts`) rather than checked into local `public/`.

---

## 2. Core Gameplay Architecture Status Matrix

| System / File | Lines | Status | Assessment & Phase Routing |
|---|---:|---|---|
| `components/game/KaliyugaArena.tsx` | 13,500 | **Partially Functional / Visually Defective** | Full Act I gameplay loop, hub, 8 chambers, bosses, controls, progression, and QA hooks work cleanly. **Critical Phase 1 defects:** frame-0 hit resolution desynced from `pendingStrikeVfxRef` (`triggerLightAttack:5633`, `triggerStanceHeavyUnleash:4971`); single foreground VFX draw pass on top of Rudra (no behind-to-front wrapping); legacy 2D hit flipbooks/sparks layered over WebGL VFX. |
| `lib/game/combatPipeline.ts` | 553 | **Functional** | Pure `receiveHit()`, `formatCleanDamageNumber()`, `selectParashuFinisherVariant()` (`downward_crush`, `spin_360_cleave`, `impaling_lunge`), hit-stop (30–70 ms), trauma clamps (`<= 0.85`). |
| `lib/game/modernCombat.ts` | 600 | **Functional** | Explicit `computeActionFramePhase()` (`startup` / `active` / `recovery` + 120ms input buffer), Golden Parry evaluation, See-Through/Riposte, Kala-Rewind, Shadow Blink, Style Rank (`D`–`SSS`). |
| `lib/game/rules.ts` | 693 | **Functional** | Stance math (`smash` / `pillar` / `thrust`), combo damage scaling, Tapas Focus Orbs (0–4), posture break, shrine upgrades, difficulty presets. All tests pass. |
| `lib/game/elementalImpactDirector.ts` | 137 | **Partially Functional** | Routes heavy releases by element (`agni`, `varuna`, `vayu`, `vajra`, `guardian`) cleanly; needs expanded Phase 1 light/heavy/finisher/Astra blade-attached routing while keeping `guardian` untouched for Phase 8. |
| `lib/game/astraEngine.ts` | 463 | **Functional** | Agneyastra (`Q`), Vayavyastra (`E`), Vajrastra (`R`), `Upasamhara` second-press withdrawal (+10 Astra Energy refund), Soaked + Vajra chain lightning synergy. Needs distinct Demon Slayer-grade visual geometry per Astra in Phase 1. |
| `lib/game/enemyArchetypesAndTelegraphs.ts` | 797 | **Functional** | Deterministic windup specs, Ironmaw shield front/backstab rules, and additive flipbook ground telegraphs for regular enemies, Dundubhi, and Vrikodara. Must remain visually readable under Phase 1 VFX. |
| `lib/game/enemyAiStability.ts` | 360 | **Functional** | Atomic enemy anim commitment, hard recovery freeze watchdog, dynamic camera zoom (`0.81`–`0.96`), `HEROIC_DRAW_SIZES`, and Kala-Bhairava Susanoo core-lock (preserved for Phase 8). |
| `lib/game/bossEncounters.ts` | 895 | **Functional** | 3-phase signature move suites for Dundubhi (Chamber 4) and Vrikodara (Chamber 8), pillar-bait trajectory, molten slag fissures, sonic drum zones, consume/reclaim punish. |
| `lib/game/rudra3dRenderer.ts` | 858 | **Partially Functional / Missing Blade Pose Export** | Loads Meshy `Ashen_Warborn` + `Pro Melee Axe Pack` clips + 3D `Parashu` attached to `mixamorigRightHand` (`weaponSocket`), bakes 256×256 cel-shaded frames. **Critical Phase 1 gap:** discards 3D `weaponSocket` blade root/tip coordinates after baking, leaving `KaliyugaArena` to guess hardcoded slash offsets. |
| `lib/game/webglDemonSlayerVfx.ts` | 2,780 | **Visually Defective / Un-Pooled** | Contains Three.js orthographic overlay + half-res `UnrealBloomPass`. **Critical Phase 1 defects:** raw 3-octave FBM noise strips, detached floating chili-pepper flame tongues (`spawnSolarFlameWheel`), tiny weak Vayu heavy swirl, disconnected lightning fork fragments (`spawnThunderZigzag`), single foreground pass, and per-spawn `BufferGeometry`/`ShaderMaterial` allocations. |
| `lib/game/assets.ts` | 1,007 | **Functional** | Manifest for all 8 MP4 chambers, Vaitarani Hub, weapons, audio, and flipbooks. Works via `/api/static/*` proxy. |
| `engine/ue5GraphicsEngine.ts` | 313 | **Functional (Partially Unused in Arena)** | Defines `MeruQualityTier` (`ultra`/`high`/`balanced`), `IS_SOFTWARE_WEBGL`, `renderWorldSpaceLumenGI`, and `renderUE5PostProcessingPass` (note: `renderUE5PostProcessingPass` is currently `void`-suppressed in `KaliyugaArena.tsx:11950`). |

---

## 3. Protected Baseline Verification
- Standalone `/combat-vfx` side-demo and `COMBAT VFX ARENA` TitleScreen entry have been **completely removed**.
- Pure `Kaliyuga: The Bleeding Crown` TitleScreen (`p0-title.png`) and live Chamber 1 combat (`p0-before-agni.png`, `p0-before-varuna.png`, `p0-before-vayu.png`, `p0-before-vajra.png`) verified at `1440×900` with **0 runtime console errors**.
- Known-good restoration state: unmodified Act I combat rules, progression, saves, MP4 backgrounds, Meshy FBX models, and Kala-Bhairava Susanoo (`Z`).

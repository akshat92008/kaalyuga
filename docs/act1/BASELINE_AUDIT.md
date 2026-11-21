# Act I — Baseline audit (2026-11-21)

**Scope:** eight existing combat chambers, Vaitarani hub, Dundubhi, Vrikodara; **not** the prologue.  
**Baseline commit:** `27ceec9955b20b6b9009f42dd5a974707080ba0f` (draft PR #3, itself based on `b932bd033e3764558e0fae1b347114d7c46776d9`).  
**Evidence:** GitHub repository tree and source inspection. **No recent live visual playthrough or local Mac telemetry was accessible during this audit.** Everything described as "implemented" means the code exists, not that the visual result is approved.

## Architecture verified in source

- Next.js 15 / React 19 / TypeScript 5.9 / Three.js 0.187. The game is a hybrid: a 2D high-DPI canvas world/compositor plus Three.js model renderers and a WebGL anime-VFX overlay, not unrestricted full 3D.
- `components/game/KaliyugaArena.tsx` (~13k lines) drives the game loop, combat, camera, boss AI, chamber transitions and HUD. High coupling raises regression risk.
- `lib/game/assets.ts` declares **exactly 8 chambers**: (1) Vaitarani Ferry Ghat; (2) Sealed Gate of Raktabija; (3) Kurukshetra Chariot Pyre; (4) Mandapa of the War-Drum/Dundubhi; (5) Causeway of Shattered Chariots; (6) Soul-Fire Colonnade; (7) Cisterns of the Asura Forge; (8) Sanctum of the Infernal Maw/Vrikodara. Hub is a separate flow, not a ninth arena.
- Combat rules, frame-phase helper, attack coordination, parry, heavy variations, player animations, camera zoom, and boss signature moves already exist across `rules.ts`, `modernCombat.ts`, `enemyAiStability.ts`, `bossEncounters.ts` and `combatVfxClarity.ts`.
- Existing `demonSlayerShader.ts`, `webglDemonSlayerVfx.ts`, `visualCohesion.ts`, `hadesSpriteBaker.ts` contain cel shading, 3D/2D effects, weapon ribbons, contact shadows. No reason to replace this engine.
- Draft PR #3 already added a safe skinned Susanoo GLB loader, converted two rigs, bounded caches, a chamber asset gate, static painted gameplay backgrounds and CI; preserve these.

## Working / implemented in code (not visually certified)

| Feature | Evidence | Verification status |
|---|---|---|
| Eight declared rooms, wave lists and two major boss slots | `assets.ts`: `CHAMBERS` | Source-only |
| Input/dash/parry/heavy/combo calculation | `modernCombat.ts`, `rules.ts` | Unit tests available |
| Dundubhi pillar bait, armor break, war drum | `bossEncounters.ts`, `KaliyugaArena.tsx` | Source + unit tests, **not** fight review |
| Vrikodara furnace / phases / slag / vacuum | same | Source + unit tests, **not** fight review |
| 3D Rudra / enemy / boss / astral renderers | `rudra3dRenderer.ts` etc. | Source only; visual output unverified |
| 8-chamber music routing and VO | `audio.ts` | Mapping tests; audibility unverified |
| CI for typecheck/tests/build | `.github/workflows/act1-engine-ci.yml` | Prior run #53 passed; rerun for every new commit |

## Defects/risks found by source inspection

1. **Animation-to-damage timing:** game triggers multiple VFX and sounds in button/ability handlers, while `computeActionFramePhase` and `evaluateStrikeActiveFrameGate` exist as partially separate systems. A time-stamped frame/event trace is needed before retiming hits.
2. **Camera state dispersed:** zoom, shake and kick are assigned in many attack paths; no single, cancellable cinematic camera authority for entrances/executions.
3. **Unmeasured renderer behavior:** internal 60 FPS labels are not evidence of 60 FPS. Current `sim.fps` counter is *clamped at 60*; long frames are capped for simulation and must be tracked separately.
4. **Mixed animation libraries:** Mixamo-style armatures, Meshy rigs and procedural motion risk bone-map mismatch, foot sliding and weapons detaching; spot-test real exports.
5. **Asset weight:** 878 repository FBX blobs, 2 GLBs and large source duplicate assets. The optimized manifest only maps two Susanoo FBXs. Aggressive full-scene preloads can overwhelm 8 GB unified-memory machines.
6. **Visual cohesion unknown:** static painted backgrounds now avoid mid-fight video switching, but character lighting, grounding and boss scale still need comparisons using captured frames.
7. **Boss execution choreography:** general finisher code exists; distinct rig-synchronized Dundubhi/Vrikodara bespoke sequences are not demonstrated.
8. **Release UI/performance:** `engine/ue5GraphicsEngine.ts` has existing `ultra`, `high`, `balanced` presets, not the requested user-facing performance/balanced/cinematic presentation. Do not silently rename stored tiers.

## Protect the baseline

- All work goes on `feat/act1-cinematic-polish-audit-20261121`, forked from PR #3 at the SHA above. Do not merge into `main` before full gameplay QA.
- Preserve originals, current balance and story save keys.
- Verify each code milestone with `npx tsc --noEmit --incremental false`, relevant `npx tsx --test ...`, `npm run build`. Verify media in a browser using **all** required assets; CI with sparse checkout alone is not a visual test.
- For new animation/Blender exports always compare bones, skin weights, duration and screenshot/clip output before adding to the release manifest.

## Unverified list — no completion claim

Full hub-to-chamber-8 playthrough; gamepad and touch parity; player/boss foot contact in motion; correct weapon-to-hand binding in every animation; 60 FPS on M3 Air 8 GB; no WebGL/context loss; live voice mixing; modal input capture; full-screen retina DPR; repeated restart memory; win/lose story flags; verified quality of any reference-grade visual effects.

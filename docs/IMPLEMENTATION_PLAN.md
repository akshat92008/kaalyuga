# Phase 0 → Phase 1 Locked Implementation Plan

**Scope:** Week 1 — Phase 0 (Complete) + Phase 1 (Demon Slayer-Quality Elemental Combat Visuals inside live `KaliyugaArena.tsx`).  
**Excluded from Phase 1:** Kala-Bhairava Susanoo (`Z`, deferred to Phase 8), Rudra skeleton retargeting/blending (Phase 2), Blender executions (Phase 3).

---

## 1. Phase 1 Modular Architecture (Inside Real `Kaliyuga`)

1. **`lib/game/rudra3dRenderer.ts` — 3D Parashu Blade-Pose Baking:**
   - Mount `bladeRootAnchor`, `bladeMidAnchor`, and `bladeTipAnchor` directly on `weaponSocket` inside `mixamorigRightHand`.
   - Project all 3 anchors through `this.camera` during `renderFrame()` into sprite-normalized `(rootU, rootV, tipU, tipV)` + torso-relative signed depth `depthZ` (`< 0` behind Rudra, `>= 0` in front of Rudra).
   - Cache `BakedBladePose` in `bladePoseCache` parallel to `frameCache` and expose `getLatestBladePose()` with zero extra runtime skinning cost.

2. **`lib/game/bladeTrailSampler.ts` (New Pure, Unit-Tested Module):**
   - Maps `BakedBladePose` + Rudra's arena draw box `(drawX, drawY, drawW, drawH)` into exact arena-space blade segments `(rootX, rootY, tipX, tipY, depthZ)`.
   - Evaluates smooth **Catmull-Rom cubic splines** with sub-frame densification (4–6× samples) so fast swings become silky curved calligraphic arcs rather than polygonal chords.
   - Splits swept ribbon geometry cleanly into **back-depth** (`depthZ < 0`) and **front-depth** (`depthZ >= 0`) ribbons with tapered whip tips and zero NaN normals.
   - Enforces strict active-frame hit synchronization (`ActiveStrikeState`: single-hit deduplication per `attackSerial`, exact active contact window, immediate clean abort on dodge/stagger/parry/death).

3. **`lib/game/painterlyVfxAtlas.ts` (New Procedural Ufotable Texture Generator):**
   - Generates 4 crisp `512×512` / `1024×512` `THREE.CanvasTexture` brushwork maps once at startup (< 4 MB VRAM, zero external image dependencies):
     - **Agni Calligraphic Flame Sheet** (swept S-curve flame tongues tearing off the outer arc + negative-space smoke hollows + dry-brush tips).
     - **Varuna Ukiyo-e Hokusai Wave & Seafoam Atlas** (parallel carved woodblock lines + clawed white seafoam crests + ink-rimmed cel water droplet sprites).
     - **Vayu Razor Wind-Blade & Sumi-e Ink Shard Atlas** (triple-layered cutting crescent streaks + torn jagged black/jade wind shards).
     - **Vajra Electric Facet & Manga Starburst Atlas** (razor angular starbursts + speed-lines + fractured angular stone debris).

4. **`lib/game/webglDemonSlayerVfx.ts` — Pooled 4-Pass Ufotable VFX Engine:**
   - **Pass 1 (Ground Light Bounce & Floor Decals):** Perspective-matched 2:1 dimetric elemental light pools + ground scorch/puddle/dust-ring/lightning-crack decals under characters.
   - **Pass 2 (Back-Depth VFX Scene):** Swept blade ribbon segments & sculpted vortices with `depthZ < 0` rendered **behind Rudra**.
   - **Pass 3 (Front-Depth VFX Scene):** Leading-edge blade ribbons (`depthZ >= 0`), sculpted curling flame bursts, Hokusai water dragon/tidal sheets, multi-claw emerald wind cyclones, connected branching lightning corridors, and 2-frame manga clash starbursts rendered **in front of Rudra**.
   - **Pass 4 (Selective Spine-Only HDR Bloom):** Only white-hot cores and clash flashes exceed threshold; black sumi-e ink contours stay razor sharp.
   - **Zero-Allocation Pooling:** Pre-allocated ribbon pools, sculpted elemental mesh pools, and `THREE.InstancedMesh` particle pools (embers, ink-rimmed droplets, wind shards, electric sparks, rock debris) honoring Performance / Balanced / Cinematic presets.

5. **`components/game/KaliyugaArena.tsx` — Exact-Frame Integration & Readability:**
   - Synchronize `triggerLightAttack` and `triggerStanceHeavyUnleash` enemy hit detection, damage, knockback, recoil, hit-stop, battle scars, and impact audio to the **exact active cleave frame** (eliminating frame-0 desync).
   - Sample `rudra3dRef.current.getLatestBladePose()` every active swing frame to feed live blade-welded swept ribbons for **Agni (Smash), Vayu (Pillar), Vajra (Thrust), and Varuna (Water Infusion / `[4]` Constant Flux)**.
   - Render Back-Depth WebGL VFX before Rudra and Front-Depth WebGL VFX after Rudra; pulse Rudra's elemental rim light for all 4 elements.
   - Upgrade Perfect Parry (`Shift`), Combo-4 Finishers, and Agneyastra (`Q`) / Vayavyastra (`E`) / Vajrastra (`R`) / Varuna (`4`) with distinct geometry while preserving all existing mechanics, controls, and `Upasamhara` refund.
   - Retire overlapping legacy 2D hit flipbooks/stick-sparks on Rudra's melee strikes so silhouettes and enemy telegraphs stay razor-clean.
   - Expose lightweight `?debug=1` Synchronization Inspector controls (blade-tip markers, raw white trajectory line, slow-mo `0.25×`/`0.5×`, pause/step, live VFX telemetry) — strictly hidden in normal gameplay.

---

## 2. Phase 1 Completion & Verification Gate
- [ ] Pure unit tests (`bladeTrailSampler.test.ts` + updated `webglDemonSlayerVfx.test.ts` + existing core suite) pass 100%.
- [ ] `compile_applet` + targeted `npx eslint` pass cleanly.
- [ ] Live `NEW GAME` Chamber 1 + Boss Chamber screenshots captured and compared side-by-side against Phase 0 BEFORE captures and all 4 Demon Slayer reference PDFs across Agni, Varuna, Vayu, Vajra (Light, Heavy, Combo-4, Parry, Astras, Interrupt).
- [ ] Zero floating detached flame chili-peppers, zero disconnected lightning twigs, zero tiny weak Vayu swirls, zero frame-0 hit desync, zero console errors.

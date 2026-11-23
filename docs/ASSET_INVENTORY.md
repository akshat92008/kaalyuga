# Phase 0 — Act I Runtime Asset Inventory (`Kaliyuga: The Bleeding Crown`)

**Date:** 2026-11-22  
**Rule:** Preserve all original source assets and existing MP4 arena backgrounds; enhance and integrate rather than replace.

---

## 1. Asset Delivery Architecture
- Static binary assets (`.fbx`, `.png`, `.mp4`, `.mp3`) are served at runtime through Next.js rewrites (`next.config.ts` → `lib/server/staticAssetProxy.ts` → `/api/static/*`) mapping cleanly to upstream repository media directories (`kaalyuga`, `models`, `animations`, `arenas`, `audio`, `vfx`, `sprites`, `cinematics`).
- Original source files in the upstream repository remain completely untouched.

---

## 2. Runtime-Loaded Core 3D Models & Animations

| Asset Role | Runtime URL(s) | Loader / Consumer | Status |
|---|---|---|---|
| **Rudra Rigged Skeleton** | `/kaalyuga/rudra/rigged.fbx` | `lib/game/rudra3dRenderer.ts` (`loadFbxCached`) | **Loaded at Runtime** (493,632 verts, exact 1:1 match to texture FBX) |
| **Rudra Textured Mesh + Diffuse** | `/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.{fbx,png}` | `lib/game/rudra3dRenderer.ts` | **Loaded at Runtime** |
| **Parashu Battle-Axe + Diffuse** | `/kaalyuga/parashu/weapon.fbx`, `/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/...png` | `lib/game/rudra3dRenderer.ts` (parented to `mixamorigRightHand`) | **Loaded at Runtime** |
| **Rudra Combat Clips (10 States)** | `/kaalyuga/anims/rudra/{idle,run,dodge,attack1,attack2,attack3,heavy,cast,block,hurt}.fbx` + `/animations/pro_melee_axe/*.fbx` fallback | `lib/game/rudra3dRenderer.ts` | **Loaded at Runtime** (eagerly preloaded after idle/run) |
| **Enemy 3D Rigs & Animations** | Charnel Ghoul, Ashen Oracle, Ironmaw Gladiator, Bloodmaw Brute, Semi-Boss (`Molten_Oni_Aegis`), Wardens | `lib/game/enemy3dRenderer.ts` | **Loaded at Runtime** |
| **Boss 3D Rigs (Dundubhi & Vrikodara)** | Meshy FBX boss models + weapons + attack clips | `lib/game/boss3dRenderer.ts` | **Loaded at Runtime** |
| **Kala-Bhairava Susanoo Rig** | Spectral guardian FBX + axe clips | `lib/game/susanoo3dRenderer.ts` | **Loaded at Runtime** *(Excluded from Phase 1; Phase 8)* |

---

## 3. Act I Arena Environments (MP4 Backgrounds & Hub)

| Chamber / Area | Media Type | Runtime Integration | Preservation Rule |
|---|---|---|---|
| **Title Screen** | Muted looping MP4 + painterly backdrop | `components/game/TitleScreen.tsx` | **Preserve** |
| **Vaitarani Hub** | Sanctuary backdrop + Savitri & Lohakara NPCs + Ferry Gate | `lib/game/vaitaraniHub.ts`, `KaliyugaArena.tsx` | **Preserve** |
| **Chambers 1–8** | 8 HD 1080p animated MP4 chamber backgrounds + fallback stills (`GAME_ASSETS.chambers`) + isometric walkable geometry (`chamberGeometry.ts`) | `lib/game/assets.ts`, `KaliyugaArena.tsx` | **Preserve & integrate via Phase 1 floor light bounce + battle scars (never replace with generic 3D rooms)** |
| **Boss Phase 2 Eclipse Swap** | Vrikodara Chamber 8 Blood Eclipse MP4 transition | `KaliyugaArena.tsx`, `bossEncounters.ts` | **Preserve** |

---

## 4. Audio, Flipbooks & Unused Repository Modules

| Category | Assets / Modules | Runtime Status | Phase 1 Action |
|---|---|---|---|
| **Audio & SFX** | `lib/game/audio.ts` (`playSwing`, `playHeavyIronSwing`, `playBreathingStyle`, `playIronBlock`, `playSpell`, BGM tracks) | **Loaded at Runtime** | Keep & synchronize impact audio to active cleave contact frame (full audio overhaul deferred to Phase 10). |
| **Telegraph Flipbooks** | `PHASE2_VFX_SHEETS` (`isometricTelegraphs2x2`, `dundubhiShockwaveAndShatter4x2`, `vrikodaraVacuumAndSlag4x2`) | **Loaded at Runtime** | **Preserve intact** — enemy/boss ground telegraphs must remain crisp and unmistakable. |
| **Legacy Hit/Slash Flipbooks** | `parryAndHitSparks4x2`, legacy 2D `spawnShockwave` / `spawnParticles` on Rudra melee hits | **Loaded at Runtime (Cluttering WebGL VFX)** | **Retire/gate on Rudra's 4-element weapon hits & parries** where upgraded Demon Slayer WebGL VFX owns the frame. |
| **Unused / Unimported 3D Stages** | `lib/game/unifiedWorld3DStage.ts` (2,616 lines), `lib/game/demonSlayerVfxStage.ts` (440 lines) | **Present in repo, NOT imported by `KaliyugaArena.tsx`** | Leave untouched to avoid regressions; all Phase 1 work targets the live `KaliyugaArena.tsx` + `webglDemonSlayerVfx.ts` + `rudra3dRenderer.ts` pipeline. |
| **Phase 1 Procedural Painterly Atlas (New)** | Zero external image downloads — generated once at init via offscreen HTML5 Canvas → `THREE.CanvasTexture` (< 4 MB VRAM) | **To be created in Phase 1** | Provides authentic Ufotable sumi-e flame sheets, Hokusai wave/foam crests, emerald wind blades, ink shards, and manga starbursts. |

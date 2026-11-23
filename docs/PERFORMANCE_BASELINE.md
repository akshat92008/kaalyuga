# Phase 0 — Performance Baseline & MacBook M3 Air (8 GB) Budget

**Date:** 2026-11-22  
**Target Hardware:** MacBook Air M3 (8 GB unified memory, integrated Apple GPU, 60 FPS target) + Software WebGL (SwiftShader) graceful degradation for headless verification.

---

## 1. Current Performance Bottlenecks Identified in Code Audit

| Bottleneck | Exact Location | Impact on MacBook M3 Air (8 GB) | Phase 1 Remediation |
|---|---|---|---|
| **Per-Attack `BufferGeometry` + `ShaderMaterial` Allocation & Disposal** | `webglDemonSlayerVfx.ts` (`spawnSlashRibbon:1147`, `spawnSolarFlameWheel:1209`, `spawnWaterDragon:1306`, `spawnThunderZigzag`, `spawnWindGaleCrescents`, `spawnSparkBurst`) | Every single light/heavy/Astra attack allocates fresh GPU vertex buffers, compiles/clones `ShaderMaterial`s, uploads buffers, and calls `.dispose()` 0.3–0.6s later → JS GC pauses & Metal/WebGL command-buffer hitches during fast combos. | **Pre-allocated GPU object pools** (blade-trail ribbon pool, sculpted secondary mesh pool, `THREE.InstancedMesh` particle pools) with in-place typed-array updates (`Float32Array` + `needsUpdate = true`). Zero per-attack geometry/material allocations! |
| **Un-Instanced Individual Particle/Tongue Meshes** | `spawnSolarFlameWheel` spawns 26+ tongue meshes per cast; `spawnSparkBurst` spawns separate meshes/billboards. | Draw-call spikes (`60–120+` VFX draw calls during simultaneous Heavy + Astra + enemy attacks). | Consolidate embers, water droplets, wind shards, electric sparks, and rock debris into **single-draw-call `THREE.InstancedMesh` pools** (`< 35` total VFX draw calls at peak Heavy + Astra). |
| **Full-Scene `UnrealBloomPass` Washing Out Ink Lines** | `webglDemonSlayerVfx.ts:1064–1081` | Renders entire VFX scene through `EffectComposer` + `UnrealBloomPass`; high-overdraw ribbons consume half-res fillrate and soften black ink borders. | **Selective HDR Spine Bloom** (only white-hot core spines, lightning cores, and clash starbursts exceed bloom threshold `> 1.05`; dark sumi-e ink & cel pigment stay razor-sharp in the primary buffer). Skip `EffectComposer` automatically on `isSoftwareGl` and `Performance` preset. |
| **Unbounded `frameCache` + Redundant Per-Frame `ctx.createRadialGradient`** | `rudra3dRenderer.ts:838` (cap 1,100 canvases); `ue5GraphicsEngine.ts:152` | 1,100 × 256×256 RGBA canvases ≈ ~288 MB RAM ceiling on 8 GB unified memory. | Keep `frameCache` bounded (with lightweight parallel `bladePoseCache` storing only 5 numbers per frame ≈ < 40 KB total!) and cap ground light bounce emitters cleanly. |

---

## 2. Phase 1 Locked Performance Budgets (MacBook M3 Air 8 GB)

| Metric | Performance Preset | Balanced Preset (Default M3 Air) | Cinematic Preset | Software WebGL (Headless) |
|---|---:|---:|---:|---:|
| **Target Frame Time** | <= 16.6 ms (60 FPS) | <= 16.6 ms (60 FPS) | <= 16.6 ms (60 FPS) | Paced (no stalls) |
| **VFX Pixel Ratio Cap** | `1.0` | `min(dpr, 1.35)` | `min(dpr, 1.5)` | `0.75` |
| **Peak VFX Draw Calls** | <= 20 | <= 32 | <= 45 | <= 28 |
| **Max Active Blade Ribbons** | 4 | 6 | 8 | 6 |
| **Max Instanced Particles** | 90 | 180 | 280 | 120 |
| **Selective Spine Bloom** | Off (additive spine glow) | Half-res `UnrealBloomPass` | Half-res `UnrealBloomPass` | Off (additive spine glow) |
| **Procedural Atlas VRAM** | < 4 MB total | < 4 MB total | < 4 MB total | < 4 MB total |
| **Per-Swing GC Allocations** | **0 geometries / 0 materials** | **0 geometries / 0 materials** | **0 geometries / 0 materials** | **0 geometries / 0 materials** |

*Note: Actual MacBook M3 Air FPS cannot be measured directly inside this Linux SwiftShader container and will be explicitly noted as "verified structurally + software-WebGL tested; real M3 GPU FPS to be confirmed on user hardware."*

# Act I — Asset inventory (repository tree, 2026-11-21)

**Source:** GitHub recursive tree for baseline commit `27ceec9955b20b6b9009f42dd5a974707080ba0f`. Counts describe **tracked repository blobs**, not runtime requests, game-used assets or unique bytes. Overlapping folders are intentionally not summed. Original binaries were not individually opened or rendered here.

## Known file counts and sizes

| Folder | Files | Approx. tracked size | Principal formats |
|---|---:|---:|---|
| Entire repository tree | 2,776 blobs | repository declared ~3.9 GB | includes source/archives/duplicates |
| `new 3D assets and animations/3D Models` | 131 | 0.721 GiB | 41 FBX, 80 PNG, 8 STL |
| `new 3D assets and animations/Animations` | 584 | 0.397 GiB | 584 FBX |
| `public/animations` | 142 | 0.086 GiB | 142 FBX |
| `public/models` | 69 | 0.391 GiB | 19 FBX, 50 PNG |
| `public/optimized` | 3 | 0.037 GiB | two Susanoo GLBs + manifest |
| `audio and sound effects` | 86 | 0.066 GiB | 47 MP3, 39 WAV |
| `public/audio` | 35 | 0.069 GiB | 21 MP3, 14 WAV |
| `public/assets/aistudio` | 341 | 1.151 GiB | art, MP4s, music, reference media |
| `soundtracks` | 21 | 0.058 GiB | 14 MP3, 7 WAV |
| `cutscenes` | 136 | 0.666 GiB | 34 FBX, 85 PNG, 11 Python, 1 BLEND |
| `public` (all subfolders) | 882 | 2.778 GiB | 190 FBX, 471 PNG, 34 MP4, 60 MP3 |

Repo-wide extension count: **878 FBX**, **2 GLB**, **952 PNG**, **427 JPG**, **49 MP4**, **130 MP3**, **71 WAV**, **67 ZIP**, **1 BLEND**, **~25 TS unit-test files**. Counts are not license clearance or quality approval.

## Act I chamber / encounters

| Chamber | Room | Major actors & feature |
|---|---|---|
| 1 | Vaitarani Ferry Ghat | Ghoul, Oracle, Bloodmaw |
| 2 | Sealed Gate of Raktabija | Oracle, Gladiator, Bloodforge shield semi-boss |
| 3 | Kurukshetra Chariot Pyre | Gladiator, Ghoul, Oracle, Bloodmaw |
| 4 | Mandapa of the War-Drum | Dundubhi, four destructible pillars |
| 5 | Causeway of Shattered Chariots | Preta Bowman, Ash Cyclone Warden |
| 6 | Soul-Fire Colonnade | Eternal Wheel Warden, Preta Bowman, Oracle |
| 7 | Cisterns of the Asura Forge | Molten Titan Warden, Wheel Warden, Cyclone Warden |
| 8 | Sanctum of the Infernal Maw | Vrikodara, phase background, four pillars |

## Existing art + Blender

- Source scripts: `cutscenes/scripts/build_cinematic_boss_cutscene.py`, `generate_custom_animation.py`, `render_master_cutscene.py`, `fix_and_render_gow.py`, `test_gow_cutscene.py` and others (11 Python files). Many appear directed at a **standalone offline render**, not a validated in-engine skinned execution.
- Blender scene: `cutscenes/kaliyuga_god_of_war_master.blend` (~29.7 MB).
- Existing release optimization: `scripts/build-optimized-glbs.py` and `public/optimized/asset-manifest.json`. Two validated Susanoo files (23.7MB and 15.6MB) are present; **other actors remain FBX-first**.
- Current audio and voices: `lib/game/audio.ts` defines 19 voice-clip keys, effects and a soundtrack matrix; physical asset references should be validated with `npx tsx scripts/audit-act1-audio.ts --strict` in a full checkout.

## Highest-risk file families

- Duplicate 20–65MB FBXs in `cutscenes/assets/characters`, `public/models` and source folders may be different versions — compare hashes rather than deleting.
- `*_generate.fbx` and `*_texture.fbx` are not necessarily the same vertex layout; GLB conversion can preserve *either* individually and still fail skin-to-UV mapping. An automated rig+material validation per character is essential.
- Mixed bone names/units in Mixamo/Meshy/Mutant animations; do not batch retarget blindly.
- Background image and phase-2 image should be verified visually, not replaced with generic video.

## Next required per-asset data

Add computed SHA-256, vertex count, bone list/parents, skin influences, animation names/durations, UV availability, texture dimensions/alpha, embedded color space, model bounding box/scale, materials, browser load time, and screenshots to a machine-readable release asset report. **None of these individual properties was measured for all 878 FBXs here.**

## Safety

Keep source FBX, WAV and BLEND untouched. Generated GLBs and reports must live in distinct optimized-output paths. Inspect actual rights/licenses before commercial release.

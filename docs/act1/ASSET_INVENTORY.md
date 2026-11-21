# Act I asset inventory

Inventory of tracked paths at `b932bd0`, including source packs, duplicate exports and prior experiments. The counts describe the repository, not a player's download.

| Format | Files | Total bytes |
| --- | ---: | ---: |
| FBX | 878 | 1,735,779,094 |
| Blender | 1 | 31,135,517 |
| PNG | 952 | 3,516,242,931 |
| JPG | 427 | 99,900,116 |
| MP4 | 49 | 364,737,444 |
| WAV | 71 | 89,619,990 |
| MP3 | 130 | 171,042,688 |

| Role | Source used or inspected | Blender result |
| --- | --- | --- |
| Rudra | `public/kaalyuga/rudra/rigged.fbx` and `public/kaalyuga/anims/rudra` | One weighted mesh, 57 bones, 164,544 source triangles. Ten action FBXs imported with armatures and actions. |
| Dundubhi | Bellhorn FBX under `new 3D assets and animations/Animations/Creature Pack (4)` | 33 bones, one weighted mesh, 279,848 triangles. |
| Vrikodara | Crimson Skull FBX under `new 3D assets and animations/Animations/Pro Melee Axe Pack (5)` | 33 bones, one weighted mesh, 280,874 triangles. |
| Kala-Bhairava | Horned Warlord generate FBX resolved by `staticAssetProxy.ts` | 9,482,828 bytes, 290,636 triangles, one mesh, zero bones and actions. |
| Boss intro scene | `cutscenes/kaliyuga_god_of_war_master.blend` | Opened in Blender 5.3. Frames 1–150 at 24 fps. Scene contains GoW_Cinematic_Camera and Dundubhi_Armature. |
| Backgrounds, VFX and audio | `lib/game/assets.ts`, `lib/game/vfxFlipbook.ts`, `lib/game/audio.ts` and the proxy filename map | Asset names and routing are available in code. Playback, artistic continuity and licensing still require individual review before distribution. |

Blender audit from repository root:

```sh
blender -b --python-exit-code 1 -P cutscenes/scripts/audit_act1_fbx.py -- \
  public/kaalyuga/rudra/rigged.fbx public/kaalyuga/anims/rudra/*.fbx
```

The script resets the scene before each import and prints one JSON record per file. It never saves over an input. Existing cinematic scripts generate or render the authored intro. They do not validate a runtime avatar rig.

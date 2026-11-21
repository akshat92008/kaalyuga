# Act I baseline • 21 November 2026

Baseline commit `b932bd0`. The two recent engine commits already added avatar skinning code, three difficulty levels, hub dialogue and eight chamber profiles. The source export was compared against the GitHub tree. Blender inspections used matching source assets.

| System | Evidence from the baseline | Release check still needed |
| --- | --- | --- |
| Combat | The arena schedules a pending strike. The hit pipeline computes hit-stop, directional reactions and posture damage. Rudra's baked attack clock trims the clip twice. | Compare first contact, damage, sound and hit-stop in one slow-motion capture per stance. |
| Enemies and bosses | Six ordinary 3D slots, hybrid sprites, pillar collision, furnace inhale, guard break and phase rules exist with tests. | Lure Dundubhi into each pillar. Interrupt Vrikodara and reach the shard sequence. |
| Avatar | The production FBX is a static sculpt. Code for a mixer, skinned GLSL and a procedural fallback exists. Holding the attack state can restart a swing on a timer. | Verify summon and dismissal, occlusion of danger markers, and limb motion at game scale. |
| Scenery | Video defaults off. Initial-chamber preload bypasses that preference. Painted art is replaced on the first decoded frame. Paused videos retain their source. | Inspect transitions under slow loading and repeated restarts. |
| Audio, UI and story | Music routing distinguishes combat, bosses and hub. HUD snapshots and local-storage progression exist. The older music and rim-color assertions disagree with the current curated assets. | Test real input behind each modal, audible transitions, save/reload and Ferry I. |
| Runtime | Next's production config suppresses type errors. A successful build alone cannot establish type safety. | Run the independent type check, production build and a fresh-save playthrough. |

The visual bar remains open. Direct room entry is a diagnostic shortcut and does not verify progression.

# Combat animation

The player renderer samples poses into a cache keyed by action, stance, yaw, animation step and hit flash. At baseline the 24-step GPU attack sampler converted progress to the trimmed interval before choosing a step, then trimmed it again. This left steps 0–2 and 22–23 unreachable. The corrected sampler uses the full range of indices and maps each index into the source clip once. Pure vertical movement also uses the supplied zero horizontal direction.

For Rudra the inspected model and ten bundled action clips each contain 57 bones. Bone counts alone cannot establish bind-pose compatibility, foot contact or grip quality. The attack clock, hit-stop and slash orientation need a simultaneous game-camera recording. Executions already select downward crush, spin or lunge. A synchronized armor-break execution and paired enemy reaction still need authoring and visual validation.

The production boss files in the Creature Pack (4) and Pro Melee Axe Pack (5) each contain a 33-bone weighted mesh. The separate bundled Dundubhi model is static and the five bundled boss clips each contain 65 bones. Always identify the path used by the current renderer before retargeting. The avatar asset has no armature. Use a separately weighted derivative before trying to bind the creature or axe animations to that sculpt.

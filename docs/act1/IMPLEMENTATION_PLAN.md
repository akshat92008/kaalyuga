# Act I implementation checkpoints

| Order | Work and acceptance evidence |
| --- | --- |
| 1. Baseline | Preserve the branch point, audit assets, run gameplay tests and independent type/build checks. Capture the same chamber and action before and after. |
| 2. Player | Correct attack sampling, zero-time hit-stop and cardinal facing. Trace the physical Parashu tip at anticipation, contact and follow-through for each attack. |
| 3. Execution | Use the existing downward action and a staggered enemy first. Verify relative placement, hit and sound marker, skip, interrupted recovery and input restoration before adding the sweep and armor break. |
| 4. Dundubhi | Use the rigged Bellhorn source. Preserve pillar baiting. Test charge direction, pillar impact location, remaining armor, punish duration and restart. Validate the working introduction at gameplay scale. |
| 5. Remaining encounters | Verify enemy warning shapes, then Vrikodara inhale, furnace heat, defeat, Shard I and Ferry I. Compare audio ducking and posture readability during Astras. |
| 6. Release | Verify all eight chambers in sequence, repeat after death and repeat from a saved game. Capture multiple resolutions and performance profiles. Document measured frame pacing and memory growth. |

Current source changes address player sampling, avatar timing and cleanup, background transitions and media memory. The next acceptance gate is an actual game-camera comparison on the M3 Air. Original assets remain available for authoring independent release derivatives.

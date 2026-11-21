# VFX and rendering

The hybrid renderer composites painted scenery, baked Three.js character frames and combat overlays. The ribbon system already supports a core, ink outline, glow shell and elemental palettes. Timed impact flashes and directional particles exist. Their correspondence with the animated blade has not been visually measured.

The avatar shader includes Three.js skinning chunks, normal blending, a translucent interior and a screen-edge fade. A shader cannot deform a mesh without weighted bones. The loader already returns a safe clone. A second ordinary clone in the avatar renderer can reconnect a weighted mesh to the wrong skeleton. The arena also omitted avatar disposal during unmount.

For comparison, capture the same attack and facing at native camera scale and at execution zoom. Review anticipation, blade edge, first damaging frame, enemy outline, floor-warning visibility and recovery. Repeat against the furnace background with an Astra active. An alpha transition addresses the abrupt image-to-video cut. It does not establish that the video composition matches the painting.

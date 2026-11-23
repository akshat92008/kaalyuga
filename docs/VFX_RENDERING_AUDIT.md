# Phase 0 — VFX & Rendering Visual Audit (`Kaliyuga: The Bleeding Crown`)

**Date:** 2026-11-22  
**Visual Evidence Reviewed:** Live `1440×900` Chamber 1 captures (`p0-before-agni.png`, `p0-before-varuna.png`, `p0-before-vayu.png`, `p0-before-vajra.png`) compared directly against the 4 attached **Demon Slayer / Ufotable** reference PDFs.

---

## 1. Visual Defects Confirmed in Live Gameplay Captures

### Defect 1 — Agni Heavy (`p0-before-agni.png`): Floating "Chili-Pepper" Tongues & Detached Thin Hoops
- **Observed:** `spawnSolarFlameWheel` (`webglDemonSlayerVfx.ts:1189–1280`) renders two thin neon hoops around Rudra plus **13 completely disconnected teardrop flame shapes floating in empty air** around an oval. A clunky flat-stick yellow spark burst sits near Rudra's torso.
- **Gap vs Demon Slayer Flame PDF:** Flame Breathing must be a **continuous, thick, calligraphic river of swirling fire physically attached to the Parashu blade**, with asymmetric curling flame tongues tearing organically *out of* the main ribbon body, deep dark-charcoal smoke hollows inside the flame curl, crisp 4-step cel bands (white-gold core → solar yellow → blazing orange → deep crimson) framed by sharp black sumi-e ink contours, and glowing warm orange light bounce on the stone floor.

### Defect 2 — Varuna Water (`p0-before-varuna.png`): Thin Tubular Dragon, Floating Black Rings & Missing Hokusai Foam/Droplets
- **Observed:** `spawnWaterDragon` (`webglDemonSlayerVfx.ts:1286–1460`) shows a thin blue coil over two disconnected dark-black floating rings, with a noisy white spiky burst covering Rudra's body. No Hokusai clawed white seafoam crests, no cel-shaded splash droplets, and no blue caustic ground reflection.
- **Gap vs Demon Slayer Water PDF:** Water Breathing must feature **sweeping, translucent Prussian-blue / cerulean / cyan ribbons with parallel carved Hokusai woodblock brushstrokes**, **sculpted clawed white seafoam crests curling off the outer edge**, **crisp dark-indigo sumi-e ink outlines**, **individual ink-rimmed teardrop water droplets flying tangentially**, and an imposing sculpted Water Dragon surging directly from the Parashu swing path.

### Defect 3 — Vayu Heavy (`p0-before-vayu.png`): Undersized, Muted Swirl (Lacks Scale & Razor Wind Identity)
- **Observed:** Pillar Heavy renders a tiny ~100px dark brown-green swirl + thin pale cross over Rudra — completely lacking the scale, velocity, or silhouette of a Heavy Unleash.
- **Gap vs Demon Slayer Wind PDF:** Wind Breathing must deliver **wide, sweeping, multi-layered emerald razor wind-blade crescents** (ice-mint white cutting core → electric jade → deep forest emerald), **aggressive pitch-black sumi-e ink shear lines & flying torn dark-emerald wind shards**, swirling ground dust rings, and a massive helical gale vortex on Heavy / Vayavyastra.

### Defect 4 — Vajra Heavy (`p0-before-vajra.png`): Skinny Wireframe Bolt, Disconnected Floating Fork Twigs & Dull Floor Ring
- **Observed:** `spawnThunderZigzag` produces a narrow neon cyan-yellow polyline whose forked sub-branches appear **disconnected in mid-air** on the right side of the screen, above a muddy dark-green flat circle with a dull gray star.
- **Gap vs Demon Slayer Thunder PDF:** Thunder Breathing must have **zero soft noise blur** — a dramatic thick-to-whip-tapered **white-hot core encased in razor Zenitsu gold-yellow & cyan-violet faceted lightning** framed in sharp black ink, **physically connected branching forks** exploding out of interior bolt elbows, an **intense 8-point manga clash starburst**, **angular flying shattered-stone debris shards**, and **radiating glowing floor fractures + bright electric floor light flash**.

### Defect 5 — No Behind-to-Front Depth Wrapping Around Rudra
- **Observed:** `KaliyugaArena.tsx:11910` composites `webglVfx.canvas` entirely **after** Rudra and enemies are drawn. Large arcs paste flatly across Rudra's face and torso instead of sweeping behind his back and wrapping in front of his Parashu.
- **Fix for Phase 1:** Split the WebGL VFX overlay into **Floor Ground-Bounce Pass** → **Back-Depth VFX Pass (behind Rudra)** → **Characters + Elemental Rim Pulse** → **Front-Depth VFX Pass (in front of Rudra)** → **Selective Spine-Only HDR Bloom**.

### Defect 6 — Raw 3-Octave FBM Noise vs Painterly Brushwork & Legacy 2D Clutter
- **Observed:** `RIBBON_FRAGMENT_SHADER` (`webglDemonSlayerVfx.ts:315–420`) uses raw procedural hash noise (`fbm`) on symmetric strips; meanwhile `KaliyugaArena.tsx` still spawns legacy 2D `spawnFlipbookVfx` (`parryAndHitSparks4x2`), 2D `spawnShockwave`, and flat stick sparks on top of WebGL effects.
- **Fix for Phase 1:** Replace raw FBM noise with a **Procedural Painterly Brushwork Texture Atlas** (sumi-e curling flame sheets, Hokusai woodblock wave & foam claws, emerald razor wind-blades, jagged lightning & manga starbursts) sampled by a **4-step hard cel + silhouette-traced sumi-e ink outline GLSL shader**, and retire muddy overlapping 2D hit flipbooks on Rudra's melee strikes & parries.

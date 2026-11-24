# Kaliyuga: The Bleeding Crown — Vertical Slice Master Plan (Act I First, Prologue Second)

Transform **Kaliyuga: The Bleeding Crown** into a donation-ready, showcase-grade playable vertical slice with its own unmistakable Indian-myth × anime-sakuga identity—completing and thoroughly polishing **Act I (Vaitarani Hub → Chamber V Vrikodara Finale & Ferry I)** first, then seamlessly attaching **Phase 2 (Samudra Manthan Painting Cutscene → Amaravati Heaven Action Prologue → Lord Vishnu Boss Duel)** in front of it.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Execution Order & Creative Direction Locked In**
> Because this vertical slice will be shared publicly to build a community and seek donations before a Steam launch, **Stage A (Act I)** will be built and verified to 100% playable, visually cohesive quality *before* starting **Stage B (Samudra Manthan + Heaven Prologue)**. Approving this plan authorizes **Stage A execution first**, with a verification checkpoint before Stage B begins.

- **Confirmed Decision 1 — Build Order**: Complete and fully polish **Act I** first (all combat feel fixes, Rudra animations, Heavy attack rebalance, Kala-Bhairava Susanoo Rage Mode, painterly Water Dragon, 6 distinct MP4 biomes, full 3D bosses, Kaliyuga-original HUD, complete Savitri hub + 5-chamber narrative arc, and community support closing card). Build the **Samudra Manthan painting cutscene + Amaravati Heaven Prologue + Lord Vishnu duel** immediately afterward in Stage B.
- **Confirmed Decision 2 — Unified Mythic Canon**: Standardize the vertical slice to **6 Shattered Mani Shards** (broken by Lord Vishnu at the end of the Prologue), **Parashu** as Rudra's signature battle-axe, and **Indian mythic Astra patrons** across all codices, dialogues, and HUD labels—eliminating every contradictory 6-vs-7 shard reference and legacy non-Indian patron ID.
- **Confirmed Decision 3 — Signature Rage Identity**: Rudra's Wrath Mode becomes **Kala-Bhairava Astral Avatar**—a towering translucent 3D spectral colossus (ribcage, horned Rudra mask, twin giant arms wielding a colossal spectral Parashu) inspired by Itachi's Susanoo, rendered in Indian temple-fire iconography, mirroring Rudra's swings while subtly dimming Savitri's Lantern flame as a visual reminder of the cost of wrath.
- **Recommended Default — Vertical Slice Ending & Support Screen**: After defeating Vrikodara, recovering Mani Shard #1, witnessing Sanjaya's first strikethrough memory correction, and crossing Ferry I, display a tasteful Chola-brass **Vertical Slice Complete & Support the Full Journey** screen with clear run stats, an instant *"Replay Act I"* button, and a customizable community/donation callout slot (placeholder link ready for your Ko-fi / Patreon / itch.io URL).

---

## 1. Overview & Core Concept

- **What It Does**: Delivers a complete, emotionally resonant 15–25 minute playable vertical slice of Rudra's redemption arc—starting in **Stage A** with the full **Act I** experience (waking broken at Savitri's Vaitarani riverbank, earning her lantern and mission to recover the 6 shattered Mani shards, fighting through 5 distinct animated temple/underworld chambers against cel-shaded Rakshasa hosts and bosses, unleashing the Kala-Bhairava Astral Avatar, and confronting Vrikodara) and expanding in **Stage B** with the explosive **Samudra Manthan + Amaravati Heaven Prologue** that hooks players in the first 90 seconds.
- **Target Audience / Persona**: Action-roguelike and anime-combat fans, indie game showcase viewers, content creators, and prospective community backers evaluating whether Kaliyuga has a fresh voice and triple-I craft worthy of funding.
- **Key Value**: Solves every current friction point simultaneously—turning frozen swings into snappy spam-capable combos, making Heavy attacks feel devastating, giving every chamber its own living MP4 arena atmosphere, elevating Water Dragon and boss models to full anime cel fidelity, and breaking free from *"looks like Hades"* comparisons with a bold Pattachitra, Chola-bronze, and Devanagari visual language.

---

## 2. User Experience & Visual Design

### Breaking Away From "Hades": Kaliyuga's Own Visual Identity

Friends immediately compared earlier footage to *Hades* because of dark bevelled purple-gold corner cards, repetitive warm lava-brown arenas, and static isometric camera framing. Kaliyuga will claim its own unmistakable visual signature rooted in **Odisha Pattachitra scroll art, Balinese Wayang shadow-theatre silhouettes, Chola temple bronze relief, and Ufotable anime sakuga**:

- **Aesthetic Direction**: *Sacred Ink & Temple Bronze Sakuga* — razor-sharp Sumi-e ink outlines on 3D characters, hand-painted organic watercolor/plasma elemental arcs, carved Chola-brass HUD frames with sharp beveled temple notches (**zero rounded pill badges**), and bold **Devanagari combat callout stamps** that flash briefly at the edge of impact (*रौद्र* on Rage unleash, *विच्छेद* on Shield Shatter, *प्रहार* on Heavy Finisher, *अवहेलना* on Perfect Dash).
- **60-30-10 Color Script & Biome Palette**:
  - **UI Surface Tokens**: Deep Sanctum Obsidian (`--bg-sanctum: #0b0a0e`), Palm-Leaf Parchment (`--surface-scroll: #191512`), Weathered Chola Brass (`--border-brass: #b88a3b`), Kumkum Vermilion (`--accent-vermilion: #d93829`), Savitri Lantern Saffron (`--accent-lantern: #f5b942`), and Bone Ivory text (`--text-ivory: #f3ead8`).
  - **Per-Chamber Color Temperature Contrast**: Instead of every room sharing brown-orange haze, each Act I stage shifts lighting, floor fog tint, and ambient particles across a deliberate dramatic arc:
    1. **Vaitarani Riverbank Hub**: Moonlit silver-ash mist + warm saffron lantern glow.
    2. **Chamber I (Ghat of Sunken Waters)**: Deep Prussian indigo water reflections + cool mist + torchlight rim.
    3. **Chamber II (Mandapa of Broken Vows)**: Sandstone twilight ochre + swirling temple incense embers.
    4. **Chamber III (Raktabija Blood-Pyre Court)**: Smoldering charcoal & crimson pyre ash + flickering firelight.
    5. **Chamber IV (Dundubhi War-Drum Sanctum)**: Storm-violet thunder haze + stark bronze lightning flashes.
    6. **Chamber V (Vrikodara's Slag Eclipse Arena)**: Volcanic obsidian + eclipse gold rim-light + rising cinder plumes.
- **Typography & Hierarchy**:
  - **Display & Combat Stamps**: High-contrast mythic serif (`Cinzel Decorative` / `Cinzel`) paired with crisp Devanagari calligraphy (`Noto Serif Devanagari`) for boss title cards, chapter banners, and impact stamps.
  - **Dialogue & Codex**: Warm, readable humanist serif (`Cormorant Garamond` / `EB Garamond`) styled on weathered Tala-patra palm-leaf frames with subtle red Kumkum divider rules.
  - **Combat Numerals**: Crisp tabular numerals for HP, Focus Orbs, and damage callouts—zero decorative clutter or telemetry readouts.
- **Kaliyuga-Original HUD Architecture**:
  - **Top-Left — Rudra's Sacred Seal**: Horizontal carved brass vitality bar with etched temple segments + **4 glowing Rudraksha Focus Beads** right beneath it (lighting up visibly as Heavy charge builds) + a compact **Wrath / Susanoo Seal Gauge** that pulses molten vermilion when ready.
  - **Bottom-Left — Savitri's Live Lantern Flame**: A minimal, atmospheric lantern flame icon whose brightness reacts dynamically to Rudra's playstyle—steady warm saffron during disciplined combat, flickering dimly toward ember-red when Kala-Bhairava Rage consumes Rudra, tying narrative redemption directly into gameplay HUD.
  - **Bottom-Center — Elemental Mudra Crest**: Clean 4-point mandala showing active element (Fire / Water / Lightning / Wind) with subtle key hints (`J` Light, `K` Heavy, `L` Cast, `Space` Dash, `Q` Susanoo Rage)—receding into low opacity during combat so 88%+ of the viewport stays unobstructed arena.
  - **Top-Center — Boss Ink Banner (Boss Chambers Only)**: Dramatic temple scroll title banner with Devanagari subtitle, armor/stagger pips, and phase break ticks.

### Stage A User Flow — Complete Act I (Built & Polished First)

```
┌───────────────────────────┐
│  TITLE & ACT I ENTRY      │  Chola-brass title curtain, atmospheric river audio,
│  "Begin Act I" / Continue │  single clean CTA (no cluttered menu walls).
└─────────────┬─────────────┘
              ▼
┌───────────────────────────┐
│  VAITARANI RIVERBANK HUB  │  Walkable ash shore (MP4 river backdrop).
│  • Talk to Savitri        │  Receive Lantern + 6-Mani-Shard redemption quest.
│  • Inspect Folded Ledger  │  Optional lore beat + [E] Look storytelling.
│  • Homa Fire Shrine       │  Temper Parashu / select starting Astra element.
│  • Cross Torch Archway    │  Pre-warms Chamber I MP4 seamlessly before entry.
└─────────────┬─────────────┘
              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    CURATED 5-CHAMBER ACT I GAUNTLET                       │
│                                                                           │
│  [Ch. I: Water Courtyard] ──► [Ch. II: Temple Mandapa] ──► [Ch. III:      │
│   Onboarding + Heavy Break     Ranged Wardens + Pillars     Funeral Pyres │
│   [E] Look: Sunken Bell        Astra Boon Choice            Raktabija     │
│                                                             Semi-Boss]    │
│                                                                 │         │
│  [Ch. V: Slag Eclipse]    ◄── [Ch. IV: Dundubhi Sanctum] ◄──────┘         │
│   Vrikodara 3D Boss Duel       3D Dundubhi War-Drum Boss                  │
│   2-Phase Escalation           Rhythmic Shockwave Rings                   │
│   + Susanoo Climax Beat        [E] Look: Cracked Drumhead                 │
└───────────────────────────────────────┬───────────────────────────────────┘
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  ACT I RESOLUTION & VERTICAL SLICE SHOWCASE ENDING                        │
│  1. Mani Shard #1 Recovered — Brief illustrated memory flash              │
│  2. Sanjaya Strikethrough #1 — Official chronicle text scratched out      │
│     in live crimson ink and rewritten with the truth                      │
│  3. Ferry I Boat Crossing — Quiet dusk river dialogue with Savitri        │
│  4. Vertical Slice Complete Card — Run stats, Replay Act I, Support CTA   │
└───────────────────────────────────────────────────────────────────────────┘
```

### Interactive Feedback, Combat Feel & Motion

- **Fluid Combo Spamming (Zero Freezing)**: Pressing `J` rapidly chains `Attack 1 → Attack 2 → Attack 3` seamlessly with `0.07s` skeletal cross-fades and crisp restart triggers—Rudra's 3D body swings on every single tap instead of freezing on the final frame. Dash (`Space`) plays the dedicated 3D dodge roll clip with crisp ink afterimages.
- **Devastating Heavy Attacks (`K`)**: Even at 0 Focus Orbs, Heavy deals true heavy impact (`1.45×` base power instead of the current punishing `0.75×`), scaling dramatically up to `4.20×` at 4 Focus Beads. Connecting a Heavy triggers a **45ms tactile hit-stop**, **12% dynamic camera punch-in**, **guard/armor shatter** on shielded elites, and a brief Devanagari *प्रहार* / *विच्छेद* stamp.
- **2-Frame Sumi-e Impact Frames**: On Heavy Finishers, Boss Phase Breaks, and Susanoo Cleaves, the screen flashes a stylized 2-frame high-contrast black-and-white brush-ink freeze frame (true modern anime sakuga signature) before unleashing elemental particles.
- **Kala-Bhairava Astral Avatar (`Q` Rage Mode)**: Triggering full Wrath erupts a towering translucent 3D spectral colossus wrapped around Rudra—glowing molten-amber ribcage, horned Rudra temple mask, and colossal spectral arms gripping a giant Parashu. Every `J` or `K` swing commands the colossal avatar to sweep across half the arena in unison, leaving glowing temple-ember ribbons, while Savitri's Lantern flame on the HUD dims toward red ash until Rage ends.
- **Painterly Ukiyo-e Water Dragon**: Replaces flat geometric blue/beige cones with an organic sculpted water-crest head, custom GLSL Fresnel ink-edge + swirling Prussian indigo & sea-foam watercolor shader, flowing ribbon whiskers, and bursting ink-rimmed water droplets along the dragon's spine.

### Stage B User Flow — Samudra Manthan & Amaravati Heaven Prologue (Built After Act I Is Complete)

```
┌───────────────────────────────────────────────────────────────────────────┐
│  1. SAMUDRA MANTHAN ANIMATED PAINTING CUTSCENE (35–45 sec, skippable)     │
│     Layered Balinese / Indian Pattachitra scroll canvases animated via    │
│     parallax camera pans, glowing ink reveals, Vasuki churning waves,     │
│     Amrita emergence, and Rudra's birth as the ruthless Deva general.     │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  2. AMARAVATI HEAVEN ACTION PROLOGUE (Fast, Power-Fantasy Rampage)        │
│     • Rudra drops directly from storm clouds into golden Amaravati.       │
│     • Full endgame kit unlocked (all 4 elements + rapid Susanoo Rage).    │
│     • Relentless Deva wave slaughter across celestial temple terraces.    │
│     • Dynamic War-Folk Percussion Engine (Aari Aari / Thor Ragnarok feel):│
│       Taking damage applies real-time Web Audio convolution reverb +      │
│       brief low-pass muffle & heartbeat thump before snapping back hard.  │
└───────────────────────────────────┬───────────────────────────────────────┘
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  3. LORD VISHNU (THE PRESERVER) — CLIMACTIC PROLOGUE BOSS DUEL            │
│     • Golden-blue cel-shaded deity boss with Sudarshana Chakra rings.     │
│     • Player clashes at peak power (including Susanoo Rage collision).    │
│     • Scripted Phase 2 turning point: Vishnu shatters Rudra's Mani into   │
│       6 blazing shards that scatter across the realms.                    │
│     • Silence → black screen → warm lantern crackle → SMASH CUT into      │
│       Act I Vaitarani Riverbank beside Savitri.                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1 — Live Skeletal `AnimationMixer` Replacing Snapshot Pose Cache**
  - *Chosen Approach*: Eagerly preload all 10 local Rudra FBX clips on boot, run a continuous per-frame Three.js `AnimationMixer` driven by real delta time, track a monotonically incrementing `attackSerial` so repeated `J` taps cleanly restart/advance combo clips with `0.07s` `crossFadeTo` blending, and bind the dedicated `dodge.fbx` clip to Dash.
  - *Why*: Eliminates the root cause of Rudra freezing mid-swing (the `5.2×` clamped progress timer + lazy `setTimeout` clip loads + 4-step quantized pose cache) while keeping VFX active-frame synchronization pixel-accurate to the axe head.
  - *Alternatives Considered*: Increasing cache step count from 12 to 32—rejected because quantized caches still cannot cross-fade between rapid combo cancels or restart cleanly on spam clicks.

- **Decision 2 — Heavy Attack Power & Act I Pacing Rebalance**
  - *Chosen Approach*: Shift Heavy Focus Orb multipliers from `[0.75, 1.45, 2.15, 2.95, 3.85]` to `[1.45, 1.95, 2.55, 3.30, 4.20]`, add reliable stagger/shield-break on Heavy connect, slightly shorten Heavy recovery wind-down so players can dash-cancel after impact, and tune Act I Elite Wardens / Dundubhi / Vrikodara HP pools down ~22–28% with crisper telegraphed windows.
  - *Why*: Previously an uncharged Heavy dealt less damage than two fast lights while locking Rudra in place, teaching players to ignore Heavy attacks and making Act I feel punishingly spongy. Now Light builds rhythm and Focus Beads, and Heavy is a genuinely rewarding finisher at any charge level.
  - *Alternatives Considered*: Making enemies simply deal less damage—rejected because low-damage sponges still feel sluggish and dull to watch in showcase recordings.

- **Decision 3 — Pre-Warmed Per-Chamber MP4 Arena Pipeline**
  - *Chosen Approach*: Assign each of the 6 Act I locations (Vaitarani Hub + Chambers I–V) a unique animated MP4 from the provided arena library (including bringing the unused `waterCourtyard` MP4 into Chamber I), eagerly pre-warm the *next* chamber's video stream during the previous chamber's clear/boon transition, and pair each biome with its own atmospheric shader tint and ambient particle profile.
  - *Why*: Eliminates the silent fallback to repetitive brown bonefield static PNGs caused by lazy GitHub streaming (`currentTime <= 0.01`), ensuring every chamber transition feels like stepping into a new handcrafted realm.
  - *Alternatives Considered*: Converting all 12 MP4s into heavy GIFs or static textures—rejected because smooth looping video arenas give the vertical slice tremendous environmental life at zero polygon cost.

- **Decision 4 — 3D Shader-Driven Kala-Bhairava Susanoo Avatar & Painterly Water Dragon**
  - *Chosen Approach*: Build the Kala-Bhairava Astral Avatar as a lightweight procedural 3D translucent Fresnel + sacred-flame GLSL mesh anchored to Rudra's root transform (torso ribcage, horned mask, twin articulated arms + colossal spectral Parashu bound to Rudra's attack swing curves), and rebuild the Water Dragon head/body using sculpted organic geometry with a custom watercolor sea-foam/indigo GLSL shader and trailing droplet ribbons.
  - *Why*: Procedural shader-driven translucent meshes run smoothly at 60 FPS alongside all existing 3D enemy rigs, look unmistakably hand-crafted (never flat "color-coded" plastic primitives), and sync frame-perfectly with Rudra's animations.
  - *Alternatives Considered*: Downloading/rigging a second massive high-poly skeletal boss rig for Susanoo—rejected due to memory overhead and desync risk during fast combo cancels.

- **Decision 5 — Full 3D Cel-Shaded Act I Bosses (Dundubhi & Vrikodara)**
  - *Chosen Approach*: Upgrade Dundubhi (using the provided local Dundubhi 3D rig and animation clips instead of the dark flat Chamber IV silhouette) and Vrikodara into full anime cel-shaded 3D models with inverted-hull Sumi-e ink outlines, distinct silhouette readability, and boss-tier dramatic telegraph VFX.
  - *Why*: Bosses are the centerpiece of any showcase trailer or donation campaign; having flat dark silhouettes next to cel-shaded Rudra breaks visual polish immediately.

- **Decision 6 — Two-Stage Execution (Act I Complete Before Prologue)**
  - *Chosen Approach*: Ship Stage A (Act I) with clean hook points (`StoryChapterState: 'cutscene_manthan' | 'prologue_heaven' | 'act1_hub' | 'act1_chamber' | 'act1_finale'`) so Stage B drops directly in front of Vaitarani Hub without rewriting combat, audio, or UI systems.
  - *Why*: Guarantees an end-to-end playable, bug-free Act I vertical slice first—never leaving half-finished Prologue and half-finished Act I systems competing for polish.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         KALIYUGA VERTICAL SLICE APP                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  CHAPTER DIRECTOR & PROGRESSION STATE                                  │  │
│  │  Stage A: [Vaitarani Hub] ─► [Ch I–V Gauntlet] ─► [Shard #1 & Ferry I] │  │
│  │  Stage B: [Manthan Mural Cutscene] ─► [Heaven Prologue] ─► [Vishnu]    │  │
│  └───────────────┬──────────────────────────────────────┬─────────────────┘  │
│                  │                                      │                    │
│                  ▼                                      ▼                    │
│  ┌─────────────────────────────────┐   ┌──────────────────────────────────┐  │
│  │  CORE COMBAT & BALANCE ENGINE   │   │  KALIYUGA-IDENTITY HUD & STORY   │  │
│  │  • Combo Serial & Cancel Rules  │   │  • Chola Brass Vitality + 4 Beads│  │
│  │  • Rebalanced Heavy (1.45×–4.2×)│   │  • Live Savitri Lantern Flame    │  │
│  │  • Stagger & Shield-Break Logic │   │  • Devanagari Impact Stamps      │  │
│  │  • Kala-Bhairava Wrath Meter    │   │  • Tala-Patra Dialogue & Codex   │  │
│  │  • 6-Mani-Shard Canon State     │   │  • Sanjaya Strikethrough Overlay │  │
│  └───────────────┬─────────────────┘   │  • Vertical Slice Support Card   │  │
│                  │                     └────────────────┬─────────────────┘  │
│                  ▼                                      │                    │
│  ┌──────────────────────────────────────────────────────┴─────────────────┐  │
│  │  UNIFIED 3D + SHADER + ARENA RENDERING PIPELINE                        │  │
│  │                                                                        │  │
│  │  ┌─────────────────────┐ ┌─────────────────────┐ ┌──────────────────┐  │  │
│  │  │ Rudra Live 3D Rig   │ │ Enemy & Boss 3D Rigs│ │ Sakuga WebGL VFX │  │  │
│  │  │ • Eager Local FBX   │ │ • Anime Cel Shader  │ │ • Painterly Water│  │  │
│  │  │ • Continuous Mixer  │ │ • Dundubhi 3D Rig   │ │   Dragon Shader  │  │  │
│  │  │ • 0.07s Cross-Fade  │ │ • Vrikodara 3D Rig  │ │ • Lightning /    │  │  │
│  │  │ • Kala-Bhairava 3D  │ │ • Vishnu 3D (Stg B) │ │   Fire / Wind    │  │  │
│  │  │   Susanoo Overlay   │ │ • Tiered VFX Cap    │ │ • 2-Frame Sumi-e │  │  │
│  │  └─────────────────────┘ └─────────────────────┘ │   Impact Frames  │  │  │
│  │                                                  └──────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Pre-Warmed MP4 Biome Deck & Camera Director                      │  │  │
│  │  │ • 6 Distinct Act I MP4 Arenas + Next-Chamber Pre-Buffer Queue    │  │  │
│  │  │ • Per-Biome 60-30-10 Color Grade, Fog & Ambient Particle Layer   │  │  │
│  │  │ • Dynamic Hit-Stop, Heavy Zoom-Punch & Boss Entrance Framing     │  │  │
│  │  └──────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────┬────────────────────────────────────┘  │
│                                      ▼                                       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  ADAPTIVE MYTHIC AUDIO ENGINE (Web Audio API)                          │  │
│  │  • Parashu Steel / Thunder / Water / Susanoo Roar Layered SFX          │  │
│  │  • Stage A: Biome Ambience + Boss Escalation Drums                     │  │
│  │  • Stage B: War-Folk Percussion + Real-Time Hit-Reverb & Muffle DSP    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Data Model & State

- **Run & Chapter State**: Tracks active vertical-slice stage (`act1_hub`, `act1_chamber_1` through `act1_chamber_5`, `act1_resolution`, and Stage B's `cutscene_manthan`, `prologue_heaven`, `prologue_vishnu`), Mani shards recovered (`0 / 6` → `1 / 6` at Act I end), inspected `[E] Look` narrative objects, Savitri Lantern warmth (`0.0–1.0`, dipping during Susanoo Rage and recovering through calm strikes), and run metrics (time, max combo, heavy breaks, bosses felled) for the Vertical Slice Ending Card.
- **Rudra Animation & Combat State**: Tracks `attackSerial` (incremented on every combo step), `activeAction` (`idle`, `run`, `attack1`, `attack2`, `attack3`, `heavy`, `cast`, `dodge`, `block`, `hurt`), `susanooActive` + remaining duration (`0–10s`), Focus Beads (`0–4`), and exact axe active-frame windows synchronized to VFX spawns.
- **Arena Biome Registry**: Maps each chamber ID to its primary local/proxied MP4 stream, fallback high-res still, next-chamber preload target, directional lighting palette, fog tint, and ambient particle emitter (mist, water sparks, incense embers, storm arcs, volcanic ash).
- **Stage B Audio DSP State (Phase 2)**: Maintains a Web Audio routing graph (`Music Bus → BiquadFilterNode (low-pass) → Dry/Wet ConvolverNode (temple reverb) → Master`). Taking a hit triggers an immediate envelope sweep (`wetGain: 0.05 → 0.72`, `lowPassFreq: 18kHz → 850Hz`, heartbeat sub-pulse) that smoothly recovers over `1.1s` so impacts feel cinematic without muddying extended combat.

### Interactive Component & State Mapping

| Player Interaction / Game Event | State Mutation & Visual / Audio Response |
| :--- | :--- |
| **Rapid Light Tap (`J`)** | Increments `attackSerial`, immediately advances `attack1 → attack2 → attack3` in live `AnimationMixer` with `0.07s` cross-fade; spawns crisp light-tier elemental trail strictly at axe active frame. |
| **Heavy Strike (`K`)** | Consumes 0–4 Focus Beads for `1.45×–4.20×` damage; plays full `heavy` swing with `45ms` hit-stop, `12%` camera punch-in, 2-frame Sumi-e ink flash on finisher/break, guard shatter + stagger, and Devanagari *प्रहार* / *विच्छेद* stamp. |
| **Dash (`Space`)** | Triggers dedicated `dodge.fbx` 3D roll animation + ink afterimages; perfect timing grants brief invulnerability, sparks *अवहेलना* stamp, and refills 1 Focus Bead. |
| **Cast Elemental Astra (`L`)** | Fires active element—including the rebuilt painterly Ukiyo-e Water Dragon (organic ink-edged head + sea-foam GLSL shader + splash bursts) or sculpted Thunder plasma bolt. |
| **Unleash Kala-Bhairava Rage (`Q`)** | When Wrath seal is full, erupts the towering 3D translucent Susanoo colossus around Rudra, flashes *रौद्र* stamp, locks colossal spectral Parashu swings to Rudra's real-time attacks for huge AoE shockwaves, and subtly dims Savitri's Lantern flame on HUD. |
| **Interact in Hub / Chambers (`E`)** | Opens Tala-patra palm-leaf dialogue with Savitri, tempers Parashu at Homa Fire Shrine, or displays concise atmospheric `[E] Look` room-tone observations; clearing a chamber opens the exit gate and switches seamlessly to the already pre-warmed next MP4 biome. |
| **Defeat Vrikodara (Chamber V)** | Triggers 2-frame climax impact finish → Mani Shard #1 Memory flash → live crimson-ink Sanjaya Strikethrough Correction #1 → Ferry I boat ride → Vertical Slice Complete & Support Card with replay and community donation link. |
| **Stage B: Prologue Hit Reaction** | Taking damage during the Amaravati Heaven battle fires the Web Audio hit-reverb + low-pass muffle envelope on the driving war-folk soundtrack while screen edges pulse golden-crimson before snapping back into the beat. |

---

### Verification & Polish Milestones

- **Stage A Sign-Off (Before Starting Stage B)**:
  1. Unit-test suite covering rebalanced Heavy damage scaling, Focus Bead spending, combo serial transitions, Susanoo timer & Lantern warmth math, and 6-Mani-Shard progression.
  2. Live browser verification across Vaitarani Hub and Chambers I–V confirming: zero frozen Rudra animations during rapid `J`/`K`/`Space` spamming, visibly distinct playing MP4 biomes in every chamber, painterly Water Dragon head & body clarity, 3D cel-shaded Dundubhi & Vrikodara bosses, dramatic Kala-Bhairava Susanoo overlay, clean non-*Hades* Chola-brass HUD with zero console errors, and complete end-to-end playthrough to the Support Ending Card.
- **Stage B Sign-Off (Full Vertical Slice Complete)**:
  1. Live verification of the animated Pattachitra Samudra Manthan cutscene (with smooth skip option), Amaravati Heaven action pacing, real-time Web Audio hit-reverb DSP on damage, Lord Vishnu boss duel + 6-shard shatter climax, and seamless transition directly into Act I's Vaitarani Riverbank.

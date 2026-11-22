# Meru Cinematic Production Core (experimental branch)

This branch is intentionally isolated from the playable `main` branch. It is **not a completed AAA game engine** and **must not be merged based on automated CI alone**.

## Implemented

- `engine/meru/cinematicTimeline.ts`: versioned JSON schema, strongly validated track data, deterministic camera/actor/lighting interpolation, precisely-once forward sound/events, seek/pause/replay/skip-safe state.
- `engine/meru/portalDirector.ts`: Canvas2D Deva/Warden/Vaitarani portal visual language and a loading-safe transition state model. The visual render path is integrated into *existing regular chamber gates*, and the north hub ferry gate displays a distinct teal Vaitarani portal. Full journey/loading-gated transition choreography remains unimplemented.
- `engine/meru/adaptiveQuality.ts`: bounded quality budgets with hysteresis and frame-time sampling; the cinematic runtime now uses measured frame durations to throttle boss rendering and scale ash particles. Game-wide adaptation remains future work.
- `engine/meru/cinematicVisuals.ts`: shared rendering and subtitle pass used by editor and actual in-game cinematic.
- `engine/meru/runtimePolicy.ts`: safe, tested boss-introduction eligibility (no title/phase2/cleared starts); reads the validated Studio-authored Dundubhi scene from browser storage and falls back to the built-in scene.
- `components/game/MeruCinematicPlayback.tsx`: in-game skippable Dundubhi entrance. Uses the actual boss FBX renderer, authored timeline, MP4, cues, keyboard guard, resource cleanup and player's mute setting.
- `components/game/KaliyugaArena.tsx`: live Chamber IV handoff; freezes gameplay, clears buffered input and restores control and grace invulnerability on skip/finish. Vaitarani hub's north ferry gate now has its own teal animated passage.
- `scripts/meru/browser-qa.mjs`: Chromium E2E check for editor play/pause/export and real Chamber IV loading/Skip; screenshots and JSON preserved by CI artifact. Natural completion and exported authored-scene roundtrip **passed** in Chromium on [run 44933933727](https://github.com/akshat92008/kaalyuga/actions/runs/44933933727).
- `components/game/MeruCinematicStudio.tsx`: playable standalone Dundubhi scene editor. Scrub, play/pause, keyframe editing for cameras, boss scale/opacity, atmospheric parameters, inspect cue tracks, import/export validated JSON, and browser-local autosave. Reuses actual Kaliyuga boss renderer, video, poster and audio.
- `app/meru-studio/page.tsx`: route for the editor; only browser runtime.
- `lib/game/chamberGeometry.ts`: additive magical portal energy behind original painted gates and 450ms soft transition from painted still to decoded MP4.
- `engine/meru/meruCore.test.ts`: regression tests for schema safety, interpolation, event playback, adaptive tiers and portal loading.
- `.github/workflows/meru-production-core.yml`: regression suite, focused strict TypeScript gate, full repo TypeScript audit (informational while old debt remains), and Next production build.

## Run

In a complete checkout with Node 22 and installed dependencies:

```bash
npm install
npm run dev
```

Then open `/meru-studio`. Asset URLs are existing project paths. Exported `.meru.json` files are version 1. Do not rename asset references without migrating the scene file. **The editor's validated saved Dundubhi scene is consumed by the live Chamber IV cinematic** in the same browser; both completion and Skip return control to combat. Scene authoring does not change combat saves.

## Known important limitations / no overclaims

1. **No visual signoff** until captured screenshots/video of this exact branch demonstrate correct boss scale, floor contact, camera framing, sound timing and frame pacing on real target hardware.
2. **No production-quality character choreography authoring**: existing boss FBX animation mixer supports attack/windup/idle; IK, proper partner synchronization, facial animation, and shot retargeting are not implemented.
3. **No full 3D arena conversion**: MP4 backgrounds are intentionally retained. Camera edits cannot provide physically correct parallax of a flat video.
4. **Quality budgets are defined and regression-tested**, but the full game still requires performance manager integration and real frame-time profiling. Studio preset is a reference setting, not a claim that all graphics settings automatically apply.
5. **Warden/Deva effects are visible in normal chambers and teal Vaitarani energy in the hub**. The full loading-gated portal transition is currently a pure tested state machine, not a complete gameplay scene transition.
6. **Legacy codebase TypeScript debt** exists in `KaliyugaArena.tsx`, tests, `unifiedWorld3DStage.ts` and other legacy modules. Focused Meru typecheck is separate from full-repo audit, which is explicitly non-blocking so existing unrelated errors remain visible.
7. Full Act I game-playtesting, accessibility, memory, audio unlock/autoplay, video decoding, stale asset error recovery and regression at all resolutions are still required.
8. This work does **not** implement the complete seven-phase cinematic-production engine. It is an isolated, tested foundation.


## Second Meru milestone: actual boss assets and dual-boss authoring

- The originally bundled Dundubhi scene referenced outdated `/kaalyuga/arena/...` paths, leaving its cinematic background vulnerable to a blank video/poster. The built-in scene now references the actual **Chamber IV MP4** and painterly poster through Kaliyuga's existing static-asset proxy.
- `createVrikodaraScene()` adds an independent **Chamber VIII** camera, performance and light track, using the Vrikodara rig and the actual Phase I Sanctum artwork.
- Both normal live boss encounters can open an authored in-game intro, with the same safe completion/skip contract and muted-audio behavior.
- `/meru-studio` can select either boss and author camera zoom, roll, shake, X/Y; boss X/Y, scale, visibility and animation state; lighting exposure, ash, vignette and warmth; and drum/roar/impact/subtitle cues.
- Scene edits are stored under **separate browser-local keys per boss**; hydration now finishes before autosave, preventing an unedited default from overwriting saved authoring on page load.
- Frame-zero cues are emitted exactly once after beginning/restarting playback.
- `scripts/meru/browser-qa.mjs` now checks the real MP4/poster URLs (via HEAD), Vrikodara scene export and the actual Chamber VIII boss introduction/Skip, in addition to Dundubhi's Skip and natural completion.
- **Important limitation:** Studio scene edits persist only in the author's browser unless exported and incorporated into a shipped game build. Player browsers do not automatically receive another browser's scene JSON.
- **Important visual limitation:** animations, pose believability, cinematic scale, lighting matching and screenshot review remain unverified. Automated browser tests do not establish AAA artistic fidelity.


## Verified dual-boss first-frame milestone — Nov 21, 2026

- **Core checks passed:** 13/13 automated regression tests, strict Meru TypeScript check and Next.js production build ([CI run](https://github.com/akshat92008/kaalyuga/actions/runs/44936404288)).
- **Browser integration passed:** [Chromium run 44936400315](https://github.com/akshat92008/kaalyuga/actions/runs/44936400315). The editor can select both bosses; actual painted posters and MP4 backgrounds returned HTTP 200; a Studio-authored cinematic plays in the appropriate Act I boss encounter.
- **Both 3D models genuinely loaded:** browser checked `data-meru-rig-status=rigged` and `data-meru-started-with-rig=yes` for both Dundubhi and Vrikodara. Their first cinematic frames use the original 3D rig, not a disguised portrait fallback; the renderer remained usable through the screenshot checkpoint.
- **Transition back to gameplay passed:** Dundubhi Skip and natural end both release combat, and Vrikodara Skip releases combat, with zero uncaught browser errors.
- **Slow asset loading corrected:** the camera/animation timeline waits for actual boss-rig readiness where possible, with a 12.5s watchdog to avoid indefinite loading. Later-loaded rig still promotes from portrait fallback; missing rigs do not block the run indefinitely.
- **Evidence:** [downloadable CI artifact with studio screenshots, both boss screenshots and exported scene JSON](https://github.com/akshat92008/kaalyuga/actions/runs/44936400315/artifacts/14720100090).
- **NOT proven:** screenshot aesthetics, smoothness and character silhouette have not been artistically reviewed in this response; software Chromium runs do not validate M3 Air or Windows performance. No 30-minute soak, animation-quality pass, lip sync, multi-actor choreography or full portal-travel cinematic exists yet.

## Release acceptance criteria (not yet met)

- Real screenshot/video review of the editor at `/meru-studio`.
- Chromium verified the real Chamber IV cinematic appears, loads the Studio-authored JSON, and releases the overlay on **both Skip and natural completion** with zero uncaught JS exceptions ([workflow](https://github.com/akshat92008/kaalyuga/actions/runs/44933933727)). Full gameplay timing, input-state and video/audio review on real hardware remains required.
- Correct phase transitions and path/hub portals even under slow-network video decode.
- Zero new TypeScript errors; work toward resolving legacy errors before setting strict repo-wide CI.
- Frame-time, memory and 30-minute soak tests on M3 Air and entry-level Windows hardware.
- Real animation editor for bone posing/IK/character sync, plus authored story sequences.
- VFX/lighting coherence and captured visual signoff on one Dundubhi boss encounter.
- Only then consider merging a completed production stage.

## Test commands

```bash
npx tsx --test engine/meru/meruCore.test.ts
npx tsc --noEmit --project tsconfig.meru.json
npm run build
```

CI: `.github/workflows/meru-production-core.yml`. The job includes a non-blocking full repository type audit and reports its errors; do not equate its success with a completely type-safe legacy engine.

## Meru continuation — portal journeys and original-rig phase reveals (2026-11-22)

Changes on draft PR #9, **not on main**:

1. **Vaitarani ferry and regular gate journeys:** a lightweight skippable Canvas2D portal-travel UI now covers actual room changes. It retains original painted/MP4 arenas, gates the switch on destination poster readiness (7s bounded image fallback), clears buffered input, and never requires a second MP4 decoder or a 3D arena rebuild. Walk-in ferry, ferry interaction, hub NPC entry, boon-completion and right-gate/timeout transitions share this passage. Direct URL/debug starts stay unchanged. Duplicate gate reward claims are guarded.
2. **Poster-to-video continuity:** the real boss-cinematic player and Meru Studio retain the painted poster until the MP4 decodes a first frame, then crossfade into moving scenery. Failed video playback leaves the poster visible.
3. **Real original-boss phase reveals:** Dundubhi and Vrikodara now have distinct 4.2-second authorable phase-II and phase-III timelines using the original Boss3DRenderer. Vrikodara phases use the existing Blood-Eclipse/slag-furnace MP4 and painted Sanctum artwork. The combat loop triggers these only for actual live, living-boss phase transitions, excluding title, debug phase starts and cinematic=0. Skip returns to combat.
4. **Scene isolation / editor:** phase scenes use separate per-boss/per-phase browser-local keys. Studio can select, edit and export all six scenes. The existing v1 schema remains backward compatible; a validated optional bossPhase selects the true rig phase in the original 3D renderer.
5. **Legibility:** anchored ground shadows and authored ink-impact rings and sparks reduce the cutout feel, with lightweight 2.5D effects appropriate for the M3 Air budget.
6. **Automated checks:** CI includes Node regression tests, focused Meru TypeScript, Next production build, and Chromium Studio/game browser QA. Extended browser QA tests the walkable hub→ferry transition and Phase-II scene export.

### Unfinished release gates

The new passage and phase scenes require verified browser screenshots, repeated full gameplay testing across transitions and input methods, checks for slow video/poster loading, 30/60 FPS strike timing, audio unlock and frame pacing, M3 Air 8GB GPU and thermal profiling, and director approval for visual staging. The real rig phase sequences reuse existing animation states; bone posing/IK, bespoke transformation meshes, synchronized multi-character performance, facial animation, lip sync and full cinematic scene physics are **not complete**. Scene authoring is browser-local until exported and committed. **Keep PR #9 in draft and unmerged** pending full evidence.

## Director-approved production scenes and accessible cinematic playback (2026-11-22)

**Production shipment:** Studio exports no longer have to remain browser-only. Run `npm run meru:ship-scenes -- path/to/export.meru.json` to validate one or more reviewed files and atomically add them to `engine/meru/productionScenes.json`. Review and commit that manifest; the production game bundles these scenes. Run `npm run meru:verify-scenes` before shipping.

**Fallbacks:** This manifest currently has zero installed custom scenes. That is intentional: both boss intros and all four phase reveals already have compiled hand-authored defaults. Invalid or foreign scenes never replace them. Development gameplay can use local Studio previews; production gameplay ignores browser-only draft data. Studio itself always loads the author's local draft.

**Safety:** The installer rejects unknown boss/phase IDs, unsafe pose values, invalid local asset paths, oversized JSON and duplicate batch entries. CI validates the manifest and runs an actual temporary export-to-install smoke test. A rejected batch must not modify the compiled manifest.

**Accessibility:** The active authored subtitle is mirrored into a screen-reader status region in live cinematics. Reduced-motion systems suppress camera shake and large impact-streak motion while preserving timing, titles and the return to gameplay.

**Still not signed off:** True multi-character Rudra/Vishnu choreography, full bone IK/retargeting, lip sync, all story interludes, full chamber-path playtests, 30-minute Mac M3 Air/Windows GPU frame pacing and thermals, every boss-camera visual review, texture-source sharpness and legacy repository-wide TypeScript cleanup. Passing headless Chromium tests does not establish AAA visual fidelity.

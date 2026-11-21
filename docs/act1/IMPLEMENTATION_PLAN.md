# Act I premium-polish production plan

Scope: **existing** eight chambers + Vaitarani hub. The prologue is excluded. This project stays on the custom Meru/React/Three/Next engine; target is a polished premium indie experience, not an unverified AAA parity claim.

## Milestone 0 — Protect and characterize (current branch)

- [x] Fork protected development work from the unmerged Act I stabilization draft; never change `main` silently.
- [x] Inspect scene declarations, animation/VFX/pipeline architecture and asset tree.
- [x] Write `BASELINE_AUDIT.md`, `ASSET_INVENTORY.md`, `COMBAT_ANIMATION_AUDIT.md`, `VFX_RENDERING_AUDIT.md`, `PERFORMANCE_BASELINE.md`.
- [ ] Run a real baseline gameplay video capture and end-to-end playtest on target hardware. Not possible from pure GitHub source inspection.
- [ ] Quantify GPU and browser frame-time/memory baselines, then freeze a repeatable recording plan.

Exit: CI passes; all unverified runtime observations explicitly flagged, not asserted.

## Milestone 1 — Trustworthy timing, footage and observability

- [ ] Instrument raw-frame percentiles with a bounded/opt-in performance trace, excluding hidden-tab and load gaps.
- [ ] Log animation state transition, active damage frame, trail peak, contact sound and hit-stop timestamps in debug captures.
- [ ] Improve unit tests for input buffering, parry, camera clamping/recovery, end-of-chamber load gate, failure and retries.
- [ ] Build optional browser screenshots/Playwright smoke: hub, Ch 1, Dundubhi and Vrikodara in genuine built app (requires media checkout).
- [ ] Preserve save keys and existing gameplay inputs.

Exit: measurable frame metrics, active-frame traces, no TypeScript errors or critical regressions.

## Milestone 2 — Rudra physicality and attack readability

- [ ] Asset-wise rig/bone/clip coverage; validate right-hand socket and stride/feet.
- [ ] Data-driven animation cue timelines for existing light1/2/3, heavy, parry, dodge and execution.
- [ ] Synchronize existing hitboxes, VFX and contact sounds without stealth damage/balance edits.
- [ ] Polish blade-following tapered core and directional secondary effects with actual screenshot A/B.
- [ ] Verify minimum no-effects weapon silhouette quality.

Exit: 4-facing video A/B, no pop/slide/contact mismatch; input reliability at 30/60 FPS.

## Milestone 3 — Scripted Blender processing & first finisher

- [ ] First audit each source FBX using Blender, with rig names, transforms, clips, duration, skin/UV info, validation report.
- [ ] Export originals untouched; validate optimized GLB/FBX fallback and engine animation action.
- [ ] Build one **reliable** overhead Parashu finisher with short contact, enemy reaction, safe camera and guaranteed release.
- [ ] Prototype sweep and armor-break variants only if playable without unsafe retargeting/synchronized grabs.
- [ ] Failure path: use existing short, reliable weapon execution rather than a broken custom grab.

Exit: clip/rig/weapon contact report, screenshots and all tests green.

## Milestone 4 — Dundubhi benchmark

- [ ] Validate 3D idle/locomotion/charge/pillar hit/armor crack/recover/death clips.
- [ ] Align sound + charge corridor to body/horn orientation; keep four-pillar bait puzzle untouched.
- [ ] Add brief skippable in-engine boss intro and single bespoke cracked-armor final blow, controlled zoom and pause release.
- [ ] Play 3 win/3 loss attempts; check restart and pillar reset, no stalls.
- [ ] Fix only demonstrated collision/fairness defects.

Exit: clean charge path, visible punish window, readable camera and repeatable mechanic.

## Milestone 5 — Regular roster then Vrikodara

- [ ] Enemy visual priority: tiny mob, heavy warden, boss; no unsafe screen-wide effects for small attacks.
- [ ] Retarget and test each archetype; fix telegraph/idle/recover/death behavior.
- [ ] Signature Vrikodara furnace, vacuum, molten slag and phase shots, contrasted with Dundubhi's bronze percussion style.
- [ ] Preserve memory shard and narrative aftermath, no prologue work.

Exit: veteran boss actions distinct, counters understandable, post-fight state reliable.

## Milestone 6 — Cohesion, audio and settings

- [ ] Ground shadows, occlusion/depth, camera zoom, actor/arena scale and phase backgrounds in every chamber.
- [ ] Verify original audio licensing, voice file reachability, contact synchronization and adaptive BGM transitions.
- [ ] Provide Performance/Balanced/Cinematic UX **mapped** to backwards-compatible Meru settings.
- [ ] Release HUD cleanup, proper modal focus/input handling and no developer overlays by default.

Exit: full 8-room screenshots at two resolutions with readable telegraphs and UI.

## Milestone 7 — Release gate

- [ ] Full hub-to-Ch8 playthrough from a fresh save, then repeat; all win/lose, restart, damaged asset and slow network paths.
- [ ] Mac M3 Air (8GB) 60 FPS target when feasible; publish p95/p99 and lower-performing preset rather than promise.
- [ ] Check GPU resource disposal, context loss, sound track transitions, accessibility, save compatibility and control responsiveness.
- [ ] Compare captured before/after fight videos with both gamer and director scorecards.

Exit: no critical crashes, reproducible game state, gameplay footage reviewed, no missing actors, documented known issues. **No merge before exit.**

## Required stop conditions

Stop a milestone if a rig disappears, animation corrupts, save data changes without migration, input remains locked after cutscene, boss mechanic changes without approval, or a major FPS regression appears. Roll back to the last known-good commit; do not ship screenshot-only spectacle.

## Execution evidence

Record every authored improvement as (1) commit SHA, (2) tests actually run and result, (3) before/after screenshot/clip links, (4) known limitations, (5) measured performance. An unchecked box is **not** a claim that it is finished.

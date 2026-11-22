# Kaliyuga — independent historical visual director review

Review date: 2026-11-22. **Evidence comes from archived CI gameplay captures, not the latest Neon or Codex builds.**

**Source:** [Passing Act I Chromium run 44940706905](https://github.com/akshat92008/kaalyuga/actions/runs/44940706905), artifact `act1-phase1-4-browser-evidence` (14721264196). The original PNGs are retained in that artifact; this document changes no gameplay, VFX, camera or asset files.

## What is visible in archived still frames

| Capture | Observation | Suggested human review |
|---|---|---|
| `09-agni-smash-heavy-contact.png` | Large solar ring and separate flame spikes dominate the viewport relative to Rudra and the visible strike. The center character is visually secondary. | Compare sword-arc/axe-tip alignment and clarity at normal gameplay speed, check for player silhouette occlusion and excessive full-screen coverage. |
| `09-vajra-thunder-heavy-contact.png` | Long lightning branches extend far from the attack origin and reach the right/lower viewport boundaries. | Verify that contact starts at weapon/enemy and that branches do not cover telegraphs or HUD in boss-heavy fights. |
| `10-varuna-water-dragon.png` | Water reads primarily as a near-complete blue loop/ring in the captured frame. | Evaluate intended serpent/flow direction in a moving sequence, not from this single frame alone. |
| `10-guardian-heavy-contact.png` | Bright red crescent is visually far to the right of the character; a large orange guardian silhouette and multiple overlaid `KALA-BHAIRAVA` name/title strings crowd the upper center. | Check blade-to-effect continuity and HUD/title layering. Determine whether the crescent geometry is deliberate before changing it. |
| `05-dundubhi-impact.png` | Boss appears small within the *cinematic lab* canvas, surrounded by lab controls; this is a lab preview, not the final in-game cinematic. | Review final in-game 16:9 framing and whether the boss entrance reads as imposing on target display. |

**None of these screenshots proves a present-day regression.** This is a historical, frame-limited evidence list. No animation continuity, footage sound, or actor-to-effect synchronization can be certified from still images.

## Actual cross-run comparison (separate successful builds)

Comparison tool run: [isolated QA workflow 44995854935](https://github.com/akshat92008/kaalyuga/actions/runs/44995854935).

- Earlier successful browser build run `44939178918`, artifact `14721127425`.
- Later successful browser build run `44940706905`, artifact `14721264196`.
- 17 matched screenshots compared pixel-for-pixel; five matching stems have incompatible dimensions and were deliberately **not** auto-resized.
- 0 unmatched stems across the two archives.
- Highest pixel changes among aligned-size captures: Dundubhi live entrance ~71.7%, spin execution ~69.7%, Vayu ~31.9%, Agni ~30.4%, Vajra ~29.1%, Guardian ~28.7%.
- Those differences can result from animation timing, camera or state variation; **changed pixels are not equivalent to improved or degraded art**.

## Acceptance protocol

1. Compare the same named move at the same active contact frame, camera zoom, stance and screen resolution in **the latest Neon build**.
2. For Agni, Vayu, Vajra, Varuna, Guardian: record 30–60fps clips with weapon-tips, player silhouette, hit spark, enemy contact and boss telegraph visible.
3. Mark each observation `still_present`, `fixed`, or `changed_by_design`; do not modify combat code based only on this historical gallery.
4. Review Codex's actual in-game Dundubhi cinematic independently of the old lab page.
5. Keep PR #12 draft; no automatic merges or source gameplay edits.

## Scope fence

This is **independent QA evidence for Phases 12–13**. It is not authorization to modify Neon's Phases 1–4 or Codex's cutscenes. A passing test suite is not visual director approval.

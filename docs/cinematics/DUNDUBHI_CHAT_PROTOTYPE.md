# Act I — Dundubhi Cinematic Lab (in-chat prototype)

**Status:** Implementation committed on a separate branch. Not yet run through a browser because no accessible browser or Blender rendering runtime was available in this session.

## What this builds

An isolated /cinematic-lab route that performs an approximately 8.6-second boss reveal using existing repository assets:

- Boss3DRenderer with the actual Dundubhi / Bellhorn Warlord FBX and existing action clips.
- GAME_ASSETS.arenaVideos.dundubhiMandapa with its original poster.
- Existing repository drum, roar and weapon-impact sound effects.
- Scripted scale, glow, shockwave, ash particles, letterboxing and title card.
- A replay/mute interface and portrait fallback if FBX/WebGL cannot load.

The prototype is not yet integrated into live combat and does not modify boss AI, game state, inventory or save data.

## How to inspect

From this branch in the existing development environment:

1. Run npm install if required.
2. Run npm run dev.
3. Open http://localhost:3000/cinematic-lab.
4. Select Play cinematic.
5. Check the status line to confirm the actual FBX rig loaded.

Assets use the existing Next.js routes and static-asset proxy; those URLs must be reachable.

## Known limitations

- Not visually verified yet. Inspect loading, figure framing, transparency, expected roar clip and correct MP4 perspective in a browser.
- The boss renderer's initial load may precede streaming of the full roar animation; replay if needed.
- No automatic MP4 export. Capture the result in-browser or add a separate render pipeline.
- The 2.5D scene uses controlled composition rather than unrestricted camera orbit.
- FBX and video streaming can be heavy on an 8 GB Mac. Profile before using in gameplay.
- Audio may be blocked by browser policy; gracefully fails.
- Run TypeScript, lint and production build before merging.
- Once visually verified, refactor the timeline into a reusable cinematic director and integrate with the existing boss-introduction story state.

## Why this route exists

The user requested a tangible cutscene built without Codex. Cloud Blender rendering capacity was unavailable and connected video generation needed a paid plan. This safe, reviewable GitHub branch demonstrates a no-extra-cost route using original game assets.
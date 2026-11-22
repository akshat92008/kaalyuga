# Kaliyuga — real Next.js media HTTP Range diagnostic

Verified on GitHub Actions run: https://github.com/akshat92008/kaalyuga/actions/runs/44996077068

**This is an isolated, QA-branch-only run of the real Next.js game server.** It does not modify the game's gameplay or media proxy code.

## Procedure

- Sparse checkout of Next.js app sources and two existing media examples:
  `public/kaalyuga/audio/hit.wav` and `public/kaalyuga/arena/dundubhi_chamber.mp4`.
- Installed app dependencies on Ubuntu runner, launched `npm run dev` at 127.0.0.1:3022.
- `scripts/qa/probe_http_media.py --skip-head` sent a GET with `Range: bytes=0-1023`.
- Measured time until response headers using Python, then read at most 1 KiB from each response.
- Repeated the same GET in the same server process, without process restart.
- Both commands passed; all four GET requests returned 206 with Content-Range.

## Recorded results

| Existing media asset | First GET status | First response (ms) | Repeated GET status | Repeated response (ms) |
|---|---:|---:|---:|---:|
| `/kaalyuga/audio/hit.wav` | 206 | 811.26 | 206 | 8.56 |
| `/kaalyuga/arena/dundubhi_chamber.mp4` | 206 | 2.12 | 206 | 1.08 |

Artifacts: `qa-real-media-range` from Actions run `44996077068` (ID 14743981200), including JSON responses and Next development-server log.

## Interpretation limits

- This establishes 206 response behavior for **these two sample URLs on a local runner**.
- The first 811 ms WAV response may include Next dev route compilation, filesystem startup and/or cache effects. The test does **not** isolate which component dominated.
- The first MP4 result being fast does not establish that remote/cache-miss media proxy fetching is fast; the checked-out file exists locally.
- The probe reads only 1 KiB and therefore does not establish full download throughput, start-to-play latency, audio decoding, video playback quality, FPS, or memory use.
- Timing does not translate to a MacBook M3 Air or a remote user on slow internet.
- A separate future **staging server with a real upstream cache miss** is needed to measure the static proxy's GitHub raw-fetch path under a cold cache.

## Action recommendation

No game code should be changed solely from these two numbers. If the actual player observes a first-hit delay, capture DevTools timing for a first-ever combat SFX request in an optimized production build, on a cleared cache, and compare with repeated requests. Engine owners can then target an identified bottleneck.

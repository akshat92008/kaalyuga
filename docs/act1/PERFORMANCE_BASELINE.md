# Performance and validation

| Measurement | Result |
| --- | --- |
| Avatar source geometry | Blender imported 145,124 vertices and 290,636 triangles. These are source counts before runtime simplification. |
| Boss source geometry | Dundubhi 279,848 triangles. Vrikodara 280,874 triangles. |
| Chamber media lifetime | A simulated eight-chamber run with prewarming retained at most two video sources and one playing element. Exit cleared all sources. This measures lifecycle behavior only. |
| Asset server memory | Baseline local-file reads bypassed byte accounting. The branch routes local and remote buffers through the same 256 MiB memory budget. |
| Game rules and regressions | 140 tests passed locally through Node's test API with TypeScript transpilation. |
| FPS, frame pacing, GPU memory, draw calls, input latency | Unmeasured. This execution environment rejects loopback listening. Parts of the installed Next.js and type dependencies are offline file placeholders. Production build and browser validation remain open. |

On a runnable checkout use Node 22, install dependencies and run `npm test`, `npm run typecheck`, `npm run build` and `npm start`. Capture a fresh-save run and a second run in the same tab. Record resolution, DPR, preset, median and 95th percentile frame time, longest frame, JS heap and GPU counters when available. Record chamber entry, first attack, avatar summon, Dundubhi pillar collision, Vrikodara phase change and hub return separately. Record missing asset requests so fallback-only runs are identifiable.

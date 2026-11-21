/**
 * Audit curated Kaliyuga Act I audio against the checkout.
 * Run: npx tsx scripts/audit-act1-audio.ts [--strict]
 * Unlike static URL-map tests, checks every source file behind Next.js asset routes.
 */
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { SoundEngine } from '../lib/game/audio';
import { buildCandidateRepoPaths } from '../lib/server/staticAssetProxy';

const root = process.cwd();
const strict = process.argv.includes('--strict');
const categories = {
  soundtracks: Object.entries(SoundEngine.BGM_TRACKS),
  effects: Object.entries(SoundEngine.SFX_FILES),
  voiceBarks: Object.entries(SoundEngine.VOICE_CLIPS),
};

let total = 0;
let missing = 0;
for (const [category, rows] of Object.entries(categories)) {
  let found = 0;
  for (const [name, uri] of rows) {
    total++;
    const pathname = decodeURIComponent(uri.split('?')[0]);
    const segments = pathname.split('/').filter(Boolean);
    const paths = buildCandidateRepoPaths(segments);
    const valid = paths.find((parts) => {
      try {
        return statSync(resolve(root, ...parts)).size > 0;
      } catch {
        return false;
      }
    });
    if (valid) {
      found++;
    } else {
      missing++;
      console.error('MISSING', category, name, pathname);
    }
  }
  console.log(category, found + '/' + rows.length, 'physical assets found');
}
console.log('Total:', total - missing + '/' + total, 'mapped audio assets present.');
if (missing && strict) process.exitCode = 1;

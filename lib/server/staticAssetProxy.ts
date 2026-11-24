import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

export const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main';
export const DISK_CACHE_DIR = '/tmp/kaliyuga_static_cache';

const MIME_MAP: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.fbx': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
};

// Clean ASCII filename -> upstream GitHub repository path mapping (Zero Mac Unicode ellipsis required in app code)
export const CLEAN_ASCII_REPO_MAP: Record<string, string[]> = {
  'Animate_battlefield_environment_56896e20.mp4': [
    'public',
    'videos',
    'Animate_battlefield_environment_…_56896e20.mp4',
  ],
  'Animate_mythological_game_enviro_743206b7_1080p.mp4': [
    'public',
    'videos',
    'Animate_mythological_game_enviro…_743206b7_1080p.mp4',
  ],
  'Animate_mythological_game_enviro_db8affc3_1080p.mp4': [
    'public',
    'videos',
    'Animate_mythological_game_enviro…_db8affc3_1080p.mp4',
  ],
  'Animate_mythological_game_enviro_f7acefd6_1080p.mp4': [
    'public',
    'videos',
    'Animate_mythological_game_enviro…_f7acefd6_1080p.mp4',
  ],
  'Flames_flickering_around_stone_f_09be2052.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Flames_flickering_around_stone_f…_09be2052.mp4',
  ],
  'Rudra_looking_up_cosmic_manifest_efb48503.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Rudra_looking_up_cosmic_manifest…_efb48503.mp4',
  ],
  'Ash_drifting_across_river_landscape_2b693e5d.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Ash_drifting_across_river_landscape_2b693e5d.mp4',
  ],
  'Flames_burn_on_funeral_pyres_5bef99be.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Flames_burn_on_funeral_pyres_5bef99be.mp4',
  ],
  'Furnaces_spewing_flames_and_slag_baeefd93_1080p.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Furnaces_spewing_flames_and_slag_baeefd93_1080p.mp4',
  ],
  'Camera_tilts_upward_into_space_f5f45c0e.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Camera_tilts_upward_into_space_f5f45c0e.mp4',
  ],
  'Clouds_parting_revealing_starry_sky_33ab1a1f.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Clouds_parting_revealing_starry_sky_33ab1a1f.mp4',
  ],
  'Rudra_looking_at_burning_fortress_43f2ce2a.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Rudra_looking_at_burning_fortress_43f2ce2a.mp4',
  ],
  'Rudra_standing_amidst_fire_and_ab5340a1.mp4': [
    'new 3D assets and animations',
    'Cutscenes & Audio',
    'Rudra_standing_amidst_fire_and_ab5340a1.mp4',
  ],
  'Gemini_Generated_Image_ol56bvol56bvol56.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_ol56bvol56bvol56.png',
  ],
  'Gemini_Generated_Image_i2qg8yi2qg8yi2qg.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_i2qg8yi2qg8yi2qg.png',
  ],
  'Gemini_Generated_Image_bc2kjfbc2kjfbc2k.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_bc2kjfbc2kjfbc2k.png',
  ],
  'Gemini_Generated_Image_3ay6rk3ay6rk3ay6.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_3ay6rk3ay6rk3ay6.png',
  ],
  'Gemini_Generated_Image_d647kwd647kwd647.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_d647kwd647kwd647.png',
  ],
  'Gemini_Generated_Image_sqvx4fsqvx4fsqvx.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_sqvx4fsqvx4fsqvx.png',
  ],
  'Gemini_Generated_Image_cvl1pecvl1pecvl1.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_cvl1pecvl1pecvl1.png',
  ],
  'Gemini_Generated_Image_jjxeuujjxeuujjxe.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_jjxeuujjxeuujjxe.png',
  ],
  'Gemini_Generated_Image_kogf7ykogf7ykogf.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_kogf7ykogf7ykogf.png',
  ],
  'Gemini_Generated_Image_us4plhus4plhus4p.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_us4plhus4plhus4p.png',
  ],
  'Gemini_Generated_Image_3yg7bx3yg7bx3yg7.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_3yg7bx3yg7bx3yg7.png',
  ],
  'Gemini_Generated_Image_ho5a8gho5a8gho5a.png': [
    'new 3D assets and animations',
    'Concept Art & Visuals',
    'Gemini_Generated_Image_ho5a8gho5a8gho5a.png',
  ],
  'slash_fast.wav': ['audio and sound effects', 'A_fast,_razor-sharp__#1-1794769601378.wav'],
  'axe_heavy_swing.wav': ['audio and sound effects', 'A_heavy_two-handed_a_#1-1794769519577.wav'],
  'axe_enormous_swing.wav': ['audio and sound effects', 'An_enormous_two-hand_#2-1794769945235.wav'],
  'heavy_iron_swing.wav': ['audio and sound effects', 'A_heavy_ancient_iron_#3-1794769797370.wav'],
  'weapon_smash.wav': ['audio and sound effects', 'A_gigantic_weapon_sm_#1-1794770098676.wav'],
  'heavy_iron_hit.wav': ['audio and sound effects', 'A_heavy_iron_weapon__#2-1794769895245.wav'],
  'weapon_clash.wav': ['audio and sound effects', 'Two_massive_ancient__#1-1794770691364.wav'],
  'bronze_armor_hit.wav': ['audio and sound effects', 'A_gigantic_bronze-ar_#1-1794770272664.wav'],
  'ancient_iron_block.wav': ['audio and sound effects', 'An_ancient_heavy_iro_#1-1794770655710.wav'],
  'parry_perfect.wav': ['audio and sound effects', 'A_perfectly_timed_an_#1-1794769994287.wav'],
  'defensive_block.wav': ['audio and sound effects', 'A_powerful_defensive_#1-1794770068379.wav'],
  'lightning_strike.wav': ['audio and sound effects', 'A_divine_lightning_s_#3-1794770183613.wav'],
  'wind_breathing.wav': ['audio and sound effects', 'A_supernatural_wind__#2-1794770216163.wav'],
  'fire_sun_breathing.wav': ['audio and sound effects', 'A_supernatural_ancie_#3-1794770149018.wav'],
  'water_elemental.wav': ['audio and sound effects', 'A_divine_elemental_p_#2-1794770772532.wav'],
  'supernatural_burst.wav': ['audio and sound effects', 'A_massive_supernatur_#2-1794770019827.wav'],
  'dash_fast.wav': ['audio and sound effects', 'An_extremely_fast_wa_#1-1794769971531.wav'],
  'war_drum.wav': ['audio and sound effects', 'A_massive_warrior_dr_#3-1794770397260.wav'],
  'sacred_bell.wav': ['audio and sound effects', 'An_ancient_sacred_In_#1-1794770471381.wav'],
  'boon_chime.wav': ['audio and sound effects', 'A_short_premium_fant_#2-1794770842624.wav'],
  'vrikodara_vacuum.wav': ['audio and sound effects', 'An_enormous_starving_#2-1794770329589.wav'],
  'monster_roar.wav': ['audio and sound effects', 'A_monstrous_mytholog_#1-1794770434182.wav'],
  'boss_roar_deep.wav': ['audio and sound effects', 'A_terrifying_ancient_#3-1794770620938.wav'],
  'footstep_warrior.wav': ['audio and sound effects', 'Heavy_warrior_footst_#1-1794769687731.wav'],
  'footstep_rapid.wav': ['audio and sound effects', 'Rapid_heavy_warrior__#1-1794769738799.wav'],
  'footstep_boss.wav': ['audio and sound effects', 'Heavy_footsteps_of_a_#1-1794770367594.wav'],
  'dundubhi_boss_theme.mp3': ['audio and sound effects', 'Dundubhi — The Living War Drum.mp3'],
  'vrikodara_boss_theme.mp3': ['audio and sound effects', 'Vrikodara — The Insatiable.mp3'],
  'vaitarani_realm.mp3': ['audio and sound effects', 'Vaitarani — The Forgotten Realm.mp3'],
  'the_bleeding_crown.mp3': ['audio and sound effects', 'The Bleeding Crown.mp3'],
};

// Bounded 256 MB in-memory LRU buffer cache + single /tmp/kaliyuga_static_cache disk store
const MAX_CACHE_BYTES = 256 * 1024 * 1024;
const MAX_MEMORY_ENTRY_BYTES = 45 * 1024 * 1024;
let currentCacheBytes = 0;
const memoryCache = new Map<string, Buffer>();
const inflightFetches = new Map<string, Promise<Buffer | null>>();

function getDiskCachePath(cacheKey: string): string {
  const hash = crypto.createHash('sha1').update(cacheKey).digest('hex');
  return path.join(DISK_CACHE_DIR, `${hash}.bin`);
}

function putInCache(key: string, buf: Buffer): void {
  try {
    if (!fs.existsSync(DISK_CACHE_DIR)) {
      fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
    }
    const diskPath = getDiskCachePath(key);
    if (!fs.existsSync(diskPath)) {
      fs.writeFileSync(diskPath, buf);
    }
  } catch {
    // Ignore disk cache write failures
  }

  if (buf.byteLength > MAX_MEMORY_ENTRY_BYTES) {
    return;
  }
  if (memoryCache.has(key)) {
    const prev = memoryCache.get(key)!;
    currentCacheBytes -= prev.byteLength;
    memoryCache.delete(key);
  }
  while (currentCacheBytes + buf.byteLength > MAX_CACHE_BYTES && memoryCache.size > 0) {
    const oldestKey = memoryCache.keys().next().value;
    if (!oldestKey) break;
    const oldBuf = memoryCache.get(oldestKey)!;
    currentCacheBytes -= oldBuf.byteLength;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, buf);
  currentCacheBytes += buf.byteLength;
}

export function isBlockedRuntimeAsset(segments: string[]): boolean {
  const joined = segments.join('/');
  const lower = joined.toLowerCase();
  if (joined.includes('..')) return true;
  if (lower.endsWith('.zip') || lower.endsWith('.stl')) return true;
  if (/\(\d+\)\.(png|jpg|jpeg|mp4)$/i.test(joined)) return true;
  if (lower.includes('4ai5dh')) return true;
  return false;
}

export function buildCandidateRepoPaths(decoded: string[]): string[][] {
  const candidates: string[][] = [];
  const top = decoded[0];
  const lastSeg = decoded[decoded.length - 1] || '';

  if (CLEAN_ASCII_REPO_MAP[lastSeg]) {
    candidates.push(CLEAN_ASCII_REPO_MAP[lastSeg]);
  }

  if (top === 'arenas') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'arenas', ...rest]);
    candidates.push(['new 3D assets and animations', 'Concept Art & Visuals', ...rest]);
    candidates.push(['new 3D assets and animations', 'Cutscenes & Audio', ...rest]);
    candidates.push(['public', 'assets', 'aistudio', ...rest]);
    candidates.push(['public', 'videos', ...rest]);
  } else if (top === 'vfx') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'vfx', ...rest]);
    candidates.push(['new 3D assets and animations', 'Concept Art & Visuals', ...rest]);
    candidates.push(['public', 'assets', 'vfx', ...rest]);
    candidates.push(['public', 'assets', 'aistudio', ...rest]);
    candidates.push(['public', 'assets', 'concepts', ...rest]);
  } else if (top === 'models_v2') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'models_v2', ...rest]);
    candidates.push(['new 3D assets and animations', '3D Models', ...rest]);
    candidates.push(['new 3D assets and animations', 'Animations', ...rest]);
    candidates.push(['public', 'models', ...rest]);
  } else if (top === 'videos') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'videos', ...rest]);
    candidates.push(['new 3D assets and animations', 'Cutscenes & Audio', ...rest]);
  } else if (top === 'assets') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'assets', ...rest]);
    candidates.push(['public', 'assets', 'aistudio', lastSeg]);
    candidates.push(['public', 'assets', 'vfx', lastSeg]);
    candidates.push(['public', 'assets', 'concepts', lastSeg]);
    candidates.push(['public', 'audio', lastSeg]);
    candidates.push(['soundtracks', lastSeg]);
  } else if (top === 'audio') {
    const rest = decoded.slice(1);
    candidates.push(['public', 'audio', ...rest]);
    candidates.push(['public', 'kaalyuga', 'audio', lastSeg]);
    candidates.push(['audio and sound effects', lastSeg]);
    candidates.push(['soundtracks', ...rest]);
    candidates.push(['new 3D assets and animations', 'Cutscenes & Audio', ...rest]);
  } else if (top === 'new_3d_assets') {
    candidates.push(['new 3D assets and animations', ...decoded.slice(1)]);
  } else {
    candidates.push(['public', ...decoded]);
  }

  // Ellipsis & normalized stem fallbacks
  const expanded: string[][] = [];
  const seen = new Set<string>();
  const pushUnique = (parts: string[]) => {
    const key = parts.join('/');
    if (!seen.has(key)) {
      seen.add(key);
      expanded.push(parts);
    }
  };

  for (const cand of candidates) {
    pushUnique(cand);
    const last = cand[cand.length - 1];
    if (!last) continue;
    if (last.includes('...') || last.includes('…')) {
      const alt = last.includes('...') ? last.replace(/\.\.\./g, '…') : last.replace(/…/g, '...');
      pushUnique([...cand.slice(0, -1), alt]);
    }
    if (last.includes('enviro_')) {
      pushUnique([...cand.slice(0, -1), last.replace('enviro_', 'enviro…_')]);
    }
    if (last.includes('environment_') && !last.includes('environment_…_')) {
      pushUnique([...cand.slice(0, -1), last.replace('environment_', 'environment_…_')]);
    }
    if (last.includes('stone_f_')) {
      pushUnique([...cand.slice(0, -1), last.replace('stone_f_', 'stone_f…_')]);
    }
    if (last.includes('manifest_')) {
      pushUnique([...cand.slice(0, -1), last.replace('manifest_', 'manifest…_')]);
    }
  }
  return expanded;
}

export async function resolveStaticAssetBuffer(segments: string[]): Promise<Buffer | null> {
  const decoded = segments
    .map((s) => {
      try {
        return decodeURIComponent(s);
      } catch {
        return s;
      }
    })
    .filter(Boolean);

  if (decoded.length === 0 || isBlockedRuntimeAsset(decoded)) {
    return null;
  }

  const candidatePaths = buildCandidateRepoPaths(decoded);
  const cacheKey = candidatePaths[0].join('/');

  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }

  // 1. Check workspace files (e.g., public/* if present locally) without synchronous git clones
  try {
    const cwd = process.cwd();
    for (const relParts of candidatePaths) {
      const localPath = path.join(cwd, ...relParts);
      if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
        const localBuf = await fsp.readFile(localPath);
        if (localBuf.byteLength > 0) {
          if (localBuf.byteLength <= MAX_MEMORY_ENTRY_BYTES) {
            memoryCache.set(cacheKey, localBuf);
          }
          return localBuf;
        }
      }
    }

    // 2. Check unified persistent disk cache (/tmp/kaliyuga_static_cache)
    const diskPath = getDiskCachePath(cacheKey);
    if (fs.existsSync(diskPath)) {
      const diskBuf = await fsp.readFile(diskPath);
      if (diskBuf.byteLength > 0) {
        putInCache(cacheKey, diskBuf);
        return diskBuf;
      }
    }
  } catch {
    // Fall through to remote fetch
  }

  if (inflightFetches.has(cacheKey)) {
    return inflightFetches.get(cacheKey)!;
  }

  const task = (async (): Promise<Buffer | null> => {
    const tryFetch = async (relParts: string[]): Promise<Buffer | null> => {
      const encodedPath = relParts.map((s) => encodeURIComponent(s)).join('/');
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${GITHUB_RAW_BASE}/${encodedPath}`);
          if (!res.ok) return null;
          const ab = await res.arrayBuffer();
          return Buffer.from(ab);
        } catch {
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }
      return null;
    };

    let buf: Buffer | null = null;
    for (const relParts of candidatePaths) {
      buf = await tryFetch(relParts);
      if (buf) break;
    }

    if (buf) {
      putInCache(cacheKey, buf);
    }
    return buf;
  })();

  inflightFetches.set(cacheKey, task);
  try {
    return await task;
  } finally {
    inflightFetches.delete(cacheKey);
  }
}

export async function serveStaticAssetFromProxy(
  req: NextRequest,
  segments: string[],
  isHead = false
): Promise<NextResponse> {
  if (!segments || segments.length === 0) {
    return new NextResponse(isHead ? null : 'Bad request', { status: 400 });
  }

  const buffer = await resolveStaticAssetBuffer(segments);
  if (!buffer) {
    return new NextResponse(isHead ? null : 'Asset not found', { status: 404 });
  }

  const fileSize = buffer.byteLength;
  const lastSegment = segments[segments.length - 1] || '';
  const ext = path.extname(lastSegment).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  if (isHead) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  const range = req.headers.get('range');
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start >= fileSize || end >= fileSize || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: {
          'Content-Range': `bytes */${fileSize}`,
        },
      });
    }

    const chunk = buffer.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunk.byteLength),
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(fileSize),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main';
const LOCAL_REPO_DIR = '/tmp/kaalyuga';
const DISK_CACHE_DIR = '/tmp/kaliyuga_static_cache';

try {
  if (!fs.existsSync(DISK_CACHE_DIR)) {
    fs.mkdirSync(DISK_CACHE_DIR, { recursive: true });
  }
} catch {}

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
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
};

// Bounded 256 MB in-memory LRU buffer cache + /tmp tmpfs persistent cache
const MAX_CACHE_BYTES = 256 * 1024 * 1024;
let currentCacheBytes = 0;
const memoryCache = new Map<string, Buffer>();
const inflightFetches = new Map<string, Promise<Buffer | null>>();

function getDiskCachePath(cacheKey: string): string {
  const hash = crypto.createHash('sha1').update(cacheKey).digest('hex');
  return path.join(DISK_CACHE_DIR, `${hash}.bin`);
}

function putInCache(key: string, buf: Buffer): void {
  try {
    const diskPath = getDiskCachePath(key);
    if (!fs.existsSync(diskPath)) {
      fs.writeFileSync(diskPath, buf);
    }
  } catch {}

  if (buf.byteLength > 45 * 1024 * 1024) {
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

// Clean ASCII filename -> upstream GitHub repository path mapping (Zero Mac Unicode ellipsis required in app code)
const CLEAN_ASCII_REPO_MAP: Record<string, string[]> = {
  // Clean ASCII MP4 Videos (renamed from Mac Unicode ellipsis … and Cutscenes & Audio folder)
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
  // Clean Arena & Gate PNGs from new 3D assets and animations/Concept Art & Visuals
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
  // Phase 2 Hand-Painted #000000 VFX & Isometric Telegraph Flipbook Sheets
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
};

function isBlockedRuntimeAsset(segments: string[]): boolean {
  const joined = segments.join('/');
  const lower = joined.toLowerCase();
  if (lower.endsWith('.zip') || lower.endsWith('.stl')) return true;
  if (/\(\d+\)\.(png|jpg|jpeg|mp4)$/i.test(joined)) return true;
  if (lower.includes('4ai5dh')) return true;
  return false;
}

function buildCandidateRepoPaths(decoded: string[]): string[][] {
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
  } else if (top === 'new_3d_assets') {
    candidates.push(['new 3D assets and animations', ...decoded.slice(1)]);
  } else {
    candidates.push(['public', ...decoded]);
  }

  // Also add ellipsis fallbacks for any candidate whose filename was ASCII-normalized
  const expanded: string[][] = [];
  for (const cand of candidates) {
    expanded.push(cand);
    const last = cand[cand.length - 1];
    if (!last) continue;
    if (last.includes('...') || last.includes('…')) {
      const alt = last.includes('...') ? last.replace(/\.\.\./g, '…') : last.replace(/…/g, '...');
      expanded.push([...cand.slice(0, -1), alt]);
    }
    if (last.includes('enviro_')) {
      expanded.push([...cand.slice(0, -1), last.replace('enviro_', 'enviro…_')]);
    }
    if (last.includes('environment_') && !last.includes('environment_…_')) {
      expanded.push([...cand.slice(0, -1), last.replace('environment_', 'environment_…_')]);
    }
    if (last.includes('stone_f_')) {
      expanded.push([...cand.slice(0, -1), last.replace('stone_f_', 'stone_f…_')]);
    }
    if (last.includes('manifest_')) {
      expanded.push([...cand.slice(0, -1), last.replace('manifest_', 'manifest…_')]);
    }
  }
  return expanded;
}

async function fetchFromGitHub(segments: string[]): Promise<Buffer | null> {
  const decoded = segments.map((s) => {
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  });

  if (isBlockedRuntimeAsset(decoded)) {
    return null;
  }

  const candidatePaths = buildCandidateRepoPaths(decoded);
  const cacheKey = candidatePaths[0].join('/');
  if (memoryCache.has(cacheKey)) {
    return memoryCache.get(cacheKey)!;
  }
  try {
    const roots = [LOCAL_REPO_DIR, '/tmp/kaalyuga_repo', process.cwd()];
    for (const rootDir of roots) {
      for (const relParts of candidatePaths) {
        const localPath = path.join(rootDir, ...relParts);
        if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
          const localBuf = fs.readFileSync(localPath);
          if (localBuf.byteLength > 0) {
            if (localBuf.byteLength <= 45 * 1024 * 1024) {
              memoryCache.set(cacheKey, localBuf);
            }
            return localBuf;
          }
        }
      }
    }

    const diskPath = getDiskCachePath(cacheKey);
    if (fs.existsSync(diskPath)) {
      const diskBuf = fs.readFileSync(diskPath);
      if (diskBuf.byteLength > 0) {
        putInCache(cacheKey, diskBuf);
        return diskBuf;
      }
    }
  } catch {}

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

export async function HEAD(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return new NextResponse(null, { status: 400 });
  }
  const buffer = await fetchFromGitHub(segments);
  if (!buffer) {
    return new NextResponse(null, { status: 404 });
  }
  const lastSegment = segments[segments.length - 1] || '';
  const ext = path.extname(lastSegment).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Content-Length': String(buffer.byteLength),
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await context.params;
  if (!segments || segments.length === 0) {
    return new NextResponse('Bad request', { status: 400 });
  }

  const buffer = await fetchFromGitHub(segments);
  if (!buffer) {
    return new NextResponse('Asset not found', { status: 404 });
  }

  const fileSize = buffer.byteLength;
  const lastSegment = segments[segments.length - 1] || '';
  const ext = path.extname(lastSegment).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';
  const range = req.headers.get('range');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (isNaN(start) || isNaN(end) || start >= fileSize || end >= fileSize) {
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

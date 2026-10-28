import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const REPO_RAW_BASE = 'https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/assets/aistudio';
const LOCAL_REPO_DIR = '/tmp/kaalyuga/public/assets/aistudio';
const CACHE_DIR = '/tmp/kaalyuga_cache/assets/aistudio';

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.svg') return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const relPath = slug.map((s) => path.basename(s)).join('/');
    if (!relPath) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const mimeType = getMimeType(relPath);
    const headers = {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    };

    // 1. Check local cloned repo in /tmp/kaalyuga
    const localRepoFile = path.join(LOCAL_REPO_DIR, relPath);
    if (existsSync(localRepoFile)) {
      const buf = await fs.readFile(localRepoFile);
      return new NextResponse(new Uint8Array(buf), { status: 200, headers });
    }

    // 2. Check /tmp cache
    const cacheFile = path.join(CACHE_DIR, relPath);
    if (existsSync(cacheFile)) {
      const buf = await fs.readFile(cacheFile);
      return new NextResponse(new Uint8Array(buf), { status: 200, headers });
    }

    // 3. Fetch from GitHub raw CDN and cache in /tmp
    const remoteUrl = `${REPO_RAW_BASE}/${encodeURIComponent(relPath).replace(/%2F/g, '/')}`;
    const res = await fetch(remoteUrl);
    if (!res.ok) {
      return new NextResponse(`Asset not found: ${relPath}`, { status: res.status });
    }
    const arrayBuffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);

    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, uint8);
    } catch {
      // Ignore cache write errors
    }

    return new NextResponse(uint8, { status: 200, headers });
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Asset load error',
      { status: 500 }
    );
  }
}

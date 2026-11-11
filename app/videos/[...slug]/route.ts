import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CACHE_DIR = '/tmp/kaalyuga_cache/videos';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await context.params;
    const relPath = slug.map((s) => path.basename(s)).join('/');
    if (!relPath) {
      return new NextResponse('Not Found', { status: 404 });
    }

    const baseHeaders: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
    };

    const respondWithBuffer = (buf: Buffer) => {
      const range = req.headers.get('range');
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : buf.length - 1;
        if (!Number.isNaN(start) && start >= 0 && end < buf.length && start <= end) {
          const chunk = buf.subarray(start, end + 1);
          return new NextResponse(new Uint8Array(chunk), {
            status: 206,
            headers: {
              ...baseHeaders,
              'Content-Range': `bytes ${start}-${end}/${buf.length}`,
              'Content-Length': String(chunk.length),
            },
          });
        }
      }
      return new NextResponse(new Uint8Array(buf), {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Length': String(buf.length),
        },
      });
    };

    const publicVideosDir = path.join(process.cwd(), 'public', 'videos');
    const publicCutscenesDir = path.join(process.cwd(), 'public', 'cutscenes');

    const candidates = [
      path.join(publicVideosDir, relPath),
      path.join(publicCutscenesDir, relPath),
      path.join(CACHE_DIR, relPath),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return respondWithBuffer(buf);
      }
    }

    // Fuzzy match by 8-char hex hash or normalized name
    const hashMatch = relPath.match(/([a-f0-9]{8})/i);
    const searchDirs = [publicVideosDir, publicCutscenesDir];
    if (hashMatch) {
      const targetHash = hashMatch[1].toLowerCase();
      for (const dir of searchDirs) {
        if (existsSync(dir)) {
          const dirFiles = await fs.readdir(dir);
          const matchedFile = dirFiles.find((f) => f.toLowerCase().includes(targetHash) && f.endsWith('.mp4'));
          if (matchedFile) {
            const buf = await fs.readFile(path.join(dir, matchedFile));
            return respondWithBuffer(buf);
          }
        }
      }
    }

    const encodedRel = encodeURIComponent(relPath).replace(/%2F/g, '/');
    const remoteUrls = [
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/videos/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/videos/${encodedRel}`,
    ];

    let res: Response | null = null;
    for (const url of remoteUrls) {
      const attempt = await fetch(url);
      if (attempt.ok) {
        res = attempt;
        break;
      }
    }

    if (!res || !res.ok) {
      return new NextResponse(`Video not found: ${relPath}`, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const cacheFile = path.join(CACHE_DIR, relPath);
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, buf);
    } catch {
      // Ignore cache write errors
    }

    return respondWithBuffer(buf);
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Video load error',
      { status: 500 }
    );
  }
}

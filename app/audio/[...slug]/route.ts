import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const CACHE_BASE = ['', 'tmp', 'kaalyuga_cache'].join('/');
const PUBLIC_AUDIO_DIR = [process.cwd(), 'public', 'audio'].join('/');
const PUBLIC_KAALYUGA_AUDIO_DIR = [process.cwd(), 'public', 'kaalyuga', 'audio'].join('/');

// Clean ASCII route mapping -> exact files in upstream `audio and sound effects/` folder
const REPO_AUDIO_MAP: Record<string, string> = {
  'slash_fast.wav': 'A_fast,_razor-sharp__#1-1794769601378.wav',
  'axe_heavy_swing.wav': 'A_heavy_two-handed_a_#1-1794769519577.wav',
  'axe_enormous_swing.wav': 'An_enormous_two-hand_#2-1794769945235.wav',
  'heavy_iron_swing.wav': 'A_heavy_ancient_iron_#3-1794769797370.wav',
  'weapon_smash.wav': 'A_gigantic_weapon_sm_#1-1794770098676.wav',
  'heavy_iron_hit.wav': 'A_heavy_iron_weapon__#2-1794769895245.wav',
  'weapon_clash.wav': 'Two_massive_ancient__#1-1794770691364.wav',
  'bronze_armor_hit.wav': 'A_gigantic_bronze-ar_#1-1794770272664.wav',
  'ancient_iron_block.wav': 'An_ancient_heavy_iro_#1-1794770655710.wav',
  'parry_perfect.wav': 'A_perfectly_timed_an_#1-1794769994287.wav',
  'defensive_block.wav': 'A_powerful_defensive_#1-1794770068379.wav',
  'lightning_strike.wav': 'A_divine_lightning_s_#3-1794770183613.wav',
  'wind_breathing.wav': 'A_supernatural_wind__#2-1794770216163.wav',
  'fire_sun_breathing.wav': 'A_supernatural_ancie_#3-1794770149018.wav',
  'water_elemental.wav': 'A_divine_elemental_p_#2-1794770772532.wav',
  'supernatural_burst.wav': 'A_massive_supernatur_#2-1794770019827.wav',
  'dash_fast.wav': 'An_extremely_fast_wa_#1-1794769971531.wav',
  'war_drum.wav': 'A_massive_warrior_dr_#3-1794770397260.wav',
  'sacred_bell.wav': 'An_ancient_sacred_In_#1-1794770471381.wav',
  'boon_chime.wav': 'A_short_premium_fant_#2-1794770842624.wav',
  'vrikodara_vacuum.wav': 'An_enormous_starving_#2-1794770329589.wav',
  'monster_roar.wav': 'A_monstrous_mytholog_#1-1794770434182.wav',
  'boss_roar_deep.wav': 'A_terrifying_ancient_#3-1794770620938.wav',
  'footstep_warrior.wav': 'Heavy_warrior_footst_#1-1794769687731.wav',
  'footstep_rapid.wav': 'Rapid_heavy_warrior__#1-1794769738799.wav',
  'footstep_boss.wav': 'Heavy_footsteps_of_a_#1-1794770367594.wav',
  'dundubhi_boss_theme.mp3': 'Dundubhi — The Living War Drum.mp3',
  'vrikodara_boss_theme.mp3': 'Vrikodara — The Insatiable.mp3',
  'vaitarani_realm.mp3': 'Vaitarani — The Forgotten Realm.mp3',
  'the_bleeding_crown.mp3': 'The Bleeding Crown.mp3',
};

function getAudioMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.wav') return 'audio/wav';
  if (ext === '.ogg') return 'audio/ogg';
  return 'application/octet-stream';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  try {
    const { slug } = await params;
    const relPath = slug.map((s) => path.basename(s)).join('/');
    if (!relPath) {
      return new NextResponse('Not Found', { status: 404 });
    }
    const baseName = path.basename(relPath);
    const repoMappedFile = slug[0] === 'repo' ? REPO_AUDIO_MAP[baseName] : undefined;
    const mimeType = getAudioMimeType(repoMappedFile || relPath);

    const baseHeaders: Record<string, string> = {
      'Content-Type': mimeType,
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

    const candidates = [
      [PUBLIC_AUDIO_DIR, relPath].join('/'),
      [PUBLIC_KAALYUGA_AUDIO_DIR, baseName].join('/'),
      [CACHE_BASE, 'audio', relPath].join('/'),
      [CACHE_BASE, 'sfx', baseName].join('/'),
      [CACHE_BASE, 'soundtracks', baseName].join('/'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        const buf = await fs.readFile(candidate);
        return respondWithBuffer(buf);
      }
    }

    const encodedRel = encodeURIComponent(relPath).replace(/%2F/g, '/');
    const encodedBase = encodeURIComponent(baseName);
    const remoteUrls: string[] = [];
    if (repoMappedFile) {
      remoteUrls.push(
        `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/${encodeURIComponent('audio and sound effects')}/${encodeURIComponent(repoMappedFile)}`
      );
    }
    remoteUrls.push(
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/public/audio/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/${encodedRel}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/${encodeURIComponent('audio and sound effects')}/${encodedBase}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/sfx/${encodedBase}`,
      `https://raw.githubusercontent.com/akshat92008/kaalyuga/main/soundtracks/${encodedBase}`
    );

    let res: Response | null = null;
    for (const url of remoteUrls) {
      const attempt = await fetch(url);
      if (attempt.ok) {
        res = attempt;
        break;
      }
    }

    if (!res || !res.ok) {
      return new NextResponse(`Audio not found: ${relPath}`, { status: 404 });
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const cacheFile = [CACHE_BASE, 'audio', relPath].join('/');
    try {
      await fs.mkdir(path.dirname(cacheFile), { recursive: true });
      await fs.writeFile(cacheFile, buf);
    } catch {
      // Ignore cache write errors
    }

    return respondWithBuffer(buf);
  } catch (err) {
    return new NextResponse(
      err instanceof Error ? err.message : 'Audio load error',
      { status: 500 }
    );
  }
}

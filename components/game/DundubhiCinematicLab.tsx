'use client';

/**
 * Standalone proof-of-concept cinematic using the EXISTING Dundubhi FBX rig,
 * Boss3DRenderer's animation mixer, the ACT I MP4 arena and repository audio.
 *
 * Intentionally isolated from KaliyugaArena. No combat state, save data or
 * main-game progression is modified. Visit /cinematic-lab to inspect.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GAME_ASSETS } from '@/lib/game/assets';
import { Boss3DRenderer, type Boss3DUpdateParams } from '@/lib/game/boss3dRenderer';
import { CinematicCameraTrack, sampleCinematicImpactImpulse, boundCinematicCameraToPaintedVideo } from '@/lib/game/cinematicCamera';

const DURATION_SEC = 8.6;
const W = 960;
const H = 540;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}
function smoothstep(a: number, b: number, t: number): number {
  const n = clamp((t - a) / Math.max(0.0001, b - a));
  return n * n * (3 - 2 * n);
}
function drawVignette(ctx: CanvasRenderingContext2D, t: number) {
  const gradient = ctx.createRadialGradient(480, 260, 90, 480, 265, 610);
  gradient.addColorStop(0, 'rgba(5, 3, 5, 0)');
  gradient.addColorStop(1, 'rgba(5, 3, 5, 0.84)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(7, 5, 6, 0.92)';
  ctx.fillRect(0, 0, W, 36);
  ctx.fillRect(0, H - 40, W, 40);

  const darkFade = 1 - smoothstep(0.2, 1.65, t);
  if (darkFade > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, ' + (darkFade * 0.7) + ')';
    ctx.fillRect(0, 36, W, H - 76);
  }
}
function drawCinematicText(ctx: CanvasRenderingContext2D, t: number) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 15;

  const opener = smoothstep(0.4, 1.2, t) * (1 - smoothstep(2.6, 3.4, t));
  if (opener > 0) {
    ctx.globalAlpha = opener;
    ctx.font = '16px Georgia, serif';
    ctx.fillStyle = '#eecb91';
    ctx.fillText('THE WAR-DRUM AWAKENS', 480, 95);
  }

  const reveal = smoothstep(5.9, 6.55, t);
  if (reveal > 0) {
    ctx.globalAlpha = reveal;
    ctx.fillStyle = '#fff2d9';
    ctx.font = 'bold 51px Georgia, serif';
    ctx.fillText('DUNDUBHI', 480, 419);
    ctx.fillStyle = '#e8af73';
    ctx.font = '17px Georgia, serif';
    ctx.fillText('THE WAR-DRUM BEHEMOTH', 480, 451);
  }
  ctx.restore();
}
function drawDust(ctx: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < 75; i++) {
    const x = (i * 127.13 + Math.sin(t * (0.34 + i % 3 * 0.17) + i) * 17) % W;
    const y = ((i * 75.23 - t * (10 + i % 6 * 3)) % H + H) % H;
    const opacity = 0.16 + ((i * 7) % 9) * 0.027;
    ctx.fillStyle = 'rgba(255, 144, 73, ' + opacity + ')';
    ctx.beginPath();
    ctx.arc(x, y, i % 7 === 0 ? 2 : 1, 0, Math.PI * 2);
    ctx.fill();
  }
}
/** A restrained contact shadow and amber bounce light ground the FBX feet in
 * the actual painted Mandapa rather than letting the sprite float over video. */
function drawBossGrounding(ctx: CanvasRenderingContext2D, t: number) {
  const emergence = smoothstep(0.9, 2.35, t);
  if (emergence <= 0) return;
  ctx.save();
  ctx.translate(480, 441);
  ctx.scale(1, 0.29);
  const shadow = ctx.createRadialGradient(0, 0, 9, 0, 0, 132);
  shadow.addColorStop(0, 'rgba(7, 3, 2, 0.72)');
  shadow.addColorStop(0.57, 'rgba(14, 5, 4, 0.45)');
  shadow.addColorStop(1, 'rgba(14, 5, 4, 0)');
  ctx.fillStyle = shadow;
  ctx.globalAlpha = emergence;
  ctx.fillRect(-145, -145, 290, 290);
  ctx.restore();

  // A small lantern-colored pool of reflected light, especially on the roar.
  const bounce = emergence * (0.10 + smoothstep(3.5, 5.3, t) * 0.10);
  const glow = ctx.createRadialGradient(480, 426, 14, 480, 426, 127);
  glow.addColorStop(0, 'rgba(241, 109, 37, ' + bounce.toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(241, 109, 37, 0)');
  ctx.save();
  ctx.fillStyle = glow;
  ctx.fillRect(348, 295, 264, 264);
  ctx.restore();
}

function drawShockwave(ctx: CanvasRenderingContext2D, t: number) {
  const pulse = smoothstep(5.13, 5.32, t) * (1 - smoothstep(5.32, 6.25, t));
  if (pulse <= 0) return;
  const spread = smoothstep(5.13, 6.1, t);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 156, 66, ' + (pulse * 0.75) + ')';
  ctx.lineWidth = 4 + 3 * pulse;
  ctx.beginPath();
  ctx.ellipse(480, 404, 70 + spread * 360, 18 + spread * 95, 0, 0, Math.PI * 2);
  ctx.stroke();
  const bloom = ctx.createRadialGradient(480, 370, 15, 480, 370, 380);
  bloom.addColorStop(0, 'rgba(255, 125, 51, ' + (pulse * 0.32) + ')');
  bloom.addColorStop(1, 'rgba(255, 125, 51, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function makeBossParams(t: number, dt: number): Boss3DUpdateParams {
  const roaring = t >= 3.45 && t < 6.0;
  const attacking = t >= 5.15 && t < 5.95;
  return {
    kind: 'dundubhi',
    dt: Math.min(0.04, Math.max(0.001, dt)),
    vx: 0,
    vy: 0,
    facing: -1,
    aimAngle: Math.PI * 0.06,
    aiState: attacking ? 'attack' : roaring ? 'windup' : 'idle',
    attackKind: 'shockwave',
    attackPattern: 4,
    windupProgress: clamp((t - 3.45) / 1.7),
    phase: 1,
    armorCracked: false,
    isPostureBroken: false,
    isHitFlash: false,
    bypassSoftwareThrottle: false,
  };
}

export default function DundubhiCinematicLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const arenaLayerRef = useRef<HTMLDivElement>(null);
  const bossRef = useRef<Boss3DRenderer | null>(null);
  const portraitRef = useRef<HTMLImageElement | null>(null);
  const playingRef = useRef(false);
  const cameraTrackRef = useRef<CinematicCameraTrack | null>(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const firedRef = useRef<Record<string, boolean>>({});
  const mutedRef = useRef(false);
  const modelReadyRef = useRef(false);
  const [modelStatus, setModelStatus] = useState('Loading Kaliyuga Dundubhi FBX...');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const playCue = useCallback((key: string) => {
    if (mutedRef.current || firedRef.current[key]) return;
    firedRef.current[key] = true;
    const sound = audioRef.current[key];
    if (!sound) return;
    try {
      sound.currentTime = 0;
      sound.volume = key === 'roar' ? 0.7 : 0.62;
      void sound.play().catch(() => undefined);
    } catch {
      // Audio may be blocked by browser autoplay policy; preview stays playable.
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let rafId = 0;
    let lastRender = 0;
    let lastBossRender = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      setModelStatus('Canvas 2D is unavailable in this browser.');
      return;
    }

    cameraTrackRef.current = new CinematicCameraTrack([
      { at: 1.4, focusX: 0.5, focusY: 0.62, zoom: 1.04 },
      { at: 3.3, focusX: 0.48, focusY: 0.59, zoom: 1.12 },
      { at: 4.9, focusX: 0.52, focusY: 0.61, zoom: 1.17 },
      { at: 5.6, focusX: 0.5, focusY: 0.62, zoom: 1.10 },
      { at: 7.1, focusX: 0.5, focusY: 0.65, zoom: 1.02 },
    ], DURATION_SEC);

    const image = new Image();
    image.src = GAME_ASSETS.portraits.dundubhi;
    portraitRef.current = image;

    const tracks: Record<string, string> = {
      drum: GAME_ASSETS.sfx.warDrum,
      roar: GAME_ASSETS.sfx.bossRoarDeep,
      smash: GAME_ASSETS.sfx.weaponSmash,
    };
    for (const [name, src] of Object.entries(tracks)) {
      const el = new Audio(src);
      el.preload = 'auto';
      audioRef.current[name] = el;
    }

    try {
      const boss = new Boss3DRenderer(512);
      bossRef.current = boss;
      void boss.waitForBossReady('dundubhi', 20000)
        .then((ready) => {
          if (disposed) return;
          modelReadyRef.current = ready;
          setModelStatus(
            ready
              ? 'Real Dundubhi FBX loaded · animated through the existing game renderer'
              : '3D asset unavailable · showing original game portrait fallback'
          );
        })
        .catch(() => {
          if (!disposed) setModelStatus('3D load failed · using original game portrait fallback');
        });
    } catch {
      setModelStatus('WebGL not available · using original game portrait fallback');
    }

    function loop(now: number) {
      if (disposed || !ctx) return;
      const delta = lastTimeRef.current
        ? Math.min((now - lastTimeRef.current) / 1000, 0.05)
        : 0.016;
      lastTimeRef.current = now;

      if (playingRef.current) {
        timeRef.current = Math.min(DURATION_SEC, timeRef.current + delta);
        if (timeRef.current >= 1.2) playCue('drum');
        if (timeRef.current >= 4.25) playCue('roar');
        if (timeRef.current >= 5.16) playCue('smash');
        if (timeRef.current >= DURATION_SEC) {
          playingRef.current = false;
          setIsPlaying(false);
        }
      }
      if (now - lastRender > 30) {
        lastRender = now;
        const t = timeRef.current;
        ctx.clearRect(0, 0, W, H);

        // The HTML video and static fallback poster sit behind this alpha canvas.
        const boss = bossRef.current;
        const opacity = smoothstep(0.9, 2.35, t);
        const cameraFrame = cameraTrackRef.current?.sample(t, W, H);
        const impact = sampleCinematicImpactImpulse(t, 5.18, W, H);
        // Clamp the composited pan AFTER adding impact shake, otherwise the
        // video can move outside the matte while the boss still looks correct.
        const safeShot = boundCinematicCameraToPaintedVideo({
          zoom: cameraFrame?.zoom ?? 1,
          offsetX: (cameraFrame?.offsetX ?? 0) + impact.x,
          offsetY: (cameraFrame?.offsetY ?? 0) + impact.y,
        }, W, H, 0.5, 305 / H);
        const zoom = safeShot.zoom;

        // The underlying painted MP4 and the animated boss MUST share the
        // same framing. Moving only the FBX sprite creates a cardboard-cutout
        // effect and breaks contact alignment with the arena.
        const arenaLayer = arenaLayerRef.current;
        if (arenaLayer) {
          arenaLayer.style.transformOrigin = '50% 56.4815%'; // x=480, y=305
          arenaLayer.style.transform =
            'translate(' + (safeShot.offsetX / W * 100).toFixed(4) +
            '%, ' + (safeShot.offsetY / H * 100).toFixed(4) +
            '%) scale(' + zoom.toFixed(5) + ')';
        }

        ctx.save();
        // Dolly around Dundubhi's upper torso instead of the floor line.
        // The old 435px pivot pushed his head above the matte at impact zoom.
        ctx.translate(W / 2 + safeShot.offsetX,
          305 + safeShot.offsetY);
        ctx.scale(zoom, zoom);
        ctx.translate(-W / 2, -305);
        ctx.globalAlpha = opacity;
        drawBossGrounding(ctx, t);
        if (boss && modelReadyRef.current) {
          if (now - lastBossRender > 32) {
            lastBossRender = now;
            try {
              boss.updateAndRender(makeBossParams(t, Math.max(0.015, delta)));
            } catch {
              modelReadyRef.current = false;
              setModelStatus('3D render failed · using original game portrait fallback');
            }
          }
          if (modelReadyRef.current && boss.canvas.width > 0) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            // Sharper 512px render, slightly enlarged on-screen instead of upscaling a 320px boss.
            ctx.drawImage(boss.canvas, 290, 75, 380, 385);
          }
        }
        if (!modelReadyRef.current && portraitRef.current?.complete &&
            (portraitRef.current.naturalWidth || 0) > 0) {
          ctx.drawImage(portraitRef.current, 330, 108, 300, 300);
        }
        // Shockwave is anchored to Dundubhi's feet and moves with the same
        // camera as the arena and animated body; screen overlays stay fixed.
        drawShockwave(ctx, t);
        ctx.restore();
        drawDust(ctx, t);
        drawVignette(ctx, t);
        drawCinematicText(ctx, t);
        setSeconds(Math.floor(t * 10) / 10);
      }
      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      playingRef.current = false;
      cameraTrackRef.current?.interrupt();
      cameraTrackRef.current = null;
      try { videoRef.current?.pause(); } catch { /* no-op */ }
      for (const audio of Object.values(audioRef.current)) {
        audio.pause();
        audio.src = '';
      }
      bossRef.current?.dispose();
      bossRef.current = null;
    };
  }, [playCue]);

  const start = () => {
    cameraTrackRef.current?.restart();
    timeRef.current = 0;
    firedRef.current = {};
    lastTimeRef.current = 0;
    playingRef.current = true;
    setIsPlaying(true);
    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = 0;
        void video.play().catch(() => undefined);
      } catch { /* static background remains available */ }
    }
  };

  const skip = () => {
    timeRef.current = DURATION_SEC;
    playingRef.current = false;
    cameraTrackRef.current?.skip();
    setIsPlaying(false);
    setSeconds(DURATION_SEC);
    videoRef.current?.pause();
    for (const audio of Object.values(audioRef.current)) audio.pause();
  };

  const toggleMute = () => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setIsMuted(next);
    if (next) {
      for (const audio of Object.values(audioRef.current)) audio.pause();
    }
  };

  return (
    <main className="min-h-screen overflow-y-auto bg-[#090706] px-4 py-6 text-[#f2e5ce] sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#ce9969]">
              Kaliyuga · Act I · Chamber IV
            </div>
            <h1 className="font-serif text-2xl font-bold sm:text-3xl">
              Dundubhi — Cinematic Lab
            </h1>
          </div>
          <a href="/" className="rounded-md border border-[#73503b] px-4 py-2 text-sm hover:bg-[#322219]">
            Back to game
          </a>
        </div>

        <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#563321] bg-[#110a0b] shadow-[0_18px_70px_rgba(0,0,0,0.75)]">
          <div
            ref={arenaLayerRef}
            data-testid="dundubhi-camera-arena-layer"
            className="pointer-events-none absolute inset-0"
            style={{ transformOrigin: '50% 56.4815%' }}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: 'url(' + GAME_ASSETS.chambers.dundubhiMandapa + ')' }}
            />
            <video
              ref={videoRef}
              src={GAME_ASSETS.arenaVideos.dundubhiMandapa}
              poster={GAME_ASSETS.chambers.dundubhiMandapa}
              className="absolute inset-0 h-full w-full object-cover"
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden="true"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-[#120703]/20 to-black/50" />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-label="Animated entrance preview using the existing Dundubhi boss renderer"
          />
          <div className="pointer-events-none absolute left-4 top-3 text-[10px] font-semibold uppercase tracking-[0.19em] text-[#f1bc82] sm:text-xs">
            Mandapa of the War-Drum
          </div>
          {!isPlaying && seconds === 0 && (
            <div className="pointer-events-none absolute bottom-5 left-1/2 w-[90%] -translate-x-1/2 text-center text-xs text-[#f5c797]">
              Press Play to preview the in-engine boss entrance
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            className="rounded-lg bg-[#a75e35] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c77b44]"
          >
            {isPlaying ? 'Restart cinematic' : seconds > 0 ? 'Replay cinematic' : 'Play cinematic'}
          </button>
          <button
            type="button"
            disabled={!isPlaying}
            onClick={skip}
            className="rounded-lg border border-[#674937] px-4 py-3 text-sm hover:bg-[#271b16] disabled:opacity-40"
          >
            Skip cinematic
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-lg border border-[#674937] px-4 py-3 text-sm hover:bg-[#271b16]"
          >
            {isMuted ? 'Sound off' : 'Sound on'}
          </button>
          <span className="ml-auto text-sm tabular-nums text-[#c8aa8d]">
            {seconds.toFixed(1)} / {DURATION_SEC.toFixed(1)} s
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#39251e]">
          <div
            className="h-full bg-[#c3834f] transition-[width] duration-75"
            style={{ width: Math.min(100, seconds / DURATION_SEC * 100) + '%' }}
          />
        </div>
        <p className="mt-4 text-sm text-[#dbb18b]" role="status">{modelStatus}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#ab9b90]">
          This route is an isolated cinematic proof of concept, not the finished boss encounter.
          It reuses the real Dundubhi character renderer, existing rig animations, the actual
          Chamber IV MP4 background and existing war-drum, roar and impact sounds.
          It does not change combat, boss AI, saves or the Act I progression.
        </p>
      </div>
    </main>
  );
}

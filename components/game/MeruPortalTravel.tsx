'use client';

/**
 * Lightweight, loading-gated Meru passage for Act I's painted/MP4 chambers.
 * This never opens a second video decoder or needs a second WebGL context.
 * The source chamber remains frozen until the destination poster is decoded;
 * the actual chamber switch happens once, behind the ink/portal veil.
 */
import { useEffect, useRef, useState } from 'react';
import {
  advancePortalTransition, beginPortalTransition,
  portalPalette, renderMeruPortal, type MeruPortalStyle,
  type PortalTransition,
} from '@/engine/meru/portalDirector';

export interface MeruPortalJourney {
  style: MeruPortalStyle;
  destination: string;
  label: string;
  sourcePoster: string;
  destinationPoster: string;
}

export interface MeruPortalTravelProps {
  journey: MeruPortalJourney;
  onCross: () => void;
  onFinish: () => void;
}

const MAX_POSTER_WAIT_MS = 7000;
const FRAME_W = 960;
const FRAME_H = 540;

export default function MeruPortalTravel({ journey, onCross, onFinish }: MeruPortalTravelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const skipRef = useRef<HTMLButtonElement | null>(null);
  const onCrossRef = useRef(onCross);
  const onFinishRef = useRef(onFinish);
  onCrossRef.current = onCross;
  onFinishRef.current = onFinish;
  const skippingRef = useRef(false);
  const [phase, setPhase] = useState<PortalTransition['state']>('opening');
  const [switched, setSwitched] = useState(false);
  const [fallbackPoster, setFallbackPoster] = useState(false);
  const colors = portalPalette(journey.style);

  useEffect(() => {
    let disposed = false;
    let switchedOnce = false;
    let finishedOnce = false;
    let ready = false;
    let rafId = 0;
    let lastNow = 0;
    let lastUi = 0;
    const transition = beginPortalTransition(journey.style, journey.destination, 1.8);
    let progress = transition;
    const poster = new Image();
    const markReady = (fallback = false) => {
      if (disposed) return;
      if (fallback) setFallbackPoster(true);
      ready = true;
    };
    poster.onload = () => markReady(poster.naturalWidth <= 0);
    poster.onerror = () => markReady(true);
    poster.src = journey.destinationPoster;
    if (poster.complete) markReady(poster.naturalWidth <= 0);
    const timeoutId = window.setTimeout(() => markReady(true), MAX_POSTER_WAIT_MS);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        skippingRef.current = true;
      }
      // Never buffer attacks, dodges, or interaction presses into the next room.
      if (event.key !== 'Tab' && event.key !== 'Shift') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    skipRef.current?.focus();

    const draw = (now: number) => {
      if (disposed || finishedOnce) return;
      const dt = lastNow ? Math.max(0, Math.min(0.25, (now - lastNow) / 1000)) : 0.016;
      lastNow = now;
      // A skip accelerates the travel animation, but may NEVER bypass loading.
      progress = advancePortalTransition(progress, skippingRef.current ? 0.25 : dt, ready);
      if (!switchedOnce && (progress.state === 'revealing' || progress.state === 'finished')) {
        switchedOnce = true;
        onCrossRef.current();
        setSwitched(true);
      }
      if (now - lastUi > 85) {
        lastUi = now;
        setPhase(progress.state);
      }
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, FRAME_W, FRAME_H);
        const t = progress.elapsed / progress.duration;
        const strength = progress.state === 'loading' ? 1.5 :
          progress.state === 'revealing' ? Math.max(0.3, (1 - t) * 2.8) :
          0.85 + Math.min(0.6, t * 1.3);
        renderMeruPortal(ctx, {
          kind: journey.style, x: FRAME_W / 2, y: FRAME_H * 0.62,
          size: Math.min(FRAME_W, FRAME_H) * (0.8 + t * 0.34),
          unlocked: true, timeMs: now, intensity: strength,
        });
        // Layered vertical energy slashes make movement through the painted
        // arch visible even when the MP4 is not decoded yet.
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const opening = Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.25)));
        for (let k = 0; k < 6; k++) {
          const x = FRAME_W * (0.36 + k * 0.055) +
            Math.sin(now * 0.0015 + k * 1.7) * (8 + 6 * opening);
          const grad = ctx.createLinearGradient(x, 35, x, FRAME_H);
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.55, colors.core);
          grad.addColorStop(1, 'transparent');
          ctx.globalAlpha = (0.04 + opening * 0.16) * (k % 2 ? 0.7 : 1);
          ctx.fillStyle = grad;
          ctx.fillRect(x - 2, 30, 4, FRAME_H - 55);
        }
        ctx.restore();
      }
      if (progress.state === 'finished') {
        finishedOnce = true;
        onFinishRef.current();
        return;
      }
      rafId = window.requestAnimationFrame(draw);
    };
    rafId = window.requestAnimationFrame(draw);
    return () => {
      disposed = true;
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown, true);
      poster.onload = null;
      poster.onerror = null;
    };
  }, [journey.destination, journey.destinationPoster, journey.style]);

  const phaseLabel = phase === 'loading' ? 'AWAITING SANCTUARY' :
    phase === 'revealing' ? 'THE VEIL PARTS' :
    phase === 'entering' ? 'CROSSING THE VEIL' : 'THE PASSAGE AWAKENS';

  return (
    <div
      role="dialog" aria-modal="true" aria-label={'Travel to ' + journey.label}
      data-testid="meru-portal-travel"
      data-meru-portal-state={phase}
      data-meru-portal-switched={switched ? 'yes' : 'no'}
      className="fixed inset-0 z-[95] overflow-hidden bg-[#050407] text-[#f6e7ce]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{ backgroundImage: 'url(' + journey.sourcePoster + ')', opacity: switched ? 0 : 0.65 }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ backgroundImage: 'url(' + journey.destinationPoster + ')', opacity: switched && !fallbackPoster ? 0.65 : 0 }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#050407]/95 via-[#10070c]/45 to-[#050407]/95"/>
      <canvas
        ref={canvasRef} width={FRAME_W} height={FRAME_H} aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-between px-5 py-10 sm:py-14">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.38em]" style={{ color: colors.core }}>MERU · THE PASSAGE BETWEEN WORLDS</div>
          <h2 className="mt-3 font-serif text-2xl sm:text-4xl tracking-[0.10em] drop-shadow-[0_4px_12px_#000]">{journey.label}</h2>
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <div role="status" className="font-serif text-sm tracking-[0.22em]" style={{ color: colors.spark }}>{phaseLabel}</div>
          <div className="h-0.5 w-36 overflow-hidden rounded bg-[#382929]" aria-hidden="true">
            <div className="h-full transition-all duration-100" style={{ width: phase === 'revealing' || phase === 'finished' ? '100%' : phase === 'loading' ? '62%' : '32%', backgroundColor: colors.core }} />
          </div>
          <button
            ref={skipRef}
            type="button"
            aria-label="Accelerate portal passage when ready"
            className="rounded-md border border-[#a7835b]/70 bg-black/70 px-5 py-2 text-xs tracking-[0.14em] hover:bg-[#291d1a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f4ce93]"
            onClick={() => { skippingRef.current = true; }}
          >{phase === 'loading' ? 'SKIP AFTER LOADING' : 'CONTINUE (ESC)'}</button>
        </div>
      </div>
    </div>
  );
}

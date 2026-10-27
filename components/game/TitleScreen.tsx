'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GAME_ASSETS } from '@/lib/game/assets';

interface TitleScreenProps {
  ashenKarma: number;
  onStartOdyssey: () => void;
  onOpenShrine: () => void;
  onOpenStory: () => void;
  onOpenAudit?: () => void;
}

interface EmberMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  phase: number;
  color: string;
  isPetal: boolean;
}

export default function TitleScreen({
  ashenKarma,
  onStartOdyssey,
  onOpenShrine,
  onOpenStory,
  onOpenAudit,
}: TitleScreenProps) {
  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backdropImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const palette = ['#ffd86b', '#ff9436', '#ff5e24', '#fff0b8', '#e3b55a'];
    const motes: EmberMote[] = Array.from({ length: 78 }, (_, idx) => ({
      x: Math.random() * (window.innerWidth || 1440),
      y: Math.random() * (window.innerHeight || 900),
      vx: 14 + Math.random() * 28,
      vy: -18 - Math.random() * 38,
      size: idx % 6 === 0 ? 3.2 + Math.random() * 2.4 : 1.2 + Math.random() * 2.2,
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      color: palette[idx % palette.length],
      isPetal: idx % 7 === 0,
    }));

    let last = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth || 1440;
      const h = window.innerHeight || 900;

      ctx.clearRect(0, 0, w, h);

      // Subtle breathing solar eclipse corona behind the Six-Armed Sovereign on the right third
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const pulse = 0.88 + Math.sin(now * 0.0022) * 0.12;
      const sx = w * 0.73;
      const sy = h * 0.24;
      const haloGrad = ctx.createRadialGradient(sx, sy, 20, sx, sy, 260 * pulse);
      haloGrad.addColorStop(0, 'rgba(255, 165, 60, 0.22)');
      haloGrad.addColorStop(0.45, 'rgba(225, 85, 25, 0.11)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(sx, sy, 260 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Diagonal volumetric god-rays sweeping from top-right eclipse
      for (let r = 0; r < 3; r++) {
        const rayAlpha = 0.035 + Math.sin(now * 0.0015 + r * 1.7) * 0.015;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(2.25 + r * 0.16);
        const rGrad = ctx.createLinearGradient(0, -45, 780, 45);
        rGrad.addColorStop(0, `rgba(255, 195, 95, ${rayAlpha})`);
        rGrad.addColorStop(0.6, `rgba(255, 130, 45, ${rayAlpha * 0.45})`);
        rGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = rGrad;
        ctx.beginPath();
        ctx.moveTo(0, -28);
        ctx.lineTo(820, -110);
        ctx.lineTo(820, 110);
        ctx.lineTo(0, 28);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Drifting golden embers & sacred ash petals
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.phase += dt * 2.4;
        m.x += (m.vx + Math.sin(m.phase) * 14) * dt;
        m.y += m.vy * dt;

        if (m.y < -20) {
          m.y = h + 15;
          m.x = Math.random() * w;
        }
        if (m.x > w + 20) {
          m.x = -15;
        }

        const flickerAlpha = m.alpha * (0.65 + 0.35 * Math.sin(m.phase * 1.7));
        ctx.save();
        ctx.globalAlpha = flickerAlpha;
        ctx.translate(m.x, m.y);
        if (m.isPetal) {
          ctx.rotate(m.phase * 0.6);
          ctx.fillStyle = m.color;
          ctx.shadowColor = '#ff8c24';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, 0, m.size * 1.4, m.size * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = m.color;
          ctx.beginPath();
          ctx.arc(0, 0, m.size * 1.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fffdf2';
          ctx.beginPath();
          ctx.arc(0, 0, m.size * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
      rafId = window.requestAnimationFrame(render);
    };

    rafId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      onMouseMove={(e) => {
        if (!backdropImgRef.current) return;
        const nx = (e.clientX / (window.innerWidth || 1440) - 0.5) * 14;
        const ny = (e.clientY / (window.innerHeight || 900) - 0.5) * 10;
        backdropImgRef.current.style.transform = `scale(1.06) translate3d(${-nx.toFixed(2)}px, ${-ny.toFixed(2)}px, 0)`;
      }}
      className="fixed inset-0 z-40 flex flex-col justify-between overflow-hidden bg-[#070605]"
    >
      {/* Key-Art Illustrated Backdrop with parallax depth and measured cinematic scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <img
          ref={backdropImgRef}
          src={GAME_ASSETS.titleBackdrop}
          alt="Rudra the Ash-Bound at the Charnel Plains of Kurukshetra"
          referrerPolicy="no-referrer"
          style={{
            transform: 'scale(1.06) translate3d(0px, 0px, 0)',
          }}
          className="w-full h-full object-cover object-center opacity-88 transition-transform duration-300 ease-out"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,5,4,0.94) 0%, rgba(7,6,5,0.72) 44%, rgba(7,6,5,0.16) 76%, rgba(6,5,4,0.68) 100%), linear-gradient(180deg, rgba(6,5,4,0.78) 0%, rgba(7,6,5,0.12) 45%, rgba(6,5,4,0.95) 100%)',
          }}
        />
      </div>

      {/* Live 60FPS Volumetric Ember & Solar Corona Canvas */}
      <canvas
        ref={fxCanvasRef}
        className="absolute inset-0 pointer-events-none z-[5]"
      />

      {/* Top Subtle Status Row */}
      <div className="relative z-10 flex items-center justify-between px-10 pt-7">
        <div className="flex items-center gap-3 text-xs tracking-[0.22em] text-[#e0b456]/95 uppercase">
          <span>CHOLA BRONZE &amp; KURUKSHETRA ASH</span>
          <span aria-hidden="true">·</span>
          <span>2.5D Isometric Mythological Action Vertical Slice</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#f2dfc0]/90 font-mono-num">
          <span>HOMA SHRINE KARMA: {ashenKarma}</span>
          {onOpenAudit && (
            <button
              type="button"
              data-testid="open-audit-btn"
              onClick={onOpenAudit}
              className="px-3 py-1 bg-[#141218]/90 hover:bg-[#221e29] border border-[#3ee0a8]/55 text-[#3ee0a8] text-[11px] font-mono-num uppercase tracking-wider cursor-pointer transition-colors"
            >
              ARCHITECTURAL AUDIT
            </button>
          )}
        </div>
      </div>

      {/* Main Asymmetric Left-Third Composition over Calm Negative Space */}
      <div className="relative z-10 flex flex-col justify-center px-10 md:px-16 max-w-3xl my-auto">
        {/* Custom Inline SVG Title Lockup & Crest */}
        <div className="mb-6">
          <svg
            viewBox="0 0 680 185"
            className="w-full max-w-[635px] h-auto drop-shadow-[0_14px_34px_rgba(0,0,0,0.98)]"
            role="img"
            aria-label="Kaliyuga: The Bleeding Crown — Chapter I Vertical Slice"
          >
            <defs>
              <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fff8d6" />
                <stop offset="45%" stopColor="#ebb854" />
                <stop offset="85%" stopColor="#b57d24" />
                <stop offset="100%" stopColor="#7a4e10" />
              </linearGradient>
              <linearGradient id="ivoryForge" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="65%" stopColor="#f5e8ce" />
                <stop offset="100%" stopColor="#bda986" />
              </linearGradient>
              <linearGradient id="crimsonSeal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e63b2b" />
                <stop offset="100%" stopColor="#7d140b" />
              </linearGradient>
            </defs>

            {/* Ornate Khanda Sword Header Divider */}
            <g transform="translate(4, 18)">
              <rect x="34" y="8" width="168" height="3" fill="url(#goldLeaf)" opacity="0.9" />
              <path
                d="M6,9.5 L22,2 L34,9.5 L22,17 Z"
                fill="url(#goldLeaf)"
                stroke="#3a250a"
                strokeWidth="1.5"
              />
              <circle cx="22" cy="9.5" r="3" fill="#ff5a1f" />
              <text
                x="216"
                y="14"
                fill="#ebd6a7"
                fontSize="11"
                fontWeight="600"
                letterSpacing="3.2"
                fontFamily="var(--font-cinzel), Georgia, serif"
              >
                CHAPTER I · KURUKSHETRA VERTICAL SLICE
              </text>
            </g>

            {/* Red Chola Bronze Seal Stamp */}
            <g transform="translate(6, 48)">
              <rect
                x="0"
                y="0"
                width="48"
                height="48"
                rx="4"
                fill="url(#crimsonSeal)"
                stroke="#f2c45a"
                strokeWidth="1.5"
              />
              <rect
                x="3"
                y="3"
                width="42"
                height="42"
                rx="2"
                fill="none"
                stroke="#f8e8c8"
                strokeWidth="0.6"
                opacity="0.45"
              />
              <path
                d="M11 11 H37 M24 11 V37 M13 21 H35 M15 21 V34 H33 V21 M19 27 H29"
                stroke="#fff3db"
                strokeWidth="2.2"
                strokeLinecap="square"
                fill="none"
              />
            </g>

            {/* Primary Display Title */}
            <text
              x="68"
              y="88"
              fill="url(#goldLeaf)"
              fontSize="54"
              fontWeight="800"
              letterSpacing="5.5"
              fontFamily="var(--font-cinzel), Georgia, serif"
            >
              KALIYUGA
            </text>
            <text
              x="68"
              y="142"
              fill="url(#ivoryForge)"
              fontSize="34"
              fontWeight="700"
              letterSpacing="5.5"
              fontFamily="var(--font-cinzel), Georgia, serif"
            >
              THE BLEEDING CROWN
            </text>

            {/* Subtitle Plaque */}
            <rect x="68" y="156" width="525" height="1.5" fill="url(#goldLeaf)" opacity="0.68" />
            <circle cx="68" cy="156.75" r="3" fill="#ffd86b" />
            <circle cx="593" cy="156.75" r="3" fill="#ffd86b" />
            <text
              x="68"
              y="176"
              fill="#e5ba63"
              fontSize="13.5"
              fontWeight="600"
              letterSpacing="4.8"
              fontFamily="var(--font-jakarta), sans-serif"
            >
              RUDRA THE ASH-BOUND · TWELVE-CHAMBER VERTICAL SLICE
            </text>
          </svg>
        </div>

        <p className="text-sm md:text-base text-[#e4d9c5]/95 max-w-xl leading-relaxed mb-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          Wield the <span className="text-[#f7cf78] font-semibold">3D Bloodforged Khanda-Parashu Great-Axe</span> across the scorched plains of Kurukshetra. Claim{' '}
          <span className="text-[#f7cf78] font-semibold">Vedic Deva Astras</span> from Agni, Indra
          &amp; Rudra-Shiva, chain <span className="text-[#63f2ff] font-semibold">360° Phantom Step Dash-Strikes</span>{' '}
          and <span className="text-[#f7cf78] font-semibold">Kalaripayattu Parries</span>, and shatter the
          Posture of <span className="text-[#ff855e] font-semibold">Dundubhi the Buffalo Demon</span>{' '}
          and <span className="text-[#ff855e] font-semibold">Vrikodara the Iron Rakshasa</span>.
        </p>

        {/* <= 3 Primary Menu Actions */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            data-start="true"
            data-testid="start-odyssey-btn"
            onClick={onStartOdyssey}
            className="px-8 py-4 bg-[#d9aa4c] hover:bg-[#ebbd5e] text-[#090807] font-bold tracking-[0.16em] text-sm uppercase border border-[#fff0bd] shadow-[0_0_34px_rgba(225,175,75,0.52)] transition-transform active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
          >
            ENTER KURUKSHETRA [ENTER]
          </button>

          <button
            type="button"
            data-testid="open-shrine-btn"
            onClick={onOpenShrine}
            className="px-6 py-4 bg-[#16130f]/92 hover:bg-[#241f18] text-[#f5cc7a] font-semibold tracking-[0.12em] text-sm uppercase border border-[#d4a548]/65 shadow-[0_10px_28px_rgba(0,0,0,0.85)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            HOMA FIRE SHRINE ({ashenKarma} KARMA)
          </button>

          <button
            type="button"
            data-testid="open-codex-btn"
            onClick={onOpenStory}
            className="px-6 py-4 bg-[#12100e]/88 hover:bg-[#211d18] text-[#e5dac5] font-medium tracking-[0.12em] text-sm uppercase border border-[#dfd3be]/30 shadow-[0_10px_28px_rgba(0,0,0,0.85)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            CODEX &amp; BUILDS
          </button>
        </div>
      </div>

      {/* Single Flat Borderless Control Hint Line in Bottom Safe Margin */}
      <div className="relative z-10 px-10 pb-6 flex flex-wrap items-center justify-between gap-4 text-xs tracking-[0.14em] text-[#cfc2ab]/85 uppercase">
        <span>
          WASD / Left Stick 360° Move · LMB / [X] Parashu Combo · RMB / [Y] Tapas Unleash · Space / [A] Phantom Step · [B]
          Vedic Astras · Tab / [RB] Stance · PC &amp; Console Gamepad Ready
        </span>
        <span className="text-[#e5b95c]/90 font-mono-num">3D RUDRA + 3D BOSSES (DUNDUBHI &amp; VRIKODARA) · 12 CHAMBERS</span>
      </div>
    </div>
  );
}

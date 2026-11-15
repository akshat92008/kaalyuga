'use client';

import React from 'react';

interface TitleOverlayProps {
  visible: boolean;
  assetsReady: boolean;
  loadingLabel: string;
  onStart: () => void;
}

export default function TitleOverlay({
  visible,
  assetsReady,
  loadingLabel,
  onStart,
}: TitleOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-8 md:p-12"
      style={{
        background:
          'linear-gradient(90deg, rgba(7,5,9,0.88) 0%, rgba(10,7,12,0.52) 32%, rgba(10,7,12,0.0) 56%, rgba(7,5,9,0.14) 100%)',
      }}
    >
      {/* Top negative-space margin spacer */}
      <div />

      {/* Left-third mythic title lockup over calm dark vignette */}
      <div className="max-w-md pointer-events-auto select-none">
        {/* Custom SVG Bull-Yantra & Parashu Emblem */}
        <svg
          viewBox="0 0 280 54"
          className="w-64 h-12 mb-3 overflow-visible"
          aria-hidden="true"
        >
          <path
            d="M8 27 L92 27 M188 27 L272 27"
            stroke="#c28538"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="140" cy="27" r="19" fill="#130d14" stroke="#d97706" strokeWidth="1.8" />
          <path
            d="M124 17 Q122 8 113 5 Q122 10 130 14 L150 14 Q158 10 167 5 Q158 8 156 17 L151 35 L140 42 L129 35 Z"
            fill="#f59e0b"
            stroke="#090508"
            strokeWidth="1.4"
          />
          <path d="M140 10 L140 44" stroke="#fff7ed" strokeWidth="1.8" />
        </svg>

        <h1
          className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-wide text-[#fff2d6] leading-[1.04]"
          style={{
            textShadow: '0 4px 18px rgba(0,0,0,0.95), 0 0 2px #000',
          }}
        >
          KAALYUGA
        </h1>
        <p className="font-display text-base sm:text-lg tracking-[0.26em] uppercase text-amber-400 mt-1.5 font-bold">
          The Bleeding Crown
        </p>

        <div className="mt-4 mb-7 h-[2px] w-40 bg-amber-600/80" />

        <p className="text-sm sm:text-base text-stone-300 max-w-md leading-relaxed">
          Chamber Prototype: <span className="text-amber-200 font-semibold">Bronze Drum Sanctuary</span>.
          Test live 3D cel-shaded fighters, Sumi-e ink outlines, and blade-locked elemental slashes
          against <span className="text-red-300 font-semibold">Dundubhi</span>.
        </p>

        <div className="mt-7 flex items-center gap-4">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStart();
            }}
            className="font-display px-8 py-3.5 text-sm sm:text-base font-bold uppercase tracking-[0.2em] bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-[#0d0805] border-2 border-amber-300 transition-colors cursor-pointer shadow-[0_6px_24px_rgba(217,119,6,0.42)]"
          >
            Enter Chamber
          </button>

          {!assetsReady && (
            <span className="text-xs uppercase tracking-[0.18em] text-amber-300/90 font-semibold">
              {loadingLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bottom flat borderless inline control hint */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm tracking-wider text-stone-300/90 font-medium">
        <p>
          WASD Move &nbsp;·&nbsp; Click / J Slash &nbsp;·&nbsp; RMB / K Heavy &nbsp;·&nbsp; Q Astra
          Skill &nbsp;·&nbsp; Space Dash &nbsp;·&nbsp; Shift / L Parry &nbsp;·&nbsp; 1 / 2 / 3
          Element &nbsp;·&nbsp; P Pause
        </p>
        <span className="text-amber-400/90 font-display text-xs tracking-[0.2em] uppercase">
          Press Enter or Space to Begin
        </span>
      </div>
    </div>
  );
}

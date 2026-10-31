'use client';

import React from 'react';
import { GAME_ASSETS, WEAPON_CONFIGS, WeaponId } from '@/lib/game/assets';

interface TitleScreenProps {
  ashenKarma: number;
  preloadProgress?: number;
  selectedWeapon?: WeaponId;
  onSelectWeapon?: (weapon: WeaponId) => void;
  onStartOdyssey: () => void;
  onOpenPrologue?: () => void;
  onOpenShrine: () => void;
  onOpenStory: () => void;
}

export function TitleScreen({
  ashenKarma,
  preloadProgress = 100,
  selectedWeapon = 'jingu_bang',
  onSelectWeapon,
  onStartOdyssey,
  onOpenPrologue,
  onOpenShrine,
  onOpenStory,
}: TitleScreenProps) {
  const isReady = preloadProgress >= 100;

  return (
    <section
      aria-label="Title Screen"
      className="fixed inset-0 z-30 flex flex-col justify-between p-6 md:p-11 overflow-hidden select-none bg-[#070506]"
    >
      {/* Full-Bleed Homescreen Key Art */}
      <img
        src={GAME_ASSETS.titleBackdrop}
        alt="Rudra beneath the bleeding eclipse of Mount Meru"
        className="absolute inset-0 w-full h-full object-cover object-right pointer-events-none select-none scale-[1.01]"
      />

      {/* Atmospheric Shadow Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, rgba(6, 4, 5, 0.96) 0%, rgba(8, 5, 6, 0.88) 36%, rgba(12, 6, 7, 0.44) 64%, rgba(8, 4, 5, 0.14) 100%)',
        }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(5, 4, 6, 0.72) 0%, rgba(5, 4, 6, 0.0) 22%, rgba(5, 4, 6, 0.0) 76%, rgba(5, 4, 6, 0.88) 100%)',
        }}
      />

      {/* Top Bar: Edition Tag & Stored Ashen Karma */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#c89d46]/25 pb-3.5">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-[#e03846] rotate-45 shadow-[0_0_8px_#e03846]" />
          <span className="font-mono-num text-[11px] tracking-[0.24em] text-[#e6be6a] uppercase">
            MERU ENGINE · v7 STORY &amp; COMBAT VERTICAL SLICE
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono-num bg-[#0c090b]/85 border border-[#c89d46]/40 px-3.5 py-1.5">
          <span className="text-[#c4b7a2]">
            ASHEN KARMA: <strong className="text-[#f5c451]">{ashenKarma}</strong>
          </span>
        </div>
      </header>

      {/* Left-Aligned Main Menu Column */}
      <div className="relative z-10 my-auto max-w-xl w-full text-left space-y-5 md:pl-2">
        <div className="space-y-1.5">
          <div className="text-xs md:text-sm font-mono-num tracking-[0.30em] text-[#f2c45a] uppercase">
            कलियुग · रक्तमुकुट · ACT I: THE CHARNEL PLAINS
          </div>
          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl font-black tracking-[0.05em] text-[#fff6e8] uppercase drop-shadow-[0_10px_32px_rgba(0,0,0,0.98)] leading-none">
            KALIYUGA
          </h1>
          <p className="font-display text-base md:text-lg tracking-[0.26em] text-[#ff6642] uppercase font-bold drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
            THE BLEEDING CROWN
          </p>
        </div>

        <p className="text-xs md:text-sm text-[#d8ccb8] max-w-md leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          Three thousand years ago, Rudra burned forty thousand people in the Shishira camp on his
          father’s word because he never walked two hundred paces to look. Now he climbs Mount Meru
          with theBroken Gada, guided by Savitri—the mother of a girl he killed.
        </p>

        {/* Broken Gada Grip Selector */}
        {onSelectWeapon && (
          <div className="space-y-2 pt-1 max-w-md">
            <div className="text-[10px] font-mono-num tracking-[0.22em] text-[#d4a548] uppercase">
              SELECT BROKEN GADA WEIGHT (SPIRAL-STAMPED MACE)
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['jingu_bang', 'twin_blades', 'dragon_glaive'] as WeaponId[]).map((wId) => {
                const cfg = WEAPON_CONFIGS[wId];
                const active = selectedWeapon === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    onClick={() => onSelectWeapon(wId)}
                    className={`p-2.5 text-left border transition-all cursor-pointer ${
                      active
                        ? 'bg-[#261612]/95 border-[#f5c451] shadow-[0_0_20px_rgba(245,196,81,0.28)]'
                        : 'bg-[#0e0b0d]/85 border-[#c89d46]/30 hover:border-[#c89d46]/70'
                    }`}
                  >
                    <div className="text-[10px] font-mono-num text-[#e6be6a]">
                      [{cfg.hotkey}] {cfg.chineseName}
                    </div>
                    <div className="font-display text-xs font-bold text-[#fff6e8] truncate mt-0.5">
                      {(cfg.name || cfg.englishName).split(' · ')[0]}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live 3D Models & Meru Engine Preloader Bar */}
        <div className="max-w-md space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-[10px] font-mono-num tracking-wider uppercase">
            <span className="text-[#f2c45a]">
              {isReady
                ? 'MERU ENGINE · 3D DUNDUBHI, VRIKODARA & VAITARANI READY'
                : 'LOADING 3D RIGS, LANTERN SHADERS & ACT I CHAMBERS...'}
            </span>
            <span className="text-[#fff6e8] font-bold">{Math.round(preloadProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1214]/90 border border-[#c89d46]/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#c82333] via-[#ff6a2b] to-[#f5c451] transition-all duration-200"
              style={{ width: `${Math.max(10, Math.min(100, preloadProgress))}%` }}
            />
          </div>
        </div>

        {/* Primary Action CTAs */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          {onOpenPrologue && (
            <button
              type="button"
              data-testid="start-prologue-btn"
              onClick={onOpenPrologue}
              className="min-w-[235px] px-7 py-3.5 bg-gradient-to-r from-[#b81d2a] via-[#d94426] to-[#cf8c28] hover:brightness-110 text-[#fff8eb] font-display font-bold text-xs md:text-sm tracking-[0.16em] uppercase border border-[#f5d061]/80 shadow-[0_12px_34px_rgba(184,29,42,0.55)] transition-all cursor-pointer"
            >
              BEGIN v7 STORY (5 SCROLLS + OPENING)
            </button>
          )}

          <button
            type="button"
            data-testid="start-odyssey-btn"
            onClick={onStartOdyssey}
            className="px-5 py-3.5 bg-[#1b1410]/95 hover:bg-[#2a1f18] text-[#f5c451] font-display font-bold text-xs tracking-[0.16em] uppercase border border-[#f5c451]/65 transition-colors cursor-pointer"
          >
            VAITARANI BOAT HUB &amp; ACT I
          </button>

          <button
            type="button"
            data-testid="open-shrine-btn"
            onClick={onOpenShrine}
            className="px-4 py-3.5 bg-[#120d10]/92 hover:bg-[#21171c] text-[#f2c45a] font-display font-bold text-xs tracking-[0.15em] uppercase border border-[#c89d46]/55 transition-colors cursor-pointer"
          >
            SHRINE
          </button>

          <button
            type="button"
            data-testid="open-story-btn"
            onClick={onOpenStory}
            className="px-4 py-3.5 bg-[#120d10]/92 hover:bg-[#21171c] text-[#e0d4c0] font-display font-bold text-xs tracking-[0.15em] uppercase border border-[#c89d46]/35 transition-colors cursor-pointer"
          >
            CODEX
          </button>
        </div>
      </div>

      {/* Bottom Controls Strip */}
      <footer className="relative z-10 border-t border-[#c89d46]/25 pt-3.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-num text-[#cfc2ae] bg-[#070506]/60 px-3 py-1.5">
        <div>
          <strong className="text-[#f2c45a]">GADA ATTACK:</strong> LMB / [J] ·{' '}
          <strong className="text-[#f2c45a]">STANCE HEAVY:</strong> RMB / [V] ·{' '}
          <strong className="text-[#3ee0a8]">LOOK (STORY OBJECTS):</strong> [E]
        </div>
        <div>
          <strong className="text-[#5ce6ff]">DASH:</strong> [SPACE] ·{' '}
          <strong className="text-[#ffd86b]">PARRY:</strong> [T] ·{' '}
          <strong className="text-[#ff6a33]">CYCLE STANCE (SMASH/PILLAR/THRUST):</strong> [TAB]
        </div>
      </footer>
    </section>
  );
}

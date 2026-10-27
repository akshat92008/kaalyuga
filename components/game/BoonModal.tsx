'use client';

import React from 'react';
import {
  CelestialBoonId,
  CelestialBoonSpec,
  IMMORTAL_PATRONS,
} from '@/lib/game/boons';

interface BoonModalProps {
  isOpen: boolean;
  choices: CelestialBoonSpec[];
  ownedBoons: CelestialBoonId[];
  rerollsRemaining: number;
  chamberId: number;
  onSelectBoon: (id: CelestialBoonId) => void;
  onRerollChoices: () => void;
}

const RARITY_STYLES: Record<
  CelestialBoonSpec['rarity'],
  { border: string; badgeBg: string; text: string }
> = {
  Rare: {
    border: 'border-[#3ee0a8]/55 hover:border-[#3ee0a8]',
    badgeBg: 'bg-[#102b23] text-[#3ee0a8] border-[#3ee0a8]/50',
    text: 'text-[#3ee0a8]',
  },
  Epic: {
    border: 'border-[#c266ff]/60 hover:border-[#d999ff]',
    badgeBg: 'bg-[#251236] text-[#df9cff] border-[#c266ff]/50',
    text: 'text-[#df9cff]',
  },
  Heroic: {
    border: 'border-[#ff6a42]/65 hover:border-[#ff8e6e]',
    badgeBg: 'bg-[#361610] text-[#ff8463] border-[#ff6a42]/50',
    text: 'text-[#ff8463]',
  },
  Legendary: {
    border: 'border-[#f5c451]/75 hover:border-[#ffe596]',
    badgeBg: 'bg-[#33270d] text-[#f5c451] border-[#f5c451]/65',
    text: 'text-[#f5c451]',
  },
};

export default function BoonModal({
  isOpen,
  choices,
  ownedBoons,
  rerollsRemaining,
  chamberId,
  onSelectBoon,
  onRerollChoices,
}: BoonModalProps) {
  if (!isOpen || choices.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Celestial Boon Selection"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#060508]/88 p-4 select-none"
    >
      <div className="relative w-full max-w-4xl bg-[#0e0c12] border-2 border-[#d4a548]/80 p-6 md:p-8 shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
        {/* Corner Ornamental Frames */}
        <div className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#f5c451]" />
        <div className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#f5c451]" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#c89d46]/30 pb-5 mb-6">
          <div>
            <div className="text-xs font-mono-num tracking-[0.2em] text-[#d4a548] uppercase mb-1">
              VEDIC ALTAR OF THE DEVAS · CHAMBER {chamberId}/6
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-[#f7efe0]">
              CHOOSE YOUR VEDIC ASTRA BOON
            </h2>
            <p className="text-xs md:text-sm text-[#b8ac98] mt-1">
              Accept one celestial Astra blessing to permanently empower Rudra the Ash-Bound for this run.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[10px] font-mono-num tracking-widest text-[#9c917e] uppercase">
                ACTIVE ASTRAS
              </div>
              <div className="text-sm font-mono-num font-bold text-[#f5c451]">
                {ownedBoons.length} Blessed
              </div>
            </div>

            <button
              type="button"
              disabled={rerollsRemaining <= 0}
              onClick={onRerollChoices}
              className={`px-3.5 py-2 border text-xs font-mono-num font-bold tracking-wider uppercase transition-colors ${
                rerollsRemaining <= 0
                  ? 'bg-[#121116] border-[#2e2b36] text-[#5e5869] cursor-not-allowed'
                  : 'bg-[#1c1626] hover:bg-[#2a2038] border-[#c266ff]/65 text-[#e6b8ff] cursor-pointer'
              }`}
            >
              KARMA MANDATE REROLL ({rerollsRemaining})
            </button>
          </div>
        </div>

        {/* 3 Hades-Style Boon Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {choices.map((boon, idx) => {
            const patron = IMMORTAL_PATRONS[boon.patronId];
            const rStyle = RARITY_STYLES[boon.rarity];
            const keyNum = idx + 1;

            return (
              <button
                key={boon.id}
                type="button"
                data-testid={`boon-choice-${idx}`}
                onClick={() => onSelectBoon(boon.id)}
                className={`group relative flex flex-col justify-between text-left bg-[#14121b] hover:bg-[#1c1926] border-2 ${rStyle.border} p-5 transition-all duration-150 cursor-pointer shadow-[0_12px_32px_rgba(0,0,0,0.85)]`}
              >
                <div>
                  {/* Top Row: Patron Crest & Rarity */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[10px] font-mono-num tracking-[0.14em] uppercase text-[#b8ac98]">
                      [{keyNum}] {boon.slotLabel}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono-num font-bold uppercase border ${rStyle.badgeBg}`}
                    >
                      {boon.rarity}
                    </span>
                  </div>

                  {/* Patron Identity */}
                  <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-white/10">
                    <div
                      className="w-9 h-9 flex items-center justify-center border font-display text-sm font-bold shrink-0"
                      style={{
                        borderColor: patron.accentColor,
                        color: patron.accentColor,
                        backgroundColor: 'rgba(10, 9, 14, 0.85)',
                      }}
                    >
                      {patron.chineseName.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-bold tracking-wider uppercase truncate"
                        style={{ color: patron.accentColor }}
                      >
                        {patron.name} · {patron.title}
                      </div>
                      <div className="text-[11px] text-[#9c917e] truncate">
                        {patron.chineseName}
                      </div>
                    </div>
                  </div>

                  {/* Boon Title */}
                  <h3 className="font-display text-lg font-bold text-[#f7efe0] group-hover:text-[#ffd86b] transition-colors mb-1">
                    {boon.name}
                  </h3>
                  <div className="text-xs font-medium text-[#d4a548] mb-3">
                    {boon.chineseName}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#d6cab6] leading-relaxed mb-4">
                    {boon.summary}
                  </p>
                </div>

                {/* Stat Callout Box */}
                <div className="pt-3 border-t border-white/10">
                  <div
                    className="text-xs font-mono-num font-bold tracking-wide"
                    style={{ color: boon.accentColor }}
                  >
                    {boon.statCallout}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono-num text-[#9c917e] group-hover:text-[#f7efe0]">
                    <span>ACCEPT BLESSING</span>
                    <span className="text-[#f5c451] font-bold">PRESS [{keyNum}] →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between text-[11px] font-mono-num text-[#8f8473]">
          <span>TIP: STACK PATRON BOONS WITH SHADOW STRIKE (BACKSTAB) &amp; CLOUD STEP DASH-STRIKES</span>
          <span>KEYS: [1] [2] [3] SELECT BOON</span>
        </div>
      </div>
    </div>
  );
}

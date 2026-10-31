'use client';

import React from 'react';
import { CHAMBERS } from '@/lib/game/assets';

interface OutcomeModalProps {
  mode: 'none' | 'paused' | 'victory' | 'defeat';
  chamberId: number;
  chamberName: string;
  finalScore: number;
  karmaEarnedThisRun: number;
  totalKarma: number;
  onResume: () => void;
  onPlayAgain: () => void;
  onOpenShrine: () => void;
  onReturnTitle: () => void;
}

export default function OutcomeModal({
  mode,
  chamberId,
  chamberName,
  finalScore,
  karmaEarnedThisRun,
  totalKarma,
  onResume,
  onPlayAgain,
  onOpenShrine,
  onReturnTitle,
}: OutcomeModalProps) {
  if (mode === 'none') return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={
        mode === 'paused'
          ? 'Game Paused'
          : mode === 'victory'
          ? 'All Sovereigns Vanquished'
          : 'Destiny Severed'
      }
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4 pointer-events-auto"
    >
      <div className="w-full max-w-xl bg-[#0e0d11] border border-[#d4a548]/80 px-8 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,0.96)]">
        {mode === 'paused' && (
          <>
            <div className="text-xs tracking-[0.26em] text-[#d4a548] uppercase mb-2">
              DHYANA SAMADHI · MEDITATION PAUSE
            </div>
            <h2 className="font-display text-3xl font-bold tracking-[0.08em] text-[#f7efe0] mb-3">
              KURUKSHETRA PAUSED
            </h2>
            <p className="text-xs text-[#b5a995] mb-6">
              Chamber {chamberId}/{CHAMBERS.length} · {chamberName}
            </p>

            <div className="grid grid-cols-3 gap-3 p-4 mb-7 bg-[#14131a] border border-[#c89d46]/25">
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  CHAMBER
                </div>
                <div className="text-lg font-bold font-mono-num text-[#f5ebd6]">
                  {chamberId}/{CHAMBERS.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  RUN SCORE
                </div>
                <div className="text-lg font-bold font-mono-num text-[#f5ebd6]">
                  {finalScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  ASHEN KARMA
                </div>
                <div className="text-lg font-bold font-mono-num text-[#f2c45a]">
                  {totalKarma} KARMA
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onResume}
                className="px-6 py-3 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] font-bold text-xs tracking-[0.14em] uppercase cursor-pointer whitespace-nowrap"
              >
                RESUME [ESC]
              </button>
              <button
                type="button"
                onClick={onOpenShrine}
                className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#f2c45a] border border-[#d4a548]/55 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
              >
                VISIT HOMA SHRINE
              </button>
              <button
                type="button"
                onClick={onPlayAgain}
                className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#dfd3be] border border-[#dfd3be]/25 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
              >
                RESTART RUN
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="px-5 py-3 bg-[#17151d] hover:bg-[#24212c] text-[#a99e8b] border border-[#a99e8b]/20 font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer whitespace-nowrap"
              >
                TITLE SCREEN
              </button>
            </div>
          </>
        )}

        {mode === 'victory' && (
          <>
            <div className="text-xs tracking-[0.26em] text-[#d4a548] uppercase mb-2">
              DHARMA RECLAIMED · KURUKSHETRA CONQUERED
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[0.06em] text-[#f9e79f] mb-4 leading-tight">
              ALL SOVEREIGNS
              <br />
              VANQUISHED
            </h2>
            <p className="text-sm text-[#c7bba6] max-w-md mx-auto leading-relaxed mb-7">
              Both Dundubhi the Bronze Buffalo Demon and Vrikodara the Iron Rakshasa have fallen
              before your Bloodforged Parashu. You have conquered the 8-Chamber Kurukshetra Odyssey!
            </p>

            <div className="grid grid-cols-3 gap-4 py-4 px-5 mb-7 bg-[#14131a] border border-[#c89d46]/25">
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  FINAL SCORE
                </div>
                <div className="text-xl font-bold font-mono-num text-[#f7efe0]">
                  {finalScore}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  KARMA BANKED
                </div>
                <div className="text-xl font-bold font-mono-num text-[#3ee0a8]">
                  +{karmaEarnedThisRun} KARMA
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  TOTAL KARMA
                </div>
                <div className="text-xl font-bold font-mono-num text-[#f2c45a]">
                  {totalKarma} KARMA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={onOpenShrine}
                className="py-3.5 px-5 bg-[#15131a] hover:bg-[#221f29] text-[#f5ebd6] border border-[#d4a548]/65 font-bold text-xs tracking-[0.12em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                VISIT HOMA SHRINE ({totalKarma})
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onPlayAgain}
                className="py-3.5 px-5 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] border border-[#f5dca0] font-bold text-xs tracking-[0.14em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                PLAY AGAIN
              </button>
            </div>
          </>
        )}

        {mode === 'defeat' && (
          <>
            <div className="text-xs tracking-[0.26em] text-[#ff6b78] uppercase mb-2">
              PRANA SEVERED · MORTAL VESSEL SHATTERED
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold tracking-[0.06em] text-[#ff7b86] mb-3">
              RETURNED TO THE HOMA SHRINE
            </h2>
            <p className="text-sm text-[#c7bba6] max-w-md mx-auto leading-relaxed mb-7">
              You fell in Chamber {chamberId}/{CHAMBERS.length} ({chamberName}). Your banked Ashen Karma endures—visit
              the Homa Fire Shrine to temper your Vajra Prana, Kavacha armor, and Amrita Kalasha draughts.
            </p>

            <div className="grid grid-cols-3 gap-4 py-4 px-5 mb-7 bg-[#14131a] border border-[#c89d46]/25">
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  CHAMBER REACHED
                </div>
                <div className="text-xl font-bold font-mono-num text-[#f7efe0]">
                  {chamberId}/{CHAMBERS.length}
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  KARMA BANKED
                </div>
                <div className="text-xl font-bold font-mono-num text-[#3ee0a8]">
                  +{karmaEarnedThisRun} KARMA
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.18em] text-[#9c917e] uppercase mb-1">
                  TOTAL KARMA
                </div>
                <div className="text-xl font-bold font-mono-num text-[#f2c45a]">
                  {totalKarma} KARMA
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={onOpenShrine}
                className="py-3.5 px-5 bg-[#15131a] hover:bg-[#221f29] text-[#f2c45a] border border-[#d4a548]/65 font-bold text-xs tracking-[0.12em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                VISIT HOMA SHRINE ({totalKarma})
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onPlayAgain}
                className="py-3.5 px-5 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] border border-[#f5dca0] font-bold text-xs tracking-[0.14em] uppercase transition-colors cursor-pointer whitespace-nowrap"
              >
                TRY AGAIN
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

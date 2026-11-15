'use client';

import React from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import {
  ELEMENT_SPECS,
  type AstraElement,
  type CombatSnapshot,
  type GamePhase,
} from '@/lib/game/rules';

export interface HudStateView {
  phase: GamePhase;
  assetsReady: boolean;
  loadingLabel: string;
  hp: number;
  maxHp: number;
  trailHp: number;
  stamina: number;
  maxStamina: number;
  astra: AstraElement;
  specialCooldown: number;
  specialMaxCooldown: number;
  comboCount: number;
  bossHp: number;
  bossMaxHp: number;
  bossTrailHp: number;
  bossPoise: number;
  bossMaxPoise: number;
  bossPhase: 1 | 2;
  bossStaggered: boolean;
  elapsedSec: number;
  snapshot: CombatSnapshot | null;
  callouts: Array<{
    id: number;
    screenX: number;
    screenY: number;
    text: string;
    tone: 'agni' | 'vajra' | 'vayu' | 'crit' | 'parry' | 'hurt';
    opacity: number;
  }>;
  impactFlashOpacity: number;
}

interface GameHudProps {
  hud: HudStateView;
  muted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
  onRestart: () => void;
  onReturnToTitle: () => void;
  onSelectElement: (el: AstraElement) => void;
}

function ElementCrestSvg({ element }: { element: AstraElement }) {
  if (element === 'agni') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          d="M12 2 C15 7 19 9 18 15 C17.5 19 15 21.5 12 22 C8.5 21.5 6 18.8 6 14.5 C6 11 8.5 9 9.5 6.5 C10.3 8.5 11.4 9.2 12 2 Z"
          fill="#ff7b1a"
          stroke="#0a0608"
          strokeWidth="1.6"
        />
        <path d="M12 10 C13.8 13 14.2 16 12 19 C9.8 16 10.2 13 12 10 Z" fill="#fff3c4" />
      </svg>
    );
  }
  if (element === 'vajra') {
    return (
      <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
        <path
          d="M13 2 L5 13 H11 L10 22 L19 10 H13 Z"
          fill="#38bdf8"
          stroke="#070a14"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M12.5 5.5 L8.5 11.5 H12 L11.5 17.5" fill="none" stroke="#f0f9ff" strokeWidth="1.3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path
        d="M3 9 H15.5 C18 9 19.5 7.5 19.5 5.8 C19.5 4.2 18 3 16.2 3 C14.6 3 13.5 4 13.5 5.3 M3 14 H18 C20 14 21 15.3 21 17 C21 18.8 19.5 20 17.8 20 C16 20 15 18.8 15 17.6 M3 18.5 H10.5"
        fill="none"
        stroke="#34d399"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CALLOUT_COLORS: Record<string, string> = {
  agni: '#ffb74d',
  vajra: '#7dd3fc',
  vayu: '#6ee7b7',
  crit: '#fde047',
  parry: '#f59e0b',
  hurt: '#f87171',
};

export default function GameHud({
  hud,
  muted,
  onToggleMute,
  onTogglePause,
  onRestart,
  onReturnToTitle,
  onSelectElement,
}: GameHudProps) {
  const showGameplayHud = hud.phase === 'playing' || hud.phase === 'paused';

  const hpPct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const trailHpPct = Math.max(hpPct, Math.min(100, (hud.trailHp / hud.maxHp) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));

  const bossHpPct = Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100));
  const bossTrailPct = Math.max(bossHpPct, Math.min(100, (hud.bossTrailHp / hud.bossMaxHp) * 100));
  const bossPoisePct = Math.max(0, Math.min(100, (hud.bossPoise / hud.bossMaxPoise) * 100));

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none">
      {/* 2-Frame Anime Impact Flash Vignette (no CSS filters, pure border glow) */}
      {hud.impactFlashOpacity > 0.02 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            opacity: hud.impactFlashOpacity * 0.48,
            boxShadow: 'inset 0 0 110px 28px rgba(255, 224, 130, 0.92)',
          }}
        />
      )}

      {/* Critical Low HP Peripheral Vignette */}
      {showGameplayHud && hud.hp <= 32 && hud.hp > 0 && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 120px rgba(220, 38, 38, 0.52)',
          }}
        />
      )}

      {/* Floating Damage & Parry Callouts */}
      {showGameplayHud &&
        hud.callouts.map((c) => (
          <div
            key={c.id}
            className="fixed font-display font-extrabold tracking-wide pointer-events-none"
            style={{
              left: `${c.screenX}px`,
              top: `${c.screenY}px`,
              transform: 'translate(-50%, -50%)',
              color: CALLOUT_COLORS[c.tone] || '#fff',
              opacity: c.opacity,
              fontSize: c.tone === 'crit' || c.tone === 'parry' ? '24px' : '18px',
              textShadow: '0 2px 0 #090508, -1px -1px 0 #090508, 1px 1px 0 #090508',
            }}
          >
            {c.text}
          </div>
        ))}

      {/* Subtle Loading Banner while FBX models finish parsing */}
      {showGameplayHud && !hud.assetsReady && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-5 py-2 bg-[#120d10]/95 border border-amber-500/60 text-amber-200 text-xs uppercase tracking-[0.2em] font-semibold">
          {hud.loadingLabel}
        </div>
      )}

      {showGameplayHud && (
        <>
          {/* TOP-LEFT: Rudra Vitality, Stamina & Breathing Astra Switcher */}
          <div className="fixed top-4 left-4 w-[336px] pointer-events-auto">
            <div className="bg-[#110c0f]/92 border-l-4 border-amber-500 px-3.5 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.7)]">
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-display text-xs tracking-[0.18em] uppercase text-amber-300 font-bold">
                  RUDRA · PARASHU
                </span>
                <span className="text-lg font-bold text-[#fff3da] tabular-nums leading-none">
                  {Math.round(hud.hp)}
                  <span className="text-xs text-stone-400 font-medium">/{hud.maxHp}</span>
                </span>
              </div>

              {/* Delayed Trailing Vitality Bar */}
              <div className="relative h-3 bg-[#1f1417] border border-amber-900/70 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300/75"
                  style={{ width: `${trailHpPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-red-600"
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              {/* Stamina Bar */}
              <div className="mt-1.5 h-1.5 bg-[#1b1714] border border-stone-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${stamPct}%` }}
                />
              </div>

              {/* Element Switcher ([1] Agni, [2] Vajra, [3] Vayu) */}
              <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                {(['agni', 'vajra', 'vayu'] as AstraElement[]).map((el, idx) => {
                  const spec = ELEMENT_SPECS[el];
                  const shortRole = el === 'agni' ? 'Burn DMG' : el === 'vajra' ? 'Poise' : 'Wide Arc';
                  const active = hud.astra === el;
                  return (
                    <button
                      key={el}
                      type="button"
                      tabIndex={-1}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onSelectElement(el);
                      }}
                      className={`flex items-center gap-1.5 px-2 py-1.5 text-left border transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#2a1b14] border-amber-400 text-[#fff3da]'
                          : 'bg-[#130f13]/85 border-stone-700/80 text-stone-300 hover:border-amber-600/70'
                      }`}
                      aria-label={`Select ${spec.name} breathing style`}
                    >
                      <ElementCrestSvg element={el} />
                      <div className="min-w-0 leading-tight">
                        <div className="text-[11px] font-bold uppercase tracking-wide whitespace-nowrap">
                          {idx + 1}·{spec.name}
                        </div>
                        <div className="text-[9px] text-stone-400 whitespace-nowrap">{shortRole}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Astra Special Cooldown + Live Combo */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-stone-300">
                <span>
                  [Q] 360° Astra:{' '}
                  <strong
                    className={
                      hud.specialCooldown <= 0 ? 'text-amber-300' : 'text-stone-400 tabular-nums'
                    }
                  >
                    {hud.specialCooldown <= 0
                      ? 'READY'
                      : `${hud.specialCooldown.toFixed(1)}s`}
                  </strong>
                </span>
                {hud.comboCount > 1 && (
                  <span className="font-display font-bold text-amber-300 tabular-nums">
                    {hud.comboCount} HIT
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* TOP-CENTER: Dundubhi Boss Vitality + Poise Bar */}
          <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[min(460px,46vw)]">
            <div className="bg-[#110c0f]/90 border-b-2 border-amber-700/80 px-4 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-display text-xs sm:text-sm font-bold tracking-[0.16em] uppercase text-[#fde7c8]">
                    Dundubhi · Bronze Drum Warden
                  </span>
                  {hud.bossPhase === 2 && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">
                      Phase II
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-amber-200 tabular-nums">
                  {Math.round(hud.bossHp)}
                </span>
              </div>

              <div className="relative h-3 bg-[#1d1113] border border-amber-900/70 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-amber-300/75"
                  style={{ width: `${bossTrailPct}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-red-600"
                  style={{ width: `${bossHpPct}%` }}
                />
              </div>

              {/* Boss Posture / Poise Bar */}
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-[0.16em] text-amber-400/90 font-semibold">
                  {hud.bossStaggered ? 'STAGGERED' : 'POISE'}
                </span>
                <div className="flex-1 h-1.5 bg-[#1b1512] border border-stone-800 overflow-hidden">
                  <div
                    className={`h-full ${hud.bossStaggered ? 'bg-yellow-300' : 'bg-amber-500'}`}
                    style={{ width: `${hud.bossStaggered ? 100 : bossPoisePct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* TOP-RIGHT: Compact Utility Controls */}
          <div className="fixed top-4 right-4 flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute audio (M)' : 'Mute audio (M)'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-9 h-9 flex items-center justify-center bg-[#140e12]/90 border border-amber-700/70 hover:border-amber-400 text-amber-200 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Restart chamber (R)"
              onClick={(e) => {
                e.currentTarget.blur();
                onRestart();
              }}
              className="w-9 h-9 flex items-center justify-center bg-[#140e12]/90 border border-amber-700/70 hover:border-amber-400 text-amber-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label={hud.phase === 'paused' ? 'Resume (P)' : 'Pause (P)'}
              onClick={(e) => {
                e.currentTarget.blur();
                onTogglePause();
              }}
              className="w-9 h-9 flex items-center justify-center bg-[#140e12]/90 border border-amber-700/70 hover:border-amber-400 text-amber-200 cursor-pointer"
            >
              {hud.phase === 'paused' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}

      {/* PAUSE MODAL */}
      {hud.phase === 'paused' && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-[#070508]/75">
          <div className="w-[min(420px,90vw)] bg-[#120d11] border-2 border-amber-600/80 p-7 text-center shadow-[0_18px_48px_rgba(0,0,0,0.85)]">
            <h2 className="font-display text-2xl font-bold tracking-[0.18em] uppercase text-[#fff2d6]">
              Chamber Paused
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              Hold <strong className="text-amber-300">Shift / L</strong> right before Dundubhi
              strikes to trigger a <strong className="text-amber-300">Deflect</strong> and break
              his posture.
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="font-display py-2.5 bg-amber-600 hover:bg-amber-500 text-[#0d0805] font-bold uppercase tracking-[0.18em] text-sm cursor-pointer"
              >
                Resume Battle
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="font-display py-2.5 bg-[#1e1519] hover:bg-[#2a1d22] border border-amber-700/70 text-amber-100 font-bold uppercase tracking-[0.18em] text-sm cursor-pointer"
              >
                Restart Chamber
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="font-display py-2 bg-transparent hover:bg-stone-900 text-stone-300 uppercase tracking-[0.16em] text-xs cursor-pointer"
              >
                Return to Gate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY OR DEFEAT MODAL */}
      {(hud.phase === 'victory' || hud.phase === 'defeat') && hud.snapshot && (
        <div className="fixed inset-0 z-40 pointer-events-auto flex items-center justify-center bg-[#070508]/80">
          <div className="w-[min(480px,92vw)] bg-[#120d11] border-2 border-amber-500/85 p-8 text-center shadow-[0_20px_54px_rgba(0,0,0,0.9)]">
            <p className="text-xs uppercase tracking-[0.26em] text-amber-400 font-bold">
              Bronze Drum Sanctuary
            </p>
            <h2 className="font-display text-3xl font-extrabold tracking-[0.14em] uppercase mt-1 text-[#fff2d6]">
              {hud.phase === 'victory' ? 'Dundubhi Vanquished' : 'Fallen at the Gate'}
            </h2>

            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              <div className="bg-[#1b1318] border border-amber-800/60 p-3">
                <div className="text-[10px] uppercase tracking-widest text-stone-400">Time</div>
                <div className="font-display text-xl font-bold text-amber-200 tabular-nums mt-0.5">
                  {Math.round(hud.snapshot.elapsedSec)}s
                </div>
              </div>
              <div className="bg-[#1b1318] border border-amber-800/60 p-3">
                <div className="text-[10px] uppercase tracking-widest text-stone-400">
                  {hud.phase === 'victory' ? 'Deflects' : 'Boss Left'}
                </div>
                <div className="font-display text-xl font-bold text-amber-200 tabular-nums mt-0.5">
                  {hud.phase === 'victory'
                    ? hud.snapshot.perfectParries
                    : `${Math.round(hud.snapshot.bossHpRemaining)}`}
                </div>
              </div>
              <div className="bg-[#1b1318] border border-amber-800/60 p-3">
                <div className="text-[10px] uppercase tracking-widest text-stone-400">
                  Damage Taken
                </div>
                <div className="font-display text-xl font-bold text-amber-200 tabular-nums mt-0.5">
                  {Math.round(hud.snapshot.damageTaken)}
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center gap-3">
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="font-display px-7 py-3 bg-amber-600 hover:bg-amber-500 text-[#0d0805] font-bold uppercase tracking-[0.18em] text-sm cursor-pointer"
              >
                {hud.phase === 'victory' ? 'Fight Again' : 'Try Again'}
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="font-display px-5 py-3 bg-[#1d1519] hover:bg-[#2a1e23] border border-amber-700/70 text-amber-100 font-semibold uppercase tracking-[0.16em] text-sm cursor-pointer"
              >
                Title
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

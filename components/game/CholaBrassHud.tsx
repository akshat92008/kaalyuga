'use client';

import React from 'react';
import { Flame, Shield, Swords, Waves, Zap } from 'lucide-react';
import { CHAMBERS } from '@/lib/game/assets';
import { STANCE_CONFIGS, StaffStance } from '@/lib/game/rules';
import { computeSavitriLanternHudState } from '@/lib/game/kalaBhairavaSusanoo';

export interface CholaBrassHudProps {
  chamberId: number;
  playerHp: number;
  playerMaxHp: number;
  stamina: number;
  maxStamina: number;
  astraEnergy: number;
  maxAstraEnergy: number;
  focusOrbs: number;
  gourdSips: number;
  maxGourdSips: number;
  stance: StaffStance;
  agneyastraCd: number;
  vayavyastraCd: number;
  vajrastraCd: number;
  transformCd: number;
  transformActiveTimer: number;
  activeUpasamharaZones: string[];
  rageUses: number;
  onHeal: () => void;
  onCycleStance: () => void;
  onWaterDragon: () => void;
  onTriggerSusanoo: () => void;
  onTriggerAstra: (astra: 'agneyastra' | 'vayavyastra' | 'vajrastra') => void;
}

/**
 * Kaliyuga-Original Chola Brass & Tala-patra Scroll Combat HUD
 * - Sharp geometric brass corners (zero rounded pill badges, zero backdrop-blur)
 * - Live Savitri Lantern flame reacting to Kala-Bhairava Rage usage
 * - 4 Rudraksha Focus Beads for Heavy Stance Unleashes
 * - Prominent [Z] Kala-Bhairava (Susanoo) Rage Seal + [4] Varuna Water Dragon
 */
export default function CholaBrassHud({
  chamberId,
  playerHp,
  playerMaxHp,
  stamina,
  maxStamina,
  astraEnergy,
  maxAstraEnergy,
  focusOrbs,
  gourdSips,
  maxGourdSips,
  stance,
  agneyastraCd,
  vayavyastraCd,
  vajrastraCd,
  transformCd,
  transformActiveTimer,
  activeUpasamharaZones,
  rageUses,
  onHeal,
  onCycleStance,
  onWaterDragon,
  onTriggerSusanoo,
  onTriggerAstra,
}: CholaBrassHudProps) {
  const susanooActive = transformActiveTimer > 0;
  const susanooReady = !susanooActive && transformCd <= 0;
  const lantern = computeSavitriLanternHudState(rageUses, susanooActive);
  const hpPct = Math.max(0, Math.min(100, (playerHp / Math.max(1, playerMaxHp)) * 100));
  const staPct = Math.max(0, Math.min(100, (stamina / Math.max(1, maxStamina)) * 100));
  const astraPct = Math.max(0, Math.min(100, (astraEnergy / Math.max(1, maxAstraEnergy)) * 100));

  return (
    <div
      data-testid="pc-combat-hotbar"
      className="pointer-events-auto self-start ml-12 mb-1 bg-[#0b0809]/95 border-2 border-[#c8963e] shadow-[0_14px_34px_rgba(0,0,0,0.96)] text-[11px] font-mono-num text-[#f5ebd6] relative"
      style={{
        boxShadow: susanooActive
          ? '0 0 24px rgba(255, 74, 28, 0.45), inset 0 0 0 1px rgba(255, 212, 107, 0.35)'
          : '0 12px 32px rgba(0, 0, 0, 0.94), inset 0 0 0 1px rgba(212, 165, 72, 0.28)',
      }}
    >
      {/* Engraved Chola Brass Corner Rivets */}
      <span className="pointer-events-none absolute -top-[2px] -left-[2px] w-2 h-2 border-t-2 border-l-2 border-[#f7d88b]" />
      <span className="pointer-events-none absolute -top-[2px] -right-[2px] w-2 h-2 border-t-2 border-r-2 border-[#f7d88b]" />
      <span className="pointer-events-none absolute -bottom-[2px] -left-[2px] w-2 h-2 border-b-2 border-l-2 border-[#f7d88b]" />
      <span className="pointer-events-none absolute -bottom-[2px] -right-[2px] w-2 h-2 border-b-2 border-r-2 border-[#f7d88b]" />

      <div className="px-3 py-2 flex flex-col gap-1.5">
        {/* Row 1: Savitri's Lantern Shrine Housing + Carved Chola Vitality + 4 Rudraksha Focus Beads */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Savitri Lantern Emblem & Chamber Plate */}
          <div
            data-testid="savitri-lantern-hud"
            className="flex items-center gap-1.5 px-2 py-0.5 bg-[#150e0c] border border-[#c8963e]/70"
            title={`Savitri's Lantern: ${lantern.label}`}
          >
            <Flame
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: lantern.flameColor,
                opacity: Math.max(0.38, lantern.intensity),
              }}
            />
            <div className="leading-none">
              <div className="font-display font-bold text-[10px] tracking-[0.14em] text-[#f2c45a]">
                CH {chamberId}/{CHAMBERS.length}
              </div>
              <div
                className="text-[8px] tracking-wider uppercase"
                style={{ color: lantern.flameColor }}
              >
                {lantern.isEclipsedByRage ? 'रौद्र ECLIPSED' : 'LANTERN'}
              </div>
            </div>
          </div>

          {/* Carved Chola-Brass Prana (Vitality) Bar */}
          <div className="flex items-center gap-1.5">
            <span className="font-display font-bold text-[#e6ba63] text-[10px] tracking-wider">
              PRANA
            </span>
            <div className="w-28 sm:w-32 h-3 bg-[#1a0a0d] border border-[#c8963e]/80 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7e111b] via-[#be1e2d] to-[#ea4c3b]"
                style={{ width: `${hpPct}%` }}
              />
              {/* Carved brass tick marks */}
              <div className="pointer-events-none absolute inset-0 flex justify-evenly">
                <span className="w-px h-full bg-[#0b0809]/55" />
                <span className="w-px h-full bg-[#0b0809]/55" />
                <span className="w-px h-full bg-[#0b0809]/55" />
              </div>
            </div>
            <span className="text-[#fff3dc] font-bold text-[11px] tabular-nums">
              {playerHp}/{playerMaxHp}
            </span>
          </div>

          {/* 4 Rudraksha Tapas Focus Beads (Heavy Attack Orbs) */}
          <div
            data-testid="rudraksha-focus-beads"
            className="flex items-center gap-1 px-1.5 py-0.5 bg-[#140f0c] border border-[#c8963e]/55"
            title={`Tapas Rudraksha Focus Beads (${focusOrbs}/4) — Spend on [K] Heavy Unleash`}
          >
            <span className="text-[9px] font-display font-bold text-[#d4a548] mr-0.5">TAPAS</span>
            {[0, 1, 2, 3].map((idx) => {
              const lit = idx < focusOrbs;
              return (
                <span
                  key={idx}
                  className={`w-2.5 h-2.5 rotate-45 border transition-colors ${
                    lit
                      ? 'bg-[#f5be4f] border-[#fff4cc]'
                      : 'bg-[#211712] border-[#6e5227]'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Row 2: Secondary Brass Gauges (Stamina & Astra) + Active Susanoo Seal Banner */}
        <div className="flex flex-wrap items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5" title="Stamina & Dash Charges [SPACE]">
            <span className="text-[#c8963e] font-bold">STA</span>
            <div className="w-16 h-1.5 bg-[#1b140c] border border-[#c8963e]/55 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#8f6824] via-[#d4a548] to-[#f7df99]"
                style={{ width: `${staPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5" title="Astra Energy (Built in combat)">
            <span className="text-[#c8963e] font-bold">ASTRA</span>
            <div className="w-16 h-1.5 bg-[#1d1408] border border-[#c8963e]/65 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#b87314] via-[#ebad34] to-[#fff0a8]"
                style={{ width: `${astraPct}%` }}
              />
            </div>
            <span className="text-[#f2c45a] font-bold tabular-nums">{astraEnergy}</span>
          </div>

          {susanooActive && (
            <span
              data-testid="susanoo-active-banner"
              className="px-1.5 py-0.5 bg-[#4a1014] border border-[#ff6b3d] text-[#ffd46b] font-bold tracking-wider uppercase"
            >
              रौद्र KALA-BHAIRAVA · {transformActiveTimer.toFixed(1)}s
            </span>
          )}
        </div>

        {/* Row 3: Sharp-Beveled Tala-Patra Combat Action Bar */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#c8963e]/30 text-[10px] whitespace-nowrap">
          <button
            type="button"
            tabIndex={-1}
            data-testid="pc-skill-heal"
            onClick={(e) => {
              e.currentTarget.blur();
              onHeal();
            }}
            className="flex items-center gap-1 px-1.5 py-1 bg-[#161012] border border-[#c8963e]/60 hover:border-[#f7df99] cursor-pointer"
            title="Sip Amrita Kalasha [H]"
          >
            <span className="text-[#d4a548] font-bold">[H]</span>
            <span className={gourdSips > 0 ? 'font-bold text-[#f5ebd6]' : 'text-[#7a6f5d]'}>
              {gourdSips}/{maxGourdSips}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-cycle-stance-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleStance();
            }}
            className="flex items-center gap-1 px-1.5 py-1 bg-[#18120c] border border-[#c8963e]/60 hover:border-[#f7df99] cursor-pointer"
            title="Cycle Parashu Stance [1 / 2 / 3]"
          >
            <Swords className="w-3 h-3 text-[#d4a548]" />
            <span className="text-[#d4a548] font-bold">[1-3]</span>
            <span className="font-bold text-[#f5ebd6]">{STANCE_CONFIGS[stance].sanskritName}</span>
          </button>

          {/* [4] VARUNA WATER DRAGON */}
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-water-dragon-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onWaterDragon();
            }}
            className="flex items-center gap-1 px-1.5 py-1 border font-bold cursor-pointer bg-[#0a1c2d] border-[#5cc9e8]/75 text-[#b5f0ff] hover:border-[#ffffff]"
            title="Varuna Tenth Form: Painterly Water Dragon [4]"
          >
            <Waves className="w-3 h-3 text-[#6fd8f5]" />
            <span>[4] WATER</span>
          </button>

          {/* [Z] KALA-BHAIRAVA SUSANOO RAGE SEAL */}
          <button
            type="button"
            tabIndex={-1}
            data-testid="hud-susanoo-rage-btn"
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerSusanoo();
            }}
            className={`flex items-center gap-1 px-2 py-1 border font-bold cursor-pointer ${
              susanooActive
                ? 'bg-[#6b141a] border-[#ffd46b] text-[#fff3cc]'
                : susanooReady
                  ? 'bg-[#360d12] border-[#ff5924] text-[#ffd46b] hover:border-[#fff3cc]'
                  : 'bg-[#141013] border-[#c8963e]/30 text-[#7d705e]'
            }`}
            title="Unleash Kala-Bhairava Astral Avatar (Susanoo Rage) [Z]"
          >
            <Shield className="w-3 h-3" />
            <span>
              [Z] रौद्र{' '}
              {susanooActive
                ? `${Math.ceil(transformActiveTimer)}s`
                : susanooReady
                  ? 'RAGE'
                  : `${Math.ceil(transformCd)}s`}
            </span>
          </button>

          {/* [Q] AGNEYASTRA */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerAstra('agneyastra');
            }}
            className={`px-1.5 py-1 border font-bold cursor-pointer ${
              activeUpasamharaZones.includes('agneyastra')
                ? 'bg-[#3b150c] border-[#f5ebd6] text-[#f5ebd6]'
                : astraEnergy >= 35 && agneyastraCd <= 0
                  ? 'bg-[#261012] border-[#b81d2a] text-[#f5ebd6]'
                  : 'bg-[#141116] border-[#c8963e]/30 text-[#7a6f5d]'
            }`}
            title="Agneyastra [Q] (35 Astra)"
          >
            [Q] {activeUpasamharaZones.includes('agneyastra') ? 'RECALL' : 'AGNI'}
          </button>

          {/* [E] VAYAVYASTRA */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerAstra('vayavyastra');
            }}
            className={`px-1.5 py-1 border font-bold cursor-pointer ${
              activeUpasamharaZones.includes('vayavyastra')
                ? 'bg-[#2b2010] border-[#f5ebd6] text-[#f5ebd6]'
                : astraEnergy >= 30 && vayavyastraCd <= 0
                  ? 'bg-[#1f180e] border-[#d4a548] text-[#f5ebd6]'
                  : 'bg-[#141116] border-[#c8963e]/30 text-[#7a6f5d]'
            }`}
            title="Vayavyastra [E] (30 Astra)"
          >
            [E] {activeUpasamharaZones.includes('vayavyastra') ? 'RECALL' : 'VAYU'}
          </button>

          {/* [R] VAJRASTRA */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerAstra('vajrastra');
            }}
            className={`flex items-center gap-0.5 px-1.5 py-1 border font-bold cursor-pointer ${
              astraEnergy >= 45 && vajrastraCd <= 0
                ? 'bg-[#291e0c] border-[#d4a548] text-[#f2c45a]'
                : 'bg-[#141116] border-[#c8963e]/30 text-[#7a6f5d]'
            }`}
            title="Vajrastra [R] (45 Astra)"
          >
            <Zap className="w-3 h-3" />
            <span>[R] VAJRA</span>
          </button>
        </div>
      </div>
    </div>
  );
}

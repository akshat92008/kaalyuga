'use client';

import React, { useState } from 'react';
import { GAME_ASSETS } from '@/lib/game/assets';
import { StaffStance, WeaponId } from '@/lib/game/rules';

interface StoryCodexModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBuildPreset?: (preset: {
    name: string;
    stance: StaffStance;
    weapon: WeaponId;
  }) => void;
}

export default function StoryCodexModal({
  isOpen,
  onClose,
  onApplyBuildPreset,
}: StoryCodexModalProps) {
  const [tab, setTab] = useState<'lore' | 'stances' | 'bosses' | 'builds'>('lore');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kaliyuga: The Bleeding Crown Lore and Combat Codex"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 md:p-8 pointer-events-auto"
    >
      <div className="w-full max-w-5xl bg-[#0d0c0e] border border-[#c89d46]/70 shadow-[0_24px_80px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-7 py-5 border-b border-[#c89d46]/25 bg-[#121014]">
          <div>
            <div className="text-[11px] tracking-[0.24em] text-[#d4a548] uppercase mb-1">
              KURUKSHETRA CHRONICLES · ITIHASA WAR COMPENDIUM
            </div>
            <h2 className="font-display text-2xl font-bold tracking-[0.08em] text-[#f5ebd6]">
              RUDRA THE ASH-BOUND&apos;S COMPENDIUM
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                { id: 'lore', label: '01. Legend & Curse' },
                { id: 'stances', label: '02. Parashu & Astras' },
                { id: 'bosses', label: '03. Sovereign Bosses' },
                { id: 'builds', label: '04. Recommended Builds' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`px-3.5 py-2 text-xs font-semibold tracking-wider uppercase border transition-colors cursor-pointer whitespace-nowrap ${
                  tab === item.id
                    ? 'bg-[#d4a548] text-[#090807] border-[#f5dca0]'
                    : 'bg-[#17151c] text-[#cfc3ae] border-[#c89d46]/30 hover:border-[#c89d46]/70'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-[#d6cab6]">
          {tab === 'lore' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-5 space-y-4">
                <img
                  src={GAME_ASSETS.wukongPortrait}
                  alt="Rudra the Ash-Bound Warrior"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 object-cover border border-[#c89d46]/40 bg-[#141218]"
                />
                <img
                  src={GAME_ASSETS.parashuAxeArt}
                  alt="Bloodforged Khanda-Parashu Great-Axe"
                  referrerPolicy="no-referrer"
                  className="w-full h-44 object-contain border border-[#c89d46]/40 bg-[#141218] p-2"
                />
              </div>
              <div className="md:col-span-7 space-y-4 leading-relaxed">
                <h3 className="font-display text-xl font-bold text-[#f2c45a]">
                  The Eighteenth Night of Kurukshetra &amp; The Bleeding Crown
                </h3>
                <p>
                  On the final night of the Great War of Kurukshetra, the forbidden{' '}
                  <strong>Brahmashira Astra</strong> tore open the sky. You are{' '}
                  <strong>Rudra the Ash-Bound</strong>—a deserted royal guard who tried to shield
                  the Shishira healer camp, including the young physician <strong>Shachi</strong>,
                  from the celestial fallout.
                </p>
                <p>
                  Bound to the <strong>Homa Fire Shrine</strong> on the banks of the Vaitarani River
                  and wielding the <strong>3D Bloodforged Khanda-Parashu Great-Axe</strong>, every
                  death returns you to the embers until the Dharma-Rot Sovereigns of Kurukshetra
                  are laid to rest.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-[#14131a] border border-[#c89d46]/25">
                    <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                      Act I · Chambers 1–3
                    </div>
                    <div className="font-display font-bold text-[#f5ebd6] mb-1">
                      Shores of Vaitarani &amp; Elephant Trenches
                    </div>
                    <p className="text-xs text-[#a99e8b]">
                      Carve through Kuru Ash-Infantry and Charnel Pyre-Hounds before challenging
                      Dundubhi, the Bronze Buffalo Demon at the Altar of the War-Drum.
                    </p>
                  </div>
                  <div className="p-4 bg-[#14131a] border border-[#c89d46]/25">
                    <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                      Act II · Chambers 4–6
                    </div>
                    <div className="font-display font-bold text-[#f5ebd6] mb-1">
                      Burning Shishira Camp &amp; Iron Sanctuary
                    </div>
                    <p className="text-xs text-[#a99e8b]">
                      Relive the night the Brahmashira fell and confront Vrikodara, the starving
                      Iron Rakshasa who broke his own body to shield the orphans of Kurukshetra.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'stances' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-[#14131a] border border-[#c89d46]/35">
                  <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                    CLEAVE · Unlocked Default
                  </div>
                  <h4 className="font-display text-lg font-bold text-[#f5ebd6] mb-2">
                    1. Asura Parashu Cleave
                  </h4>
                  <p className="text-xs text-[#b5a995] leading-relaxed mb-3">
                    Aggressive two-handed Great-Axe stance that builds Tapas rapidly and crushes
                    shields with a high-stagger overhead slam. Triggers Resolute Counterflow when
                    timed against enemy swings.
                  </p>
                  <div className="text-xs font-mono-num text-[#f2c45a]">
                    Heavy Base: 92 DMG · 165 Posture
                  </div>
                </div>

                <div className="p-5 bg-[#14131a] border border-[#c89d46]/35">
                  <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                    TANDAVA · Anti-Ground Utility
                  </div>
                  <h4 className="font-display text-lg font-bold text-[#f5ebd6] mb-2">
                    2. Tandava Vault Stance
                  </h4>
                  <p className="text-xs text-[#b5a995] leading-relaxed mb-3">
                    Rudra vaults skyward on a pillar of golden Tapas, avoiding ground shockwaves
                    and magma fissures before sweeping a massive 360-degree airborne Parashu cleave.
                  </p>
                  <div className="text-xs font-mono-num text-[#f2c45a]">
                    Heavy Base: 80 DMG · 185px Radius · Ground Immune
                  </div>
                </div>

                <div className="p-5 bg-[#14131a] border border-[#c89d46]/35">
                  <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                    SHULA · Precision Reach
                  </div>
                  <h4 className="font-display text-lg font-bold text-[#f5ebd6] mb-2">
                    3. Trishula Lunge Stance
                  </h4>
                  <p className="text-xs text-[#b5a995] leading-relaxed mb-3">
                    Drives the Bloodforged Trident-Axe tip forward in a 235px armor-piercing lunge.
                    Ideal for punishing Dundubhi and Vrikodara after a Perfect Phantom Step dodge.
                  </p>
                  <div className="text-xs font-mono-num text-[#f2c45a]">
                    Heavy Base: 104 DMG · 235px Reach
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-[#131218] p-5 border border-[#c89d46]/25">
                <div>
                  <h4 className="font-display text-lg font-bold text-[#f5ebd6] mb-3">
                    Vedic Astras &amp; Kalaripayattu Arts
                  </h4>
                  <ul className="space-y-2.5 text-xs text-[#c7bba6]">
                    <li>
                      <strong className="text-[#f2c45a]">[Q] Agneyastra Fire Bow:</strong> Binds all
                      nearby enemies and bosses in golden solar mandalas for 3.2s, amplifying
                      incoming Parashu damage by +25%.
                    </li>
                    <li>
                      <strong className="text-[#f2c45a]">[T / LB] Kalaripayattu Guard Parry:</strong>{' '}
                      Raises the Chola-bronze Parashu shaft for 0.8s. Deflecting an attack deals 320
                      Posture damage, staggers the attacker, and grants +1 Tapas Orb.
                    </li>
                    <li>
                      <strong className="text-[#f2c45a]">[E] Maya Mirage Phantoms:</strong> Summons
                      two autonomous Ash-Bound phantoms for 12s that rush down foes and build combo
                      meter.
                    </li>
                    <li>
                      <strong className="text-[#f2c45a]">[SPACE / A] Phantom Step Dash:</strong>{' '}
                      360° evade with invulnerability frames. Dodging at the last moment triggers a{' '}
                      <em>Perfect Phantom Step</em>, refunding stamina and granting +1 Tapas Orb.
                    </li>
                  </ul>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <img
                    src={GAME_ASSETS.parashuAxeArt}
                    alt="Bloodforged Khanda-Parashu Great-Axe"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-contain bg-black/50 p-2 border border-[#c89d46]/30"
                  />
                  <img
                    src={GAME_ASSETS.spellsVfxSheet}
                    alt="Vedic Astras and Fire Slash VFX"
                    referrerPolicy="no-referrer"
                    className="w-full h-40 object-cover border border-[#c89d46]/30"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'bosses' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 bg-[#141217] border border-[#c89d46]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#ff6b78] uppercase tracking-widest font-semibold">
                    Act I Vanguard · Chamber 3/6
                  </span>
                  <span className="text-xs font-mono-num text-[#d4a548]">1,850 POSTURE · 3 PHASES</span>
                </div>
                <h4 className="font-display text-xl font-bold text-[#f5ebd6]">
                  DUNDUBHI · The Bronze Buffalo Demon
                </h4>
                <img
                  src={GAME_ASSETS.dundubhi.roar}
                  alt="Dundubhi the Bronze Buffalo Demon"
                  referrerPolicy="no-referrer"
                  className="w-full h-44 object-contain bg-black/60 border border-[#c89d46]/25 p-2"
                />
                <p className="text-xs text-[#b8ac98] leading-relaxed">
                  A towering Chola-bronze war-beast fused with temple war-bells. Dundubhi charges
                  across the trenches and unleashes resonant bell-shockwaves. Counter his horn
                  rushes with <strong>Kalaripayattu Parry [T]</strong> or vault over his quakes in{' '}
                  <strong>Tandava Stance</strong>.
                </p>
              </div>

              <div className="p-5 bg-[#141217] border border-[#c89d46]/35 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#ffaa5c] uppercase tracking-widest font-semibold">
                    Chapter I Sovereign · Chamber 6/6
                  </span>
                  <span className="text-xs font-mono-num text-[#d4a548]">2,450 POSTURE · 3 PHASES</span>
                </div>
                <h4 className="font-display text-xl font-bold text-[#f5ebd6]">
                  VRIKODARA · The Iron Rakshasa
                </h4>
                <img
                  src={GAME_ASSETS.vrikodara.p1Slam}
                  alt="Vrikodara the Iron Rakshasa"
                  referrerPolicy="no-referrer"
                  className="w-full h-44 object-contain bg-black/60 border border-[#c89d46]/25 p-2"
                />
                <p className="text-xs text-[#b8ac98] leading-relaxed">
                  Guardian of the Sanctuary Cave who took the Brahmashira blast upon his own iron
                  plate to save thirty-four war orphans. In Phase 2, his armor shatters to reveal a
                  starving giant swinging a broken temple pillar. Shatter his Posture to grant him
                  warrior&apos;s peace.
                </p>
              </div>
            </div>
          )}

          {tab === 'builds' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'balanced',
                  badge: 'Build A · Signature Parashu',
                  title: 'The Ash-Bound Warlord',
                  stance: 'smash' as StaffStance,
                  weapon: 'jingu_bang' as WeaponId,
                  details:
                    'Pairs the Bloodforged Khanda-Parashu Axe with Asura Cleave Stance. Build Tapas with 4-hit Great-Axe combos, bind the boss with Agneyastra [Q], and land a 3-Orb Parashu Unleash.',
                },
                {
                  id: 'precision',
                  badge: 'Build B · High-Speed Lunge',
                  title: 'The Rakta-Parashu Duelist',
                  stance: 'thrust' as StaffStance,
                  weapon: 'twin_blades' as WeaponId,
                  details:
                    'Uses Rakta-Parashu Twin Cleavers (+38% speed) to generate Tapas rapidly, then switches to Trishula Lunge Stance to pierce bosses from 235px range after a Perfect Dash.',
                },
                {
                  id: 'spellburst',
                  badge: 'Build C · Juggernaut Breaker',
                  title: 'The Brahmashira Breaker',
                  stance: 'pillar' as StaffStance,
                  weapon: 'dragon_glaive' as WeaponId,
                  details:
                    'Combines the heavy Brahmashira Trishula Great-Axe with Tandava Vault Stance and Maya Phantoms [E] to obliterate Boss Posture and trigger lethal [F] Executions.',
                },
              ].map((b) => (
                <div
                  key={b.id}
                  className="flex flex-col justify-between p-5 bg-[#14131a] border border-[#c89d46]/35"
                >
                  <div>
                    <div className="text-xs text-[#d4a548] uppercase tracking-wider mb-1">
                      {b.badge}
                    </div>
                    <h4 className="font-display text-lg font-bold text-[#f5ebd6] mb-2">
                      {b.title}
                    </h4>
                    <p className="text-xs text-[#b5a995] leading-relaxed mb-4">{b.details}</p>
                  </div>

                  {onApplyBuildPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        onApplyBuildPreset({
                          name: b.title,
                          stance: b.stance,
                          weapon: b.weapon,
                        });
                        onClose();
                      }}
                      className="w-full py-2.5 px-4 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] font-bold text-xs tracking-wider uppercase cursor-pointer whitespace-nowrap"
                    >
                      EQUIP {b.title.toUpperCase()}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-7 py-4 border-t border-[#c89d46]/25 bg-[#110f14]">
          <span className="text-xs text-[#9c917e]">
            Tip: Click a Build Preset above to immediately equip its Stance and Parashu Aspect in combat.
          </span>
          <button
            type="button"
            data-testid="close-codex-btn"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#d4a548] hover:bg-[#e5b85b] text-[#090807] font-bold text-xs tracking-[0.14em] uppercase cursor-pointer whitespace-nowrap"
          >
            RETURN TO KURUKSHETRA
          </button>
        </div>
      </div>
    </div>
  );
}

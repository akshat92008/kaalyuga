'use client';

import React, { useState } from 'react';
import WukongArena from '@/components/game/WukongArena';
import AuditDashboard from '@/components/audit/AuditDashboard';

export default function HomePage() {
  const [showAudit, setShowAudit] = useState(false);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090807]">
      <WukongArena onOpenAudit={() => setShowAudit(true)} />

      {showAudit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#090807]">
          <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-[#121015]/95 border-b border-[#c89d46]/45 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 bg-[#10261e] border border-[#3ee0a8]/60 text-[11px] font-mono-num font-bold text-[#3ee0a8] uppercase tracking-wider">
                ALL 11 FINDINGS PATCHED · 9.8 / 10
              </span>
              <span className="text-xs text-[#cfc3ae] font-medium">
                Black Myth: Wukong — Ashen Mandate Technical Audit &amp; Hades Roguelike Upgrade Report
              </span>
            </div>
            <button
              type="button"
              data-testid="close-audit-overlay-btn"
              onClick={() => setShowAudit(false)}
              className="px-5 py-2 bg-[#d4a548] hover:bg-[#e7bb5f] text-[#090807] font-display font-bold text-xs tracking-[0.14em] uppercase cursor-pointer"
            >
              RETURN TO PLAYABLE GAME
            </button>
          </div>
          <AuditDashboard />
        </div>
      )}
    </div>
  );
}

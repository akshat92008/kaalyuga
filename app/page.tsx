'use client';

import React from 'react';
import KaliyugaArena from '@/components/game/KaliyugaArena';

export default function HomePage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090807]">
      <KaliyugaArena />
    </div>
  );
}

'use client';
import dynamic from 'next/dynamic';

// Studio runs exclusively in the browser: WebGL, video and audio need DOM APIs.
const MeruCinematicStudio = dynamic(() => import('@/components/game/MeruCinematicStudio'), {ssr:false});
export default function MeruStudioPage() {
  return <MeruCinematicStudio />;
}

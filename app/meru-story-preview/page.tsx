'use client';
import {useState} from 'react';
import MeruStoryCinematic from '@/components/game/MeruStoryCinematic';

/** Director preview of the exact movie component used by the in-game
 * Preserver interlude; does not change save data or combat progression. */
export default function MeruStoryPreviewPage(){
  const [playing,setPlaying]=useState(true);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#050509] p-6 text-[#eedeca]">
      {playing
        ? <MeruStoryCinematic onFinish={()=>setPlaying(false)}/>
        : <div className="max-w-lg space-y-5 text-center">
            <h1 className="font-serif text-3xl">The Preserver — Director Preview</h1>
            <p className="text-sm text-[#bfae9d]">Playback completed. In the game, this handoff returns directly to combat. No save data was changed in this preview.</p>
            <button type="button" onClick={()=>setPlaying(true)}
              className="rounded border border-[#9dbbd1] bg-[#263443] px-5 py-3 text-sm font-semibold"
            >Replay four-shot cinematic</button>
            <a href="/meru-studio" className="block text-sm text-[#a2d5e7] underline">Open Meru Cinematic Studio</a>
          </div>}
    </main>
  );
}

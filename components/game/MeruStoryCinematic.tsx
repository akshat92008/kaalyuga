'use client';
/**
 * Act I story-memory film player. Uses approved MP4 footage and painterly
 * portraits; no claim that a four-shot edit is a new animated Vishnu 3D rig.
 * One video element at a time (important on MacBook Air), independent of
 * gameplay WebGL. Time-based cuts, low-motion fallback and keyboard skip.
 */
import {useEffect,useRef,useState} from 'react';
import {MERU_PRESERVER_STORY,meruStoryDuration,sampleMeruStory} from '@/engine/meru/storyDirector';

export interface MeruStoryCinematicProps {
  onFinish:()=>void;
}
const sequence=MERU_PRESERVER_STORY;
const duration=meruStoryDuration(sequence);
export default function MeruStoryCinematic({onFinish}:MeruStoryCinematicProps){
  const onFinishRef=useRef(onFinish);
  onFinishRef.current=onFinish;
  const skipButtonRef=useRef<HTMLButtonElement>(null);
  const completedRef=useRef(false);
  const [elapsed,setElapsed]=useState(0);
  const [decoded,setDecoded]=useState(false);
  const [reducedMotion,setReducedMotion]=useState(false);
  const frame=sampleMeruStory(sequence,elapsed);
  const {shot,index}=frame;
  const progress=Math.min(100,frame.elapsed/duration*100);
  const slowPushScale=reducedMotion?1:1+frame.progress*shot.slowPush;
  const complete=()=>{
    if(completedRef.current)return;
    completedRef.current=true;
    onFinishRef.current();
  };

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange=()=>setReducedMotion(media.matches);
    media.addEventListener?.('change',onChange);
    let id=0;
    let last=0;
    let time=0;
    let uiLast=0;
    const loop=(now:number)=>{
      if(completedRef.current)return;
      const dt=last?Math.max(0,Math.min(0.35,(now-last)/1000)):0;
      last=now;
      time=Math.min(duration,time+dt);
      if(now-uiLast>60 || time>=duration){
        uiLast=now;
        setElapsed(time);
      }
      if(time>=duration){complete();return;}
      id=requestAnimationFrame(loop);
    };
    id=requestAnimationFrame(loop);
    const onKey=(event:KeyboardEvent)=>{
      if(event.metaKey||event.ctrlKey||event.altKey)return;
      if(event.key==='Escape'||event.key==='Enter'&&event.target===skipButtonRef.current){
        event.preventDefault();event.stopImmediatePropagation();
        complete();return;
      }
      // The cutscene is modal: combat input cannot queue actions for the next room.
      if(event.key!=='Tab'&&event.key!=='Shift'){
        event.preventDefault();event.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown',onKey,true);
    skipButtonRef.current?.focus();
    return ()=>{
      cancelAnimationFrame(id);
      window.removeEventListener('keydown',onKey,true);
      media.removeEventListener?.('change',onChange);
    };
  // The sequence is immutable; onFinish is held in the latest ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  useEffect(()=>setDecoded(false),[index]);

  return (
    <section
      role="dialog" aria-modal="true"
      aria-label="Preserver memory cinematic"
      aria-describedby="meru-story-narration"
      data-testid="meru-story-cinematic"
      data-meru-story-shot={shot.id}
      data-meru-story-clip-status={decoded?'decoded':reducedMotion?'still':'poster'}
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-[#03040b] text-[#f4e8d9] select-none"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{backgroundImage:'url('+shot.poster+')',transform:'scale('+slowPushScale+')'}}
        />
        {shot.motionVideo&&!reducedMotion&&(
          <video
            key={shot.id} src={shot.motionVideo} poster={shot.poster}
            preload="auto" playsInline muted autoPlay loop aria-hidden="true"
            onLoadedData={()=>setDecoded(true)} onError={()=>setDecoded(false)}
            style={{transform:'scale('+slowPushScale+')'}}
            className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-500 '+
              (decoded?'opacity-85':'opacity-0')}
          />
        )}
        {shot.subject==='vishnu' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={'absolute h-[min(78vw,76vh)] w-[min(78vw,76vh)] rounded-full opacity-65 '+
              (reducedMotion?'':'animate-[spin_28s_linear_infinite]')}
              style={{background:'repeating-conic-gradient(from 0deg,#87b9ce6e 0deg 2deg,transparent 2deg 22deg)',maskImage:'radial-gradient(circle,transparent 28%,black 30%,black 32%,transparent 34%,transparent 43%,black 45%,black 47%,transparent 49%,transparent 57%,black 59%,black 61%,transparent 63%)'}}/>
            <img
              src={shot.poster} alt=""
              className="relative h-[min(82vh,760px)] w-auto max-w-[80vw] object-contain opacity-80 drop-shadow-[0_0_60px_rgba(90,196,255,.32)]"
              style={{transform:'scale('+slowPushScale+')'}}
            />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#03050c]/45 via-[#060611]/10 to-[#03050c]/95"/>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-[#070716]/30 via-transparent to-[#070716]/30"/>
        <div className="pointer-events-none absolute inset-0 bg-[#020207]" style={{opacity:1-frame.transitionOpacity}}/>
      </div>

      <div className="absolute left-5 right-5 top-6 sm:left-10 sm:right-10 flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[10px] sm:text-xs tracking-[.27em] text-[#b9dcdf] uppercase">
            KALIYUGA · THE EIGHTEENTH NIGHT
          </p>
          <p className="font-serif text-lg sm:text-2xl text-[#fff3de] drop-shadow-[0_2px_6px_#000]">
            {sequence.title}
          </p>
        </div>
        <p className="text-[11px] uppercase tracking-widest text-[#c7b8a8]">
          SHOT {index+1} / {sequence.shots.length}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 px-5 pb-6 pt-20 sm:px-10 sm:pb-8 bg-gradient-to-t from-[#04050c] via-[#060915]/90 to-transparent">
        <div className="mx-auto max-w-5xl">
          <div key={shot.id} className="max-w-3xl">
            <p className="text-xs tracking-[.26em] font-semibold uppercase text-[#9fd8f0]">{shot.title}</p>
            <p id="meru-story-narration" role="status" aria-live="polite" aria-atomic="true"
              className="mt-3 font-serif text-lg leading-relaxed sm:text-2xl text-[#f5e9d3] drop-shadow-[0_3px_8px_#000]">
              {shot.narration}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <div className="h-1 flex-1 rounded-full bg-[#4a4a59]/70 overflow-hidden" aria-hidden="true">
              <div className="h-full bg-[#9cd8e1]" style={{width:progress+'%'}}/>
            </div>
            <span className="hidden sm:inline font-mono text-xs text-[#b8b9c3] tabular-nums">
              {Math.ceil(Math.max(0,duration-elapsed))}s
            </span>
            <button
              ref={skipButtonRef} type="button"
              aria-label="Skip Preserver memory and return to combat"
              onClick={complete}
              className="shrink-0 rounded border border-[#7db2bf]/70 bg-[#0c1824]/95 px-4 py-2.5 text-xs font-semibold uppercase tracking-[.10em] text-[#d9f5ff] hover:bg-[#203849] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#bce8f3]"
            >
              Skip to combat (Esc)
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

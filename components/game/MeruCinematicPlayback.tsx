'use client';
/**
 * In-game Meru Cinematic Player. A real, skippable cinematic which holds combat
 * until finish and reuses the exact authored Studio scene / original boss model.
 */
import {useEffect,useRef,useState} from 'react';
import {Boss3DRenderer} from '@/lib/game/boss3dRenderer';
import {GAME_ASSETS} from '@/lib/game/assets';
import {MeruTimelinePlayer,type MeruCinematic} from '@/engine/meru/cinematicTimeline';
import {MeruAdaptiveQuality} from '@/engine/meru/adaptiveQuality';
import {makeMeruBossParams,paintMeruFrame,MERU_FRAME_WIDTH,MERU_FRAME_HEIGHT} from '@/engine/meru/cinematicVisuals';

export type MeruCinematicEndReason='completed'|'skipped';
export interface MeruCinematicPlaybackProps {
  scene:MeruCinematic;
  muted?:boolean;
  onFinish:(reason:MeruCinematicEndReason)=>void;
}
export default function MeruCinematicPlayback({scene,onFinish,muted=false}:MeruCinematicPlaybackProps){
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const videoRef=useRef<HTMLVideoElement|null>(null);
  const skipRef=useRef<HTMLButtonElement|null>(null);
  const timelineRef=useRef(new MeruTimelinePlayer(scene));
  const onFinishRef=useRef(onFinish);
  onFinishRef.current=onFinish;
  const mutedRef=useRef(muted);
  mutedRef.current=muted;
  const finishOnceRef=useRef(false);
  const [status,setStatus]=useState('Summoning the Warden…');
  const [seconds,setSeconds]=useState(0);
  const [ready,setReady]=useState(false);
  const [videoDecoded,setVideoDecoded]=useState(false);
  const [startedWithRig,setStartedWithRig]=useState<boolean|null>(null);

  const finish=(reason:MeruCinematicEndReason)=>{
    if(finishOnceRef.current)return;
    finishOnceRef.current=true;
    timelineRef.current.pause();
    videoRef.current?.pause();
    onFinishRef.current(reason);
  };
  useEffect(()=>{
    finishOnceRef.current=false;
    setVideoDecoded(false);
    let disposed=false;
    let frameId=0;
    let lastNow=0, lastUi=0, lastBoss=0;
    let hasRig=false;
    let isReady=false;
    let audio:Record<string,HTMLAudioElement>={};
    let watchdogId:ReturnType<typeof setTimeout>|null=null;
    const timeline=new MeruTimelinePlayer(scene);
    const quality=new MeruAdaptiveQuality('balanced',60);
    timelineRef.current=timeline;
    let boss:Boss3DRenderer|null=null;
    const portrait=new Image();
    portrait.src=GAME_ASSETS.portraits[scene.boss];
    const audioSources={
      drum:GAME_ASSETS.sfx.warDrum,
      roar:GAME_ASSETS.sfx.bossRoarDeep,
      impact:GAME_ASSETS.sfx.weaponSmash,
    };
    for(const [key,url] of Object.entries(audioSources)){
      try{
        const track=new Audio(url);
        track.preload='auto';
        audio[key]=track;
      }catch{/* Audio is optional; never block gameplay. */}
    }
    const updateRigStatus=(loaded:boolean)=>{
      hasRig=loaded;
      setStatus(loaded
        ? 'Original '+scene.boss+' 3D rig active'
        : 'Original '+scene.boss+' portrait fallback (3D rig unavailable)');
    };
    const start=()=>{
      if(disposed||finishOnceRef.current||isReady)return;
      if(watchdogId!==null)clearTimeout(watchdogId);
      isReady=true;
      setReady(true);
      setStartedWithRig(hasRig);
      updateRigStatus(hasRig);
      timeline.play();
      const video=videoRef.current;
      if(video)void video.play().catch(()=>undefined);
    };
    try{
      boss=new Boss3DRenderer(384);
      // Wait for the actual FBX rig and primary animation to finish loading
      // BEFORE moving the camera; a short watchdog used to show a portrait
      // for the opening half of the cinematic on slower systems.
      void boss.ensureBossLoaded(scene.boss).then(async()=>{
        if(disposed||finishOnceRef.current)return;
        const loaded=await boss!.waitForBossReady(scene.boss,0);
        if(disposed||finishOnceRef.current)return;
        updateRigStatus(loaded);
        start();
      }).catch(()=>{
        if(disposed||finishOnceRef.current)return;
        updateRigStatus(false);
        start();
      });
    }catch{
      updateRigStatus(false);
      start();
    }

    // Do not trade the first-frame 3D boss reveal for a portrait merely because
    // its FBX/PBR textures are still downloading on slow or software GPUs.
    // A genuine loading failure still falls back via catch, and this bounded
    // watchdog prevents permanently broken assets from trapping gameplay.
    watchdogId=setTimeout(start,45000);

    const loop=(now:number)=>{
      if(disposed||finishOnceRef.current)return;
      // Cinematic tracks advance using wall-clock elapsed time, independent
      // of low GPU FPS. The former 50ms clamp caused 8s scenes to stall
      // for 30+ seconds on software WebGL / headless environments.
      const dt=lastNow?Math.min(0.75,Math.max(0,(now-lastNow)/1000)):0.016;
      lastNow=now;
      const result=timeline.tick(dt);
      quality.sample(Math.max(1,dt*1000));
      const budget=quality.budget;
      if(isReady){
        for(const cue of result.cues){
          if(cue.kind!=='drum'&&cue.kind!=='roar'&&cue.kind!=='impact')continue;
          const track=audio[cue.kind];
          if(!track || mutedRef.current)continue;
          try{track.currentTime=0;void track.play().catch(()=>undefined);}catch{}
        }
      }
      const canvas=canvasRef.current;
      const ctx=canvas?.getContext('2d');
      if(ctx){
        if(isReady&&hasRig&&boss&&now-lastBoss>=1000/budget.maxCharacterRenderFps){
          const bossDt=lastBoss?Math.max(0.015,Math.min(0.04,(now-lastBoss)/1000)):0.033;
          lastBoss=now;
          try{
            const rendered=boss.updateAndRender(makeMeruBossParams(result.frame,bossDt,scene.boss,scene.bossPhase??1));
            if(!rendered)updateRigStatus(false);
          }catch{
            updateRigStatus(false);
          }
        }
        paintMeruFrame(ctx,result.frame,scene,boss,hasRig,portrait,budget.particleMultiplier);
      }
      if(now-lastUi>110){lastUi=now;setSeconds(result.frame.time);}
      if(result.ended){
        finishOnceRef.current=true;
        onFinishRef.current('completed');
        return;
      }
      frameId=requestAnimationFrame(loop);
    };
    frameId=requestAnimationFrame(loop);
    const onKey=(event:KeyboardEvent)=>{
      if(event.metaKey||event.ctrlKey||event.altKey)return;
      if(event.key==='Escape'){
        event.preventDefault();event.stopImmediatePropagation();
        finish('skipped');
        return;
      }
      // Prevent combat keydown handlers from buffering attacks while the cinematic runs.
      event.stopImmediatePropagation();
      if(!['Tab','Shift'].includes(event.key))event.preventDefault();
    };
    window.addEventListener('keydown',onKey,true);
    skipRef.current?.focus();
    return ()=>{
      disposed=true;
      if(watchdogId!==null)clearTimeout(watchdogId);
      window.removeEventListener('keydown',onKey,true);
      cancelAnimationFrame(frameId);
      timeline.pause();
      try{videoRef.current?.pause();}catch{}
      for(const track of Object.values(audio)){track.pause();track.src='';}
      audio={};
      boss?.dispose();
      boss=null;
    };
    // scene instance changes cause a fresh timeline and cancel the previous one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[scene]);

  return (
    <div
      role="dialog" aria-modal="true"
      aria-label={scene.title+' cinematic'}
      data-testid="meru-boss-cinematic"
      data-meru-rig-status={!ready ? 'loading' : status.includes('3D rig active') ? 'rigged' : 'fallback'}
      data-meru-rig-detail={status}
      data-meru-started-with-rig={startedWithRig===null?'pending':startedWithRig?'yes':'no'}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-[#050407]/[0.98] p-2 sm:p-6"
    >
      <div className="relative w-full max-w-6xl">
        <div className="relative aspect-video overflow-hidden rounded-xl border border-[#63462e] bg-[#0c070b] shadow-[0_30px_90px_rgba(0,0,0,0.95)]">
          <div className="absolute inset-0 bg-cover bg-center" style={{backgroundImage:'url('+scene.posterUrl+')'}}/>
          <video
            ref={videoRef} src={scene.backgroundUrl} poster={scene.posterUrl}
            muted playsInline loop preload="auto" autoPlay
            onLoadedData={()=>setVideoDecoded(true)}
            onError={()=>setVideoDecoded(false)}
            data-meru-video-status={videoDecoded?'decoded':'poster'}
            className={'absolute inset-0 h-full w-full object-cover transition-opacity duration-700 '+(videoDecoded?'opacity-100':'opacity-0')}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/30"/>
          <canvas
            ref={canvasRef} width={MERU_FRAME_WIDTH} height={MERU_FRAME_HEIGHT}
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-label="Meru cinematic rendered with game boss model and scripted effects"
          />
          <div className="pointer-events-none absolute left-4 top-4 text-xs uppercase tracking-[0.22em] text-[#efd0a6]">
            KALIYUGA · {scene.title}
          </div>
          {!ready && <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/50 text-center font-serif text-xl text-[#edc28e]">{status}</div>}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded bg-[#30221f]" aria-hidden="true">
            <div className="h-full bg-[#d08c56]" style={{width:Math.min(100,seconds/scene.duration*100)+'%'}}/>
          </div>
          <span data-testid="meru-cinematic-clock" className="font-mono text-xs text-[#b7a797]">{seconds.toFixed(1)}s / {scene.duration}s</span>
          <button
            ref={skipRef}
            type="button"
            aria-label="Skip boss cinematic and begin combat"
            onClick={()=>finish('skipped')}
            className="rounded-md border border-[#8b674e] bg-[#291913] px-4 py-2 text-sm font-semibold text-[#f5d7ac] hover:bg-[#3c281a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f6ca7d]"
          >Skip cinematic <span className="text-[#c8ac8c]">(Esc)</span></button>
        </div>
      </div>
    </div>
  );
}

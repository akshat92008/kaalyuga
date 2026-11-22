'use client';
/**
 * Meru Cinematic Studio — standalone authoring tool for original Kaliyuga assets.
 * Never touches combat state. Scene files are validated, editable and exportable.
 * Live playback uses the EXISTING Boss3DRenderer; no fake placeholder rig.
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {Boss3DRenderer} from '@/lib/game/boss3dRenderer';
import {GAME_ASSETS} from '@/lib/game/assets';
import {isSoftwareWebGLRenderer} from '@/lib/game/hadesSpriteBaker';
import {
  createDundubhiScene, MeruTimelinePlayer, sampleCinematic, retimeCinematic,
  validateCinematic, NEUTRAL_CINEMATIC_POSE, type MeruCinematic, type BossCharacter,
} from '@/engine/meru/cinematicTimeline';
import {GRAPHICS_PRESETS,type GraphicsTier} from '@/engine/meru/adaptiveQuality';
import {MeruFrameProbe,type MeruFrameReport} from '@/engine/meru/performanceProbe';
import {makeMeruBossParams,paintMeruFrame} from '@/engine/meru/cinematicVisuals';
import {meruSceneStorageKey,readBossPhase,readBossIntro} from '@/engine/meru/runtimePolicy';
import {resolveProductionScene} from '@/engine/meru/productionSceneRegistry';

const W=960,H=540;
function fmt(n:number){return Number.isFinite(n)?n.toFixed(2):'0.00';}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n));}
export default function MeruCinematicStudio(){
  const [scene,setScene]=useState<MeruCinematic>(()=>createDundubhiScene());
  const [time,setTime]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [editTrack,setEditTrack]=useState<'camera'|'actor'|'pose'|'lighting'>('camera');
  const [status,setStatus]=useState('Initializing original Dundubhi rig…');
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);
  const [videoDecoded,setVideoDecoded]=useState(false);
  const [tier,setTier]=useState<GraphicsTier>('balanced');
  const [frameReport,setFrameReport]=useState<MeruFrameReport|null>(null);
  const frameProbeRef=useRef(new MeruFrameProbe());
  const lastReportUiRef=useRef(0);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const videoRef=useRef<HTMLVideoElement>(null);
  const bossRef=useRef<Boss3DRenderer|null>(null);
  const portraitRef=useRef<HTMLImageElement|null>(null);
  const audioRef=useRef<Record<string,HTMLAudioElement>>({});
  const sceneRef=useRef(scene);
  const timelineRef=useRef(new MeruTimelinePlayer(scene));
  const readyRef=useRef(false);
  const rafRef=useRef(0);
  const lastRef=useRef(0);
  const tierRef=useRef(tier);
  tierRef.current=tier;

  const loadScene=useCallback((incoming:unknown)=>{
    try{
      const parsed=validateCinematic(incoming);
      sceneRef.current=parsed;
      const next=new MeruTimelinePlayer(parsed);
      timelineRef.current=next;
      setScene(parsed);setTime(0);setPlaying(false);setVideoDecoded(false);setError('');
      videoRef.current?.pause();
    }catch(e){setError(e instanceof Error?e.message:'Invalid scene file');}
  },[]);

  useEffect(()=>{
    // Hydrate before enabling persistence: otherwise the default scene silently
    // overwrites an existing user's authored camera/lighting keyframes on mount.
    loadScene(readBossIntro('dundubhi',true));
    setHydrated(true);
  },[loadScene]);
  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(meruSceneStorageKey(scene),JSON.stringify(scene));}
    catch{/* Storage may be disabled */ }
  },[scene,hydrated]);
  useEffect(()=>{
    let disposed=false;
    readyRef.current=false;
    lastRef.current=0;
    frameProbeRef.current.reset();
    lastReportUiRef.current=0;
    let lastBossFrame=0;
    const reduceMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    let slowRigTimer:number|null=null;
    setStatus('Initializing original '+scene.boss+' rig…');
    const portrait=new Image();portrait.src=GAME_ASSETS.portraits[scene.boss];portraitRef.current=portrait;
    for(const [kind,url] of Object.entries({drum:GAME_ASSETS.sfx.warDrum,roar:GAME_ASSETS.sfx.bossRoarDeep,impact:GAME_ASSETS.sfx.weaponSmash})){
      const audio=new Audio(url);audio.preload='auto';audioRef.current[kind]=audio;
    }
    try{
      const boss=new Boss3DRenderer(isSoftwareWebGLRenderer()?384:512);
      bossRef.current=boss;
      // A slow machine should not be permanently stuck on portrait mode just
      // because FBX + PBR textures take more than twelve seconds to download.
      slowRigTimer=window.setTimeout(()=>{
        if(!disposed&&!readyRef.current)setStatus('Still loading original '+scene.boss+' 3D model…');
      },12000);
      void boss.ensureBossLoaded(scene.boss).then(async()=>{
        const ok=await boss.waitForBossReady(scene.boss,0);
        if(disposed)return;
        if(slowRigTimer!==null)window.clearTimeout(slowRigTimer);
        readyRef.current=ok;
        setStatus(ok?'Original '+scene.boss+' 3D rig loaded':'Rig unavailable: original portrait fallback');
      }).catch(()=>{
        if(disposed)return;
        if(slowRigTimer!==null)window.clearTimeout(slowRigTimer);
        setStatus('Rig loading failed: portrait fallback');
      });
    }catch{
      setStatus('WebGL unavailable: portrait fallback');
    }
    const loop=(now:number)=>{
      if(disposed)return;
      const dt=lastRef.current?clamp((now-lastRef.current)/1000,0,0.05):0.016;
      if(lastRef.current)frameProbeRef.current.sample(now-lastRef.current);
      lastRef.current=now;
      if(now-lastReportUiRef.current>1500){
        lastReportUiRef.current=now;
        setFrameReport(frameProbeRef.current.report());
      }
      const result=timelineRef.current.tick(dt);
      const t=result.frame;
      if(timelineRef.current.playing || result.ended)setTime(t.time);
      if(result.ended){setPlaying(false);videoRef.current?.pause();}
      for(const cue of result.cues){
        const audio=audioRef.current[cue.kind];
        if(audio){try{audio.currentTime=0;void audio.play().catch(()=>undefined);}catch{}}
      }
      const ctx=canvasRef.current?.getContext('2d');
      const boss=bossRef.current;
      if(ctx){
        const budget=GRAPHICS_PRESETS[tierRef.current];
        if(readyRef.current&&boss&&now-lastBossFrame>=1000/budget.maxCharacterRenderFps){
          lastBossFrame=now;
          try{boss.updateAndRender(makeMeruBossParams(t,Math.max(0.015,dt),sceneRef.current.boss,sceneRef.current.bossPhase??1));}
          catch{readyRef.current=false;setStatus('3D renderer failed: portrait fallback');}
        }
        paintMeruFrame(ctx,t,sceneRef.current,boss,readyRef.current,portraitRef.current,budget.particleMultiplier,reduceMotion);
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{
      disposed=true;cancelAnimationFrame(rafRef.current);
      if(slowRigTimer!==null)window.clearTimeout(slowRigTimer);
      bossRef.current?.dispose();bossRef.current=null;
      for(const sound of Object.values(audioRef.current)){sound.pause();sound.src='';}
      audioRef.current={};
    };
  },[scene.boss]);

  const seek=(value:number)=>{
    timelineRef.current.pause();
    timelineRef.current.seek(value);
    setTime(timelineRef.current.time);
    setPlaying(false);
    const video=videoRef.current;
    if(video){video.pause();try{video.currentTime=value%Math.max(video.duration||4,0.5);}catch{}}
  };
  const toggle=()=>{
    if(timelineRef.current.playing){
      timelineRef.current.pause();videoRef.current?.pause();setPlaying(false);
    }else{
      timelineRef.current.play();setPlaying(true);
      void videoRef.current?.play().catch(()=>undefined);
    }
  };
  const updateAtCursor=(track:'camera'|'actor'|'pose'|'lighting',prop:string,number:number|string)=>{
    const current=sceneRef.current;
    const sampled=sampleCinematic(current,timelineRef.current.time);
    // v1 scenes created before pose authoring remain editable: initialize a
    // neutral rest track at t=0 instead of producing a broken keyframe file.
    const initial=track==='pose'
      ? (current.pose??[{time:0,value:{...NEUTRAL_CINEMATIC_POSE}}])
      : current[track];
    const source=(initial as unknown as Array<{time:number;value:Record<string,unknown>;ease?:string}>);
    const nearby=source.findIndex(k=>Math.abs(k.time-timelineRef.current.time)<0.02);
    const keys=source.map(k=>({...k,value:{...k.value}}));
    const val=nearby>=0?{...keys[nearby].value}:{...((sampled[track]??NEUTRAL_CINEMATIC_POSE) as unknown as Record<string,unknown>)};
    val[prop]=number;
    if(nearby>=0)keys[nearby].value=val;
    else keys.push({time:timelineRef.current.time,value:val,ease:'smooth'});
    keys.sort((a,b)=>a.time-b.time);
    loadScene({...current,[track]:keys});
    // Restore playhead after a scene edit.
    timelineRef.current.seek(time);
    setTime(time);
  };

  const adjustDuration=(duration:number)=>{
    const current=sceneRef.current;
    const next=retimeCinematic(current,duration);
    const nextTime=time/current.duration*duration;
    loadScene(next);
    timelineRef.current.seek(nextTime);setTime(nextTime);
  };
  const removeSelectedKeyframe=()=>{
    const current=sceneRef.current;
    const keys=current[editTrack];
    if(!keys||keys.length<=1)return;
    const index=keys.findIndex(k=>k.time>0&&Math.abs(k.time-time)<=0.03);
    if(index<0)return;
    loadScene({...current,[editTrack]:keys.filter((_,i)=>i!==index)});
    timelineRef.current.seek(time);setTime(time);
  };
  const addHardCut=()=>{
    const current=sceneRef.current;
    const at=Number(time.toFixed(2));
    if(at<=0.04 || at>=current.duration-0.04)return;
    const sampled=sampleCinematic(current,at).camera;
    const keys=current.camera.map(k=>({...k,value:{...k.value}}));
    let i=keys.findIndex(k=>Math.abs(k.time-at)<0.015);
    if(i<0){keys.push({time:at,value:{...sampled},ease:'smooth'});keys.sort((a,b)=>a.time-b.time);i=keys.findIndex(k=>k.time===at);}
    if(i>0)keys[i-1].ease='step'; // Exact authored edit, no interpolated orbit through the video plate
    loadScene({...current,camera:keys});
    timelineRef.current.seek(at);setTime(at);
  };
  const addCue=(kind:'drum'|'roar'|'impact'|'vfx'|'subtitle')=>{
    const current=sceneRef.current;
    const at=Number(time.toFixed(2));
    let ordinal=current.cues.length+1;
    while(current.cues.some(c=>c.id==='cue-'+ordinal))ordinal++;
    const cues=[...current.cues,{
      id:'cue-'+ordinal,
      time:at,
      kind,
      ...(kind==='subtitle'?{payload:'NEW CINEMATIC TITLE · Edit below'}:
         kind==='vfx'?{payload:current.boss==='vrikodara'?'blood-furnace':'earth-sunder'}:{})
    }];
    loadScene({...current,cues});
    timelineRef.current.seek(at);
    setTime(at);
  };
  const updateCuePayload=(id:string,payload:string)=>{
    if(payload.length>180)return;
    const current=sceneRef.current;
    const savedTime=time;
    loadScene({...current,cues:current.cues.map(c=>c.id===id?{...c,payload}:c)});
    timelineRef.current.seek(savedTime);
    setTime(savedTime);
  };
  const removeCue=(id:string)=>{
    const current=sceneRef.current;
    loadScene({...current,cues:current.cues.filter(c=>c.id!==id)});
    timelineRef.current.seek(time);
    setTime(time);
  };
  const download=()=>{
    const blob=new Blob([JSON.stringify(scene,null,2)],{type:'application/json'});
    const href=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=href;a.download=scene.id+'.meru.json';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(href),500);
  };
  /** A shareable 960×540 still combines the real MP4 frame (or still poster)
   * with the same boss, ink FX, ash and subtitles drawn by the editor. */
  const captureFrame=async()=>{
    try{
      const foreground=canvasRef.current;
      if(!foreground)throw new Error('No cinematic frame yet');
      const output=document.createElement('canvas');
      output.width=W;output.height=H;
      const context=output.getContext('2d');
      if(!context)throw new Error('PNG capture canvas unavailable');
      context.fillStyle='#090508';context.fillRect(0,0,W,H);
      let painted=false;
      const v=videoRef.current;
      if(v && v.readyState>=2 && v.videoWidth>0){
        try{context.drawImage(v,0,0,W,H);painted=true;}catch{/* Use poster. */}
      }
      if(!painted){
        const image=new Image();image.src=scene.posterUrl;
        try{await image.decode();if(image.naturalWidth>0)context.drawImage(image,0,0,W,H);}
        catch{/* Black background remains visible rather than throwing. */}
      }
      context.drawImage(foreground,0,0,W,H);
      context.save();
      context.font='bold 13px Georgia,serif';context.fillStyle='#ffe7c6';
      context.shadowColor='#030205';context.shadowBlur=9;
      context.fillText('KALIYUGA  ·  '+scene.title,22,30);
      context.restore();
      const blob=await new Promise<Blob|null>(resolve=>output.toBlob(resolve,'image/png'));
      if(!blob)throw new Error('Browser could not encode PNG frame');
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');a.href=url;
      a.download=scene.id+'-'+Math.round(time*1000)+'ms.png';a.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),500);
    }catch(err){setError(err instanceof Error?err.message:'Cannot capture cinematic PNG');}
  };
  const exportFrameReport=()=>{
    const payload={format:'meru-frame-pacing-v1',capturedAt:new Date().toISOString(),
      sceneId:scene.id,graphicsTier:tier,renderer:isSoftwareWebGLRenderer()?'software-webgl':'hardware-or-unknown',
      viewport:{width:window.innerWidth,height:window.innerHeight,dpr:window.devicePixelRatio},
      note:'RAF intervals only; not direct GPU, thermal, memory, or 30-minute soak data',
      frames:frameProbeRef.current.report()};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=scene.id+'-frame-pacing.json';a.click();
    window.setTimeout(()=>URL.revokeObjectURL(url),500);
  };
  const upload=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>1024*1024){setError('Scene JSON exceeds 1 MB');return;}
    try{loadScene(JSON.parse(await file.text()));}
    catch(e){setError(e instanceof Error?e.message:'Invalid JSON');}
  };
  const selected=sampleCinematic(scene,time);
  const previewBudget=GRAPHICS_PRESETS[tier];

  return <main className="min-h-screen bg-[#0b090e] text-[#f0dfc9] px-3 py-6 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[.24em] text-[#da9d60]">Kaliyuga · Meru Engine</div>
          <h1 className="font-serif text-3xl font-bold">Cinematic Studio</h1>
          <p className="text-xs text-[#a99c94]">Editable camera cuts · real skeletal performance keyframes · two original boss rigs</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/meru-story-preview" className="rounded border border-[#9d7957] px-4 py-2 text-sm text-[#f1d3b0] hover:bg-[#20151a]">Preview Preserver film</a>
          <a href="/" className="rounded border border-[#665043] px-4 py-2 text-sm hover:bg-[#20151a]">← Back to game</a>
        </div>
      </header>
      {error&&<div role="alert" className="rounded border border-[#c45b50] bg-[#321b1c] p-3 text-sm">{error}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-[#63472c] bg-[#100c0b]">
            <div className="absolute inset-0 bg-center bg-cover" style={{backgroundImage:'url('+scene.posterUrl+')'}}/>
            <video ref={videoRef} className={'absolute inset-0 w-full h-full object-cover transition-opacity duration-700 '+(videoDecoded?'opacity-100':'opacity-0')} src={scene.backgroundUrl} poster={scene.posterUrl} muted loop playsInline preload="metadata" onLoadedData={()=>setVideoDecoded(true)} onError={()=>setVideoDecoded(false)} data-meru-video-status={videoDecoded?'decoded':'poster'} aria-label="Scene background video"/>
            <canvas ref={canvasRef} width={W} height={H} className="pointer-events-none absolute inset-0 w-full h-full" aria-label="Live cinematic character preview"/>
            <div className="absolute left-4 top-3 text-xs uppercase tracking-widest text-[#edc08d]">Camera A · {scene.title}</div>
            <div className="absolute bottom-3 left-4 rounded bg-black/60 px-2 py-1 text-xs">Preview: {previewBudget.maxCharacterRenderFps} fps rig cap · {Math.round(previewBudget.particleMultiplier*100)}% ash budget</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={toggle} className="rounded bg-[#b86a39] px-5 py-2 text-sm font-semibold text-white">{playing?'Pause':'Play scene'}</button>
            <button onClick={()=>seek(0)} className="rounded border border-[#72533d] px-4 py-2 text-sm">Restart</button>
            <span className="ml-auto font-mono text-sm">{fmt(time)} / {fmt(scene.duration)} s</span>
          </div>
          <input type="range" aria-label="Cinematic scrub timeline" min={0} max={scene.duration} step={0.01} value={time} onChange={e=>seek(Number(e.target.value))} className="w-full accent-[#cc7845]"/>
          <div className="rounded-lg border border-[#43352e] bg-[#151115] p-4">
            <div className="mb-3 flex justify-between"><h2 className="font-semibold">Timeline</h2><span className="text-xs text-[#b49a82]">Camera cuts · FBX body pose · movement · light</span></div>
            {(['camera','actor','pose','lighting'] as const).map(track=><div key={track} className="grid grid-cols-[75px_1fr] items-center gap-2 mb-3">
              <span className="capitalize text-sm text-[#beae9b]">{track}</span>
              <div className="relative h-6 rounded bg-[#30272e]">
                {scene[track]?.map((key,index)=><button key={index} title={track+' at '+fmt(key.time)+'s'} onClick={()=>seek(key.time)}
                  className="absolute top-1 h-4 w-2 -translate-x-1/2 rounded-sm bg-[#e1aa6e] hover:bg-white"
                  style={{left:(key.time/scene.duration*100)+'%'}}/>)}
                <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{left:(time/scene.duration*100)+'%'}}/>
              </div>
            </div>)}
            <button type="button" aria-label="Insert camera cut at playhead" onClick={addHardCut} disabled={time<=0.04||time>=scene.duration-0.04} className="mb-3 rounded border border-[#8c6252] px-3 py-1.5 text-xs text-[#edc0a1] disabled:opacity-40">+ Insert hard camera cut at playhead</button>
            <div className="mb-3 flex flex-wrap gap-2 items-center">
              <label className="text-xs">Edit keyframe track
                <select aria-label="Track for keyframe deletion" value={editTrack} onChange={e=>setEditTrack(e.target.value as typeof editTrack)}
                  className="ml-2 rounded bg-[#30272e] px-2 py-1.5">
                  <option value="camera">Camera</option><option value="actor">Actor</option>
                  <option value="pose">FBX pose</option><option value="lighting">Lighting</option>
                </select>
              </label>
              <button type="button" aria-label="Delete keyframe at playhead" onClick={removeSelectedKeyframe}
                disabled={!(scene[editTrack]?.some(k=>k.time>0&&Math.abs(k.time-time)<=0.03))}
                className="rounded border border-[#814f48] px-3 py-1.5 text-xs text-[#ecc0b2] disabled:opacity-40">Delete selected keyframe</button>
            </div>
            <div className="grid grid-cols-[75px_1fr] items-center gap-2">
              <span className="text-sm text-[#beae9b]">Cues</span>
              <div className="relative h-6 rounded bg-[#30272e]">
                {scene.cues.map(c=><button key={c.id} title={c.kind+' at '+fmt(c.time)+'s'} onClick={()=>seek(c.time)} className="absolute top-1 h-4 w-2 -translate-x-1/2 rounded-sm bg-[#8abcaa]" style={{left:(c.time/scene.duration*100)+'%'}}/>)}
              </div>
            </div>
          </div>
          <p role="status" className="text-xs text-[#bca183]">{status}</p>
          <div role="status" aria-label="Live cinematic frame pacing" className="rounded border border-[#473729] bg-[#151014] px-3 py-2 text-xs text-[#d1ad8e]">Browser frame pacing: {frameReport?.estimatedFps??0} FPS · p95 {frameReport?.p95Ms??0} ms · {frameReport?.sampleCount??0} samples (RAF, not GPU telemetry)</div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-lg border border-[#43352e] bg-[#171216] p-4 space-y-4">
            <h2 className="font-semibold">Inspector · current playhead</h2>
            {([
              {track:'camera' as const,field:'zoom',label:'Camera zoom',min:0.4,max:2.2,step:0.02},
              {track:'camera' as const,field:'x',label:'Camera X',min:-90,max:90,step:1},
              {track:'camera' as const,field:'y',label:'Camera Y',min:-90,max:90,step:1},
              {track:'camera' as const,field:'roll',label:'Camera roll',min:-0.18,max:0.18,step:0.005},
              {track:'camera' as const,field:'shake',label:'Camera shake',min:0,max:1,step:0.02},
              {track:'actor' as const,field:'x',label:'Boss X',min:-110,max:110,step:1},
              {track:'actor' as const,field:'y',label:'Boss Y',min:-90,max:90,step:1},
              {track:'actor' as const,field:'scale',label:'Boss scale',min:0.5,max:2,step:0.02},
              {track:'actor' as const,field:'opacity',label:'Boss opacity',min:0,max:1,step:0.02},
              {track:'lighting' as const,field:'vignette',label:'Vignette',min:0,max:1,step:0.02},
              {track:'lighting' as const,field:'ash',label:'Ash density',min:0,max:1,step:0.02},
              {track:'lighting' as const,field:'warmth',label:'Warmth',min:0,max:1,step:0.02},
              {track:'lighting' as const,field:'exposure',label:'Light exposure',min:0,max:2,step:0.02},
              {track:'pose' as const,field:'rootYaw',label:'3D character facing',min:-0.9,max:0.9,step:0.03},
              {track:'pose' as const,field:'torsoYaw',label:'Spine turn',min:-0.55,max:0.55,step:0.03},
              {track:'pose' as const,field:'torsoLean',label:'Spine lean',min:-0.45,max:0.45,step:0.03},
              {track:'pose' as const,field:'rightArmLift',label:'Weapon-arm lift',min:-0.9,max:0.9,step:0.03},
              {track:'pose' as const,field:'rightElbowBend',label:'Weapon elbow bend',min:-1,max:1,step:0.03},
              {track:'pose' as const,field:'leftArmLift',label:'Off-hand lift',min:-0.9,max:0.9,step:0.03},
            ]).map(c=><label key={c.track+c.field} className="block">
              <span className="mb-1 flex justify-between text-xs"><span>{c.label}</span><span className="font-mono">{fmt(((selected[c.track]??NEUTRAL_CINEMATIC_POSE) as unknown as Record<string,number>)[c.field])}</span></span>
              <input type="range" min={c.min} max={c.max} step={c.step}
                value={((selected[c.track]??NEUTRAL_CINEMATIC_POSE) as unknown as Record<string,number>)[c.field]}
                onChange={e=>updateAtCursor(c.track,c.field,Number(e.target.value))}
                className="w-full accent-[#d18d55]"/>
            </label>)}
            <label className="block text-xs">Boss animation at playhead
              <select aria-label="Boss animation state" value={selected.actor.state}
                onChange={e=>updateAtCursor('actor','state',e.target.value)}
                className="mt-1 block w-full rounded bg-[#2d2529] p-2 text-sm">
                <option value="idle">Idle</option>
                <option value="chase">Movement</option>
                <option value="windup">Windup / anticipation</option>
                <option value="attack">Attack / roar beat</option>
              </select>
            </label>
            <p className="text-xs text-[#967f74]">Editing creates a keyframe at the current playhead. Rig-local upper-body keyframes are applied to the actual FBX skeleton after animation sampling. Full IK, facial and retargeting remain separate work.</p>
          </div>
          <div className="rounded-lg border border-[#43352e] bg-[#171216] p-4 space-y-3">
            <h2 className="font-semibold">Sound and title cues</h2>
            <p className="text-xs text-[#a69081]">Place a cue at the playhead; click an existing cue to jump to it.</p>
            <div className="grid grid-cols-2 gap-2">
              {(['drum','roar','impact','vfx','subtitle'] as const).map(kind=>
                <button key={kind} onClick={()=>addCue(kind)}
                  className="rounded border border-[#6c533e] px-2 py-2 text-xs capitalize hover:bg-[#3d271c]">
                  + {kind}
                </button>)}
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {scene.cues.map(cue=><div key={cue.id} className="flex flex-wrap items-center gap-2 rounded bg-[#30252b] px-2 py-1 text-xs">
                <button onClick={()=>seek(cue.time)} className="min-w-0 flex-1 truncate text-left">
                  {fmt(cue.time)}s · {cue.kind}
                </button>
                {cue.kind==='subtitle'&&<input aria-label={'Cue text '+cue.id} value={cue.payload??''} maxLength={180}
                  onChange={e=>updateCuePayload(cue.id,e.target.value)}
                  className="w-full rounded bg-[#20171b] px-2 py-1 text-xs text-[#f4d6bc]"/>}
                {cue.kind==='vfx'&&<select aria-label={'Cue visual '+cue.id} value={cue.payload??'ward-break'}
                  onChange={e=>updateCuePayload(cue.id,e.target.value)}
                  className="w-full rounded bg-[#20171b] px-2 py-1 text-xs text-[#f4d6bc]">
                    <option value="earth-sunder">Earth-sunder ink impact</option>
                    <option value="blood-furnace">Blood-furnace ember impact</option>
                    <option value="ward-break">Ancient ward-break impact</option>
                  </select>}
                <button aria-label={'Delete cue '+cue.id} title="Remove cue" onClick={()=>removeCue(cue.id)}
                  className="rounded px-2 py-1 text-[#efb7a1] hover:bg-[#67322c]">×</button>
              </div>)}
            </div>
          </div>
          <div className="rounded-lg border border-[#43352e] bg-[#171216] p-4 space-y-3">
            <h2 className="font-semibold">Project and export</h2>
            <label className="block text-xs">Act I boss cinematic
              <select aria-label="Select boss cinematic"
                value={scene.bossPhase && scene.bossPhase>1 ? scene.boss+'-phase'+scene.bossPhase : scene.boss}
                onChange={e=>{
                  const id=e.target.value;
                  const match=/^(dundubhi|vrikodara)-phase([23])$/.exec(id);
                  if(match)loadScene(readBossPhase(match[1] as BossCharacter,Number(match[2]) as 2|3,true));
                  else loadScene(readBossIntro(id as BossCharacter,true));
                }}
                className="mt-1 block w-full rounded bg-[#2d2529] p-2 text-sm">
                <option value="dundubhi">Dundubhi · Chamber IV (Entrance)</option>
                <option value="vrikodara">Vrikodara · Chamber VIII (Entrance)</option>
                <option value="dundubhi-phase2">Dundubhi · Phase II</option>
                <option value="dundubhi-phase3">Dundubhi · Phase III</option>
                <option value="vrikodara-phase2">Vrikodara · Phase II</option>
                <option value="vrikodara-phase3">Vrikodara · Phase III</option>
              </select>
            </label>
            <label className="block text-xs">Graphics target
              <select value={tier} onChange={e=>setTier(e.target.value as GraphicsTier)} className="mt-1 block w-full rounded bg-[#2d2529] p-2 text-sm">
                <option value="lite">Lite</option><option value="balanced">Balanced</option><option value="cinematic">Cinematic</option>
              </select>
            </label>
            <label className="block text-xs">Cinematic duration · {fmt(scene.duration)}s
              <input aria-label="Retime entire scene" type="range" min={3} max={30} step={0.5} value={scene.duration}
                onChange={e=>adjustDuration(Number(e.target.value))}
                className="mt-2 w-full accent-[#d18d55]"/>
              <span className="mt-1 block text-[#967f74]">Retimes camera cuts, joint poses, music, VFX and subtitles together.</span>
            </label>
            <button onClick={download} className="w-full rounded bg-[#8f5434] px-4 py-2 text-sm font-semibold">Export scene JSON</button>
            <button onClick={()=>void captureFrame()} className="w-full rounded border border-[#9d7148] px-4 py-2 text-sm">Capture current frame PNG</button>
            <button onClick={exportFrameReport} className="w-full rounded border border-[#665043] px-4 py-2 text-sm">Export local frame pacing report</button>
            <label className="block text-xs">Import scene JSON (max 1MB)
              <input type="file" accept=".json,.meru.json,application/json" onChange={e=>void upload(e.target.files?.[0])}
                className="mt-2 block w-full text-xs text-[#cdb196]"/>
            </label>
            <button onClick={()=>loadScene(resolveProductionScene(scene.boss,scene.bossPhase??1))} className="w-full rounded border border-[#665043] px-4 py-2 text-sm">Restore shipped scene</button>
            <p className="text-xs text-[#998879]">Changes autosave locally in this browser. To publish an exported .meru.json in the actual game, run <code className="font-mono text-[#edc08d]">npx tsx scripts/meru/install-scenes.ts path/to/scene.meru.json</code> from the repository, review the manifest diff and commit it. A local preview is not automatically shipped to players; production gameplay ignores uncommitted browser drafts.</p>
          </div>
        </aside>
      </div>
      <p className="text-sm text-[#bba899]">The Studio edits original rig animations and cinematic tracks. Publishing requires a separately reviewed production-scene manifest; camera movement remains constrained to the MP4 arena perspective. Bone IK, multi-character animation and facial sync still require further work.</p>
    </div>
  </main>;
}

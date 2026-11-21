'use client';
/**
 * Meru Cinematic Studio — standalone authoring tool for original Kaliyuga assets.
 * Never touches combat state. Scene files are validated, editable and exportable.
 * Live playback uses the EXISTING Boss3DRenderer; no fake placeholder rig.
 */
import {useCallback,useEffect,useRef,useState} from 'react';
import {Boss3DRenderer} from '@/lib/game/boss3dRenderer';
import {GAME_ASSETS} from '@/lib/game/assets';
import {
  createDundubhiScene, MeruTimelinePlayer, sampleCinematic,
  validateCinematic, type MeruCinematic, type BossCharacter,
} from '@/engine/meru/cinematicTimeline';
import {GRAPHICS_PRESETS,type GraphicsTier} from '@/engine/meru/adaptiveQuality';
import {makeMeruBossParams,paintMeruFrame} from '@/engine/meru/cinematicVisuals';
import {meruStorageKey,readBossIntro,defaultBossIntro} from '@/engine/meru/runtimePolicy';

const W=960,H=540;
function fmt(n:number){return Number.isFinite(n)?n.toFixed(2):'0.00';}
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(b,n));}
export default function MeruCinematicStudio(){
  const [scene,setScene]=useState<MeruCinematic>(()=>createDundubhiScene());
  const [time,setTime]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [status,setStatus]=useState('Initializing original Dundubhi rig…');
  const [error,setError]=useState('');
  const [hydrated,setHydrated]=useState(false);
  const [tier,setTier]=useState<GraphicsTier>('balanced');
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

  const loadScene=useCallback((incoming:unknown)=>{
    try{
      const parsed=validateCinematic(incoming);
      sceneRef.current=parsed;
      const next=new MeruTimelinePlayer(parsed);
      timelineRef.current=next;
      setScene(parsed);setTime(0);setPlaying(false);setError('');
      videoRef.current?.pause();
    }catch(e){setError(e instanceof Error?e.message:'Invalid scene file');}
  },[]);

  useEffect(()=>{
    // Hydrate before enabling persistence: otherwise the default scene silently
    // overwrites an existing user's authored camera/lighting keyframes on mount.
    loadScene(readBossIntro('dundubhi'));
    setHydrated(true);
  },[loadScene]);
  useEffect(()=>{
    if(!hydrated)return;
    try{localStorage.setItem(meruStorageKey(scene.boss),JSON.stringify(scene));}
    catch{/* Storage may be disabled */ }
  },[scene,hydrated]);
  useEffect(()=>{
    let disposed=false;
    readyRef.current=false;
    lastRef.current=0;
    setStatus('Initializing original '+scene.boss+' rig…');
    const portrait=new Image();portrait.src=GAME_ASSETS.portraits[scene.boss];portraitRef.current=portrait;
    for(const [kind,url] of Object.entries({drum:GAME_ASSETS.sfx.warDrum,roar:GAME_ASSETS.sfx.bossRoarDeep,impact:GAME_ASSETS.sfx.weaponSmash})){
      const audio=new Audio(url);audio.preload='auto';audioRef.current[kind]=audio;
    }
    try{
      const boss=new Boss3DRenderer(384);
      bossRef.current=boss;
      void boss.waitForBossReady(scene.boss,12000).then(ok=>{
        if(disposed)return;
        readyRef.current=ok;
        setStatus(ok?'Original '+scene.boss+' 3D rig loaded':'Rig unavailable: original portrait fallback');
      }).catch(()=>{if(!disposed)setStatus('Rig loading failed: portrait fallback');});
    }catch{
      setStatus('WebGL unavailable: portrait fallback');
    }
    const loop=(now:number)=>{
      if(disposed)return;
      const dt=lastRef.current?clamp((now-lastRef.current)/1000,0,0.05):0.016;
      lastRef.current=now;
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
        if(readyRef.current&&boss){
          try{boss.updateAndRender(makeMeruBossParams(t,Math.max(0.015,dt),sceneRef.current.boss));}
          catch{readyRef.current=false;setStatus('3D renderer failed: portrait fallback');}
        }
        paintMeruFrame(ctx,t,sceneRef.current,boss,readyRef.current,portraitRef.current);
      }
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
    return ()=>{
      disposed=true;cancelAnimationFrame(rafRef.current);
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
  const updateAtCursor=(track:'camera'|'actor'|'lighting',prop:string,number:number|string)=>{
    const current=sceneRef.current;
    const sampled=sampleCinematic(current,timelineRef.current.time);
    const source=(current[track] as unknown as Array<{time:number;value:Record<string,unknown>;ease?:string}>);
    const nearby=source.findIndex(k=>Math.abs(k.time-timelineRef.current.time)<0.02);
    const keys=source.map(k=>({...k,value:{...k.value}}));
    const val=nearby>=0?{...keys[nearby].value}:{...(sampled[track] as unknown as Record<string,unknown>)};
    val[prop]=number;
    if(nearby>=0)keys[nearby].value=val;
    else keys.push({time:timelineRef.current.time,value:val,ease:'smooth'});
    keys.sort((a,b)=>a.time-b.time);
    loadScene({...current,[track]:keys});
    // Restore playhead after a scene edit.
    timelineRef.current.seek(time);
    setTime(time);
  };

  const addCue=(kind:'drum'|'roar'|'impact'|'subtitle')=>{
    const current=sceneRef.current;
    const at=Number(time.toFixed(2));
    let ordinal=current.cues.length+1;
    while(current.cues.some(c=>c.id==='cue-'+ordinal))ordinal++;
    const cues=[...current.cues,{
      id:'cue-'+ordinal,
      time:at,
      kind,
      ...(kind==='subtitle'?{payload:'NEW CINEMATIC TITLE · Edit the exported scene JSON'}:{})
    }];
    loadScene({...current,cues});
    timelineRef.current.seek(at);
    setTime(at);
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
  const upload=async(file:File|undefined)=>{
    if(!file)return;
    if(file.size>1024*1024){setError('Scene JSON exceeds 1 MB');return;}
    try{loadScene(JSON.parse(await file.text()));}
    catch(e){setError(e instanceof Error?e.message:'Invalid JSON');}
  };
  const selected=sampleCinematic(scene,time);
  const resolution=GRAPHICS_PRESETS[tier].resolutionScale;

  return <main className="min-h-screen bg-[#0b090e] text-[#f0dfc9] px-3 py-6 sm:px-8">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[.24em] text-[#da9d60]">Kaliyuga · Meru Engine</div>
          <h1 className="font-serif text-3xl font-bold">Cinematic Studio</h1>
          <p className="text-xs text-[#a99c94]">Editable, validated scene timeline · two original boss rigs · isolated from combat</p>
        </div>
        <a href="/" className="rounded border border-[#665043] px-4 py-2 text-sm hover:bg-[#20151a]">← Back to game</a>
      </header>
      {error&&<div role="alert" className="rounded border border-[#c45b50] bg-[#321b1c] p-3 text-sm">{error}</div>}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-[#63472c] bg-[#100c0b]">
            <div className="absolute inset-0 bg-center bg-cover" style={{backgroundImage:'url('+scene.posterUrl+')'}}/>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" src={scene.backgroundUrl} poster={scene.posterUrl} muted loop playsInline preload="metadata" aria-label="Scene background video"/>
            <canvas ref={canvasRef} width={W} height={H} className="pointer-events-none absolute inset-0 w-full h-full" aria-label="Live cinematic character preview"/>
            <div className="absolute left-4 top-3 text-xs uppercase tracking-widest text-[#edc08d]">Camera A · {scene.title}</div>
            <div className="absolute bottom-3 left-4 rounded bg-black/60 px-2 py-1 text-xs">Preview quality: {Math.round(resolution*100)}% budget</div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={toggle} className="rounded bg-[#b86a39] px-5 py-2 text-sm font-semibold text-white">{playing?'Pause':'Play scene'}</button>
            <button onClick={()=>seek(0)} className="rounded border border-[#72533d] px-4 py-2 text-sm">Restart</button>
            <span className="ml-auto font-mono text-sm">{fmt(time)} / {fmt(scene.duration)} s</span>
          </div>
          <input type="range" aria-label="Cinematic scrub timeline" min={0} max={scene.duration} step={0.01} value={time} onChange={e=>seek(Number(e.target.value))} className="w-full accent-[#cc7845]"/>
          <div className="rounded-lg border border-[#43352e] bg-[#151115] p-4">
            <div className="mb-3 flex justify-between"><h2 className="font-semibold">Timeline</h2><span className="text-xs text-[#b49a82]">Keyframes: camera · actor · lighting</span></div>
            {(['camera','actor','lighting'] as const).map(track=><div key={track} className="grid grid-cols-[75px_1fr] items-center gap-2 mb-3">
              <span className="capitalize text-sm text-[#beae9b]">{track}</span>
              <div className="relative h-6 rounded bg-[#30272e]">
                {scene[track].map((key,index)=><button key={index} title={track+' at '+fmt(key.time)+'s'} onClick={()=>seek(key.time)}
                  className="absolute top-1 h-4 w-2 -translate-x-1/2 rounded-sm bg-[#e1aa6e] hover:bg-white"
                  style={{left:(key.time/scene.duration*100)+'%'}}/>)}
                <div className="pointer-events-none absolute inset-y-0 w-px bg-white" style={{left:(time/scene.duration*100)+'%'}}/>
              </div>
            </div>)}
            <div className="grid grid-cols-[75px_1fr] items-center gap-2">
              <span className="text-sm text-[#beae9b]">Cues</span>
              <div className="relative h-6 rounded bg-[#30272e]">
                {scene.cues.map(c=><button key={c.id} title={c.kind+' at '+fmt(c.time)+'s'} onClick={()=>seek(c.time)} className="absolute top-1 h-4 w-2 -translate-x-1/2 rounded-sm bg-[#8abcaa]" style={{left:(c.time/scene.duration*100)+'%'}}/>)}
              </div>
            </div>
          </div>
          <p role="status" className="text-xs text-[#bca183]">{status}</p>
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
            ]).map(c=><label key={c.track+c.field} className="block">
              <span className="mb-1 flex justify-between text-xs"><span>{c.label}</span><span className="font-mono">{fmt((selected[c.track] as unknown as Record<string,number>)[c.field])}</span></span>
              <input type="range" min={c.min} max={c.max} step={c.step}
                value={(selected[c.track] as unknown as Record<string,number>)[c.field]}
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
            <p className="text-xs text-[#967f74]">Editing creates a keyframe at the current playhead. Bone-level posing still requires additional tooling.</p>
          </div>
          <div className="rounded-lg border border-[#43352e] bg-[#171216] p-4 space-y-3">
            <h2 className="font-semibold">Sound and title cues</h2>
            <p className="text-xs text-[#a69081]">Place a cue at the playhead; click an existing cue to jump to it.</p>
            <div className="grid grid-cols-2 gap-2">
              {(['drum','roar','impact','subtitle'] as const).map(kind=>
                <button key={kind} onClick={()=>addCue(kind)}
                  className="rounded border border-[#6c533e] px-2 py-2 text-xs capitalize hover:bg-[#3d271c]">
                  + {kind}
                </button>)}
            </div>
            <div className="max-h-36 space-y-1 overflow-y-auto">
              {scene.cues.map(cue=><div key={cue.id} className="flex items-center gap-2 rounded bg-[#30252b] px-2 py-1 text-xs">
                <button onClick={()=>seek(cue.time)} className="min-w-0 flex-1 truncate text-left">
                  {fmt(cue.time)}s · {cue.kind}
                </button>
                <button aria-label={'Delete cue '+cue.id} title="Remove cue" onClick={()=>removeCue(cue.id)}
                  className="rounded px-2 py-1 text-[#efb7a1] hover:bg-[#67322c]">×</button>
              </div>)}
            </div>
          </div>
          <div className="rounded-lg border border-[#43352e] bg-[#171216] p-4 space-y-3">
            <h2 className="font-semibold">Project and export</h2>
            <label className="block text-xs">Act I boss cinematic
              <select aria-label="Select boss cinematic" value={scene.boss}
                onChange={e=>loadScene(readBossIntro(e.target.value as BossCharacter))}
                className="mt-1 block w-full rounded bg-[#2d2529] p-2 text-sm">
                <option value="dundubhi">Dundubhi · Chamber IV</option>
                <option value="vrikodara">Vrikodara · Chamber VIII</option>
              </select>
            </label>
            <label className="block text-xs">Graphics target
              <select value={tier} onChange={e=>setTier(e.target.value as GraphicsTier)} className="mt-1 block w-full rounded bg-[#2d2529] p-2 text-sm">
                <option value="lite">Lite</option><option value="balanced">Balanced</option><option value="cinematic">Cinematic</option>
              </select>
            </label>
            <button onClick={download} className="w-full rounded bg-[#8f5434] px-4 py-2 text-sm font-semibold">Export scene JSON</button>
            <label className="block text-xs">Import scene JSON (max 1MB)
              <input type="file" accept=".json,.meru.json,application/json" onChange={e=>void upload(e.target.files?.[0])}
                className="mt-2 block w-full text-xs text-[#cdb196]"/>
            </label>
            <button onClick={()=>loadScene(defaultBossIntro(scene.boss))} className="w-full rounded border border-[#665043] px-4 py-2 text-sm">Restore original scene</button>
            <p className="text-xs text-[#998879]">Changes autosave locally in this browser. Import/export never changes your combat saves.</p>
          </div>
        </aside>
      </div>
      <p className="text-sm text-[#bba899]">This is a real-asset cinematic editor foundation, not a finished AAA filmmaking suite. Camera movement is intentionally restricted to the MP4 background's safe perspective.</p>
    </div>
  </main>;
}

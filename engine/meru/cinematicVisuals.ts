/**
 * Shared real-asset cinematic rendering between Meru Studio and in-game playback.
 * Film-frame overlays are intentionally 2.5D, matching the painted/MP4 arena camera.
 * No fake geometry and no camera orbit around a prerecorded video plate.
 */
import type { Boss3DRenderer, Boss3DUpdateParams } from '@/lib/game/boss3dRenderer';
import type { CinematicFrame, MeruCinematic } from './cinematicTimeline';

export const MERU_FRAME_WIDTH = 960;
export const MERU_FRAME_HEIGHT = 540;
const W=MERU_FRAME_WIDTH,H=MERU_FRAME_HEIGHT;
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

export function makeMeruBossParams(frame:CinematicFrame,dt:number,kind:'dundubhi'|'vrikodara'):Boss3DUpdateParams {
  return {
    kind,
    dt: clamp(dt,0.001,0.04), vx:0,vy:0,facing:-1,
    aimAngle:Math.PI*0.1,aiState:frame.actor.state,
    attackKind:'shockwave',attackPattern:4,
    windupProgress:frame.actor.state==='windup'?clamp((frame.time-3.4)/1.6,0,1):0,
    phase:1,armorCracked:false,isPostureBroken:false,isHitFlash:false,bypassSoftwareThrottle:false,
  };
}
export function paintMeruFrame(
  ctx:CanvasRenderingContext2D,
  frame:CinematicFrame,
  scene:MeruCinematic,
  boss:Boss3DRenderer|null,
  ready:boolean,
  portrait:HTMLImageElement|null,
  particleMultiplier=1
){
  ctx.clearRect(0,0,W,H);
  const shake=frame.camera.shake;
  const dx=Math.sin(frame.time*82)*shake*7;
  const dy=Math.cos(frame.time*101)*shake*5;
  ctx.save();
  ctx.translate(W/2+frame.camera.x+dx,H/2+frame.camera.y+dy);
  ctx.rotate(frame.camera.roll);
  ctx.scale(frame.camera.zoom,frame.camera.zoom);
  ctx.translate(-W/2,-H/2);
  ctx.globalAlpha=frame.actor.opacity;
  const bw=400*frame.actor.scale,bh=440*frame.actor.scale;
  const x=W/2-bw/2+frame.actor.x;
  const y=H-bh-52+frame.actor.y;
  if(ready && boss?.canvas.width){
    ctx.drawImage(boss.canvas,x,y,bw,bh);
  } else if(portrait?.complete && portrait.naturalWidth>0){
    ctx.drawImage(portrait,x+50,y+30,bw-100,bh-80);
  }
  ctx.restore();

  // Deterministic atmosphere: no per-frame allocations for new image textures.
  for(let i=0;i<Math.round(40*clamp(particleMultiplier,0.15,1));i++){
    const ax=((i*179.93+Math.sin(i*2.3+frame.time*0.4)*13)%W+W)%W;
    const ay=((i*47.6-frame.time*(8+i%6*3))%H+H)%H;
    ctx.fillStyle='rgba(255,165,82,'+(0.05+0.30*frame.lighting.ash*(i%5)/4)+')';
    ctx.beginPath();ctx.arc(ax,ay,i%9===0?2:1,0,2*Math.PI);ctx.fill();
  }

  ctx.save();
  ctx.globalAlpha=clamp(frame.lighting.vignette,0,1);
  const vignette=ctx.createRadialGradient(W/2,H*0.49,130,W/2,H*0.49,590);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(8,3,10,0.91)');
  ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  ctx.restore();

  // Art-directable scene exposure: a restrained color-grade pass that applies
  // equally to imported MP4 and the overlaid rig, without full-screen bloom.
  const exposureDelta=clamp(frame.lighting.exposure-1,-1,2);
  ctx.save();
  if(exposureDelta>=0){
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle='rgba(252,216,172,'+clamp(exposureDelta*0.20,0,0.24)+')';
  } else {
    ctx.fillStyle='rgba(5,4,12,'+clamp(-exposureDelta*0.32,0,0.30)+')';
  }
  ctx.fillRect(0,0,W,H);
  ctx.restore();
  ctx.save();ctx.globalCompositeOperation='screen';
  ctx.fillStyle='rgba(236,103,34,'+clamp((frame.lighting.warmth-0.5)*0.15,0,0.14)+')';
  ctx.fillRect(0,0,W,H);ctx.restore();

  const titleCue=scene.cues.find(c=>c.kind==='subtitle'&&c.time<=frame.time);
  if(titleCue && titleCue.payload){
    const alpha=clamp((frame.time-titleCue.time)/0.55,0,1);
    const pieces=titleCue.payload.split('·',2).map(s=>s.trim());
    ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';
    ctx.shadowBlur=12;ctx.shadowColor='#020101';
    ctx.fillStyle='#ffe4ac';ctx.font='bold 50px Georgia,serif';
    ctx.fillText(pieces[0].slice(0,30),W/2,H-115);
    if(pieces[1]){
      ctx.fillStyle='#e9ad79';ctx.font='17px Georgia,serif';
      ctx.fillText(pieces[1].slice(0,60),W/2,H-85);
    }
    ctx.restore();
  }
}

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

export function makeMeruBossParams(frame:CinematicFrame,dt:number,kind:'dundubhi'|'vrikodara',phase:1|2|3=1):Boss3DUpdateParams {
  return {
    kind,
    dt: clamp(dt,0.001,0.04), vx:0,vy:0,facing:-1,
    aimAngle:Math.PI*0.1,aiState:frame.actor.state,
    attackKind:'shockwave',attackPattern:4,
    windupProgress:frame.actor.state==='windup'?clamp(phase>1?(frame.time-0.8)/1.3:(frame.time-3.4)/1.6,0,1):0,
    phase,armorCracked:phase>1,isPostureBroken:false,isHitFlash:false,bypassSoftwareThrottle:false,
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
  // More deliberate boss scale in a widescreen cinematic: the original 400x440
  // compositing box left these huge mythic opponents too small to read.
  const bw=480*frame.actor.scale,bh=530*frame.actor.scale;
  const x=W/2-bw/2+frame.actor.x;
  const y=H-bh-52+frame.actor.y;
  // Anchored ambient/contact shadows sell weight against a flat arena MP4
  // without inventing unsupported ground mesh, parallax or ray-traced light.
  ctx.save();
  ctx.translate(x+bw*0.5,y+bh-3);
  ctx.scale(1,0.28);
  const contact=ctx.createRadialGradient(0,0,bw*0.03,0,0,bw*0.44);
  contact.addColorStop(0,'rgba(0,0,0,0.78)');
  contact.addColorStop(0.5,'rgba(0,0,0,0.38)');
  contact.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=clamp(frame.actor.opacity,0,1);
  ctx.fillStyle=contact;
  ctx.beginPath();
  ctx.ellipse(0,0,bw*0.44,bw*0.44,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
  if(ready && boss?.canvas.width){
    ctx.drawImage(boss.canvas,x,y,bw,bh);
  } else if(portrait?.complete && portrait.naturalWidth>0){
    ctx.drawImage(portrait,x+50,y+30,bw-100,bh-80);
  }
  ctx.restore();

  // Cue-locked animation. The camera transform is exactly the one used for the
  // boss above: rings, ink lashes and hot debris stay attached to its feet as
  // authored camera moves zoom or shake. No giant composited square textures.
  const activeImpactCues=scene.cues.filter(c=>c.kind==='vfx'&&frame.time>=c.time&&frame.time<c.time+0.8);
  for(const cue of activeImpactCues){
    const age=frame.time-cue.time;
    const life=clamp(1-age/0.8,0,1);
    const rise=1-life;
    const furnace=cue.payload==='blood-furnace';
    const sunder=cue.payload==='earth-sunder';
    const color=furnace?'255,96,43':sunder?'252,81,101':'250,195,118';
    const worldX=W/2+frame.actor.x;
    const worldY=H-52+frame.actor.y;
    const bloom=frame.actor.scale;
    ctx.save();
    ctx.translate(W/2+frame.camera.x+dx,H/2+frame.camera.y+dy);
    ctx.rotate(frame.camera.roll);
    ctx.scale(frame.camera.zoom,frame.camera.zoom);
    ctx.translate(-W/2,-H/2);
    ctx.globalCompositeOperation='screen';
    // Four elliptical ground waves expand outward from the same plane as the boss.
    for(let ring=0;ring<4;ring++){
      const r=(24+ring*19+rise*(118+ring*14))*bloom;
      ctx.strokeStyle='rgba('+color+',1)';
      ctx.globalAlpha=clamp(life*(0.62-ring*0.12),0,1);
      ctx.lineWidth=(6-ring*1.1)*bloom;
      ctx.beginPath();
      ctx.ellipse(worldX,worldY,r,r*0.26,0,0,Math.PI*2);
      ctx.stroke();
    }
    // Ink-edged vertical cuts echo a hand-drawn anime impact, rather than a
    // physically implausible neon full-screen flash. The strokes are bounded.
    for(let slash=0;slash<5;slash++){
      const direction=slash%2===0?1:-1;
      const swing=(slash-2)*38*bloom;
      const bottomX=worldX+swing;
      const bottomY=worldY-11*bloom;
      const reach=(80+slash%3*23+rise*50)*bloom;
      ctx.globalAlpha=life*(0.37+(slash%2)*0.1);
      ctx.strokeStyle='rgba('+color+',1)';
      ctx.lineWidth=(7-slash*0.9)*bloom;
      ctx.beginPath();
      ctx.moveTo(bottomX,bottomY);
      ctx.quadraticCurveTo(bottomX+direction*reach*0.9,bottomY-reach*0.6,bottomX+direction*reach*0.55,bottomY-reach*1.4);
      ctx.stroke();
      ctx.lineWidth=1.2*bloom;
      ctx.strokeStyle='rgba(255,235,196,1)';
      ctx.stroke();
    }
    // Fire/earth fragments have deterministic paths, preserving frame-to-frame
    // continuity on M3 Air and software WebGL test runners.
    for(let i=0;i<20;i++){
      const theta=i*2.399963;
      const dxShard=Math.cos(theta)*(16+i%5*15+rise*75)*bloom;
      const dyShard=Math.sin(theta)*(12+i%4*10+rise*70)*bloom;
      const px=worldX+dxShard;
      const py=worldY-48*bloom-dyShard-rise*34*bloom;
      ctx.globalAlpha=life*(0.42+(i%3)*0.12);
      ctx.fillStyle=i%4===0?'#fff2cc':'rgba('+color+',1)';
      ctx.beginPath();
      ctx.moveTo(px,py);
      ctx.lineTo(px+Math.cos(theta)*10*bloom,py-13*bloom);
      ctx.lineTo(px-3*bloom,py+5*bloom);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // A narrow beat flash is allowed; avoid opaque full-frame bloom or cropped
    // offscreen quads that previously caused obvious orange rectangles.
    ctx.save();
    ctx.globalCompositeOperation='screen';
    ctx.fillStyle='rgba('+color+','+(clamp((1-age/0.15)*0.09,0,0.09))+')';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

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

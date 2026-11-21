/**
 * Meru portal art direction: lightweight Canvas2D effects layered over existing
 * painted/MP4 arenas; no expensive renderer, dynamic 3D light, or asset download.
 * Uses deterministic time-based effects so exits remain readable.
 */
export type MeruPortalStyle = 'deva' | 'warden' | 'vaitarani';
export interface PortalVisual {
  kind:MeruPortalStyle;
  x:number;
  y:number;
  size:number;
  unlocked:boolean;
  timeMs:number;
  intensity?:number;
}
export function portalPalette(kind:MeruPortalStyle){
  if(kind==='warden')return {core:'#ff524f',edge:'#6c1028',spark:'#f4a18d'};
  if(kind==='vaitarani')return {core:'#8ccfd1',edge:'#123948',spark:'#a6dfe2'};
  return {core:'#ffd16d',edge:'#79501e',spark:'#fff2c8'};
}
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function renderMeruPortal(ctx:CanvasRenderingContext2D,opts:PortalVisual){
  const {kind,x,y,size,unlocked,timeMs}=opts;
  if (![x,y,size,timeMs].every(Number.isFinite)||size<=0)return;
  const colors=portalPalette(kind);
  const t=timeMs*0.001;
  const open=unlocked?1:0.17;
  const strength=clamp(opts.intensity??1,0,1.5)*open;
  const pulse=0.88+0.12*Math.sin(t*2.4);
  ctx.save();
  ctx.translate(x,y);
  // All energy stays within the gate's stone aperture. The architectural arch sprite
  // is rendered after this pass, so it visually occludes the portal itself.
  ctx.scale(1,0.87);
  const width=size*0.48, height=size*0.80;
  const gradient=ctx.createRadialGradient(0,-height*0.25,1,0,-height*0.20,height*0.93);
  gradient.addColorStop(0,colors.core);
  gradient.addColorStop(0.45,colors.edge);
  gradient.addColorStop(1,'rgba(8,4,10,0)');
  ctx.globalAlpha=0.45*strength*pulse;
  ctx.fillStyle=gradient;
  ctx.beginPath();
  ctx.ellipse(0,-height*0.25,width,height,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;
  // Fine concentric rune rings; low alpha and low line count for low-end machines.
  for(let ring=0;ring<3;ring++){
    const phase=t*(ring%2===0?0.5:-0.35)+ring*1.82;
    const rx=width*(0.49+ring*0.22);
    const ry=height*(0.49+ring*0.17);
    ctx.strokeStyle=colors.core;
    ctx.globalAlpha=strength*pulse*(unlocked?0.38:0.1)/(ring*0.35+1);
    ctx.lineWidth=1.6-ring*0.25;
    ctx.beginPath();
    ctx.ellipse(0,-height*0.2,rx,ry,phase*0.04,phase,phase+Math.PI*1.52);
    ctx.stroke();
  }
  // Deterministic embers, NOT Math.random, so frame pacing remains stable.
  if(unlocked){
    ctx.fillStyle=colors.spark;
    for(let i=0;i<14;i++){
      const seed=i*2.39996;
      const py=((i*0.139+t*(0.055+i%3*0.012))%1);
      const px=Math.sin(seed+t*0.7)*(width*0.90)*(1-py*0.32);
      ctx.globalAlpha=strength*0.72*(1-py);
      ctx.beginPath();
      ctx.arc(px,-py*height*1.45,1.0+(i%3)*0.40,0,Math.PI*2);
      ctx.fill();
    }
  }
  ctx.restore();
}
/** Standardized portal traversal identity; used by cinematic and game gates. */
export interface PortalTransition {
  style:MeruPortalStyle;
  destination:string;
  elapsed:number;
  duration:number;
  state:'opening'|'entering'|'loading'|'revealing'|'finished';
}
export function beginPortalTransition(style:MeruPortalStyle,destination:string,duration=1.6):PortalTransition{
  if(!destination||destination.length>160||duration<0.6||duration>5||!Number.isFinite(duration))throw new Error('Invalid destination or duration');
  return {style,destination,elapsed:0,duration,state:'opening'};
}
export function advancePortalTransition(transition:PortalTransition,dt:number,ready:boolean):PortalTransition{
  if(!Number.isFinite(dt)||dt<=0)return transition;
  if(transition.state==='finished')return transition;
  // Hold at loading midpoint until next chamber background is ready.
  const hold=transition.duration*0.62;
  const elapsed=transition.state==='loading'&&!ready
    ?transition.elapsed
    :Math.min(transition.duration,transition.elapsed+Math.min(dt,0.25));
  if(elapsed>=hold&&!ready)return {...transition,elapsed:hold,state:'loading'};
  let state:PortalTransition['state']='opening';
  if(elapsed>=transition.duration)state='finished';
  else if(elapsed>=hold)state='revealing';
  else if(elapsed>=transition.duration*0.25)state='entering';
  return {...transition,elapsed,state};
}

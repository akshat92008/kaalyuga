/**
 * Runtime Parashu trace: follow the sampled, posed weapon instead of showing a
 * detached world-space crescent. No hitboxes, damage or animation timing change.
 *
 * Rendering remains lightweight and localized: at most 14 samples and three
 * closed painterly ribbons drawn into the existing world-space canvas.
 */
export type BladeTrailElement = 'agni' | 'vayu' | 'vajra' | 'varuna';
export interface BladeTrailPoint { x: number; y: number; timeSec: number; }
export interface BladeTrailState {
  attackSerial: number;
  element: BladeTrailElement;
  heavy: boolean;
  samples: BladeTrailPoint[];
}
export interface BladeTrailFrame {
  attackSerial: number;
  timeSec: number;
  isAttacking: boolean;
  heavy: boolean;
  element: BladeTrailElement;
  bladePoint?: { x: number; y: number } | null;
}

export function createBladeTrailState(): BladeTrailState {
  return { attackSerial: -1, element: 'agni', heavy: false, samples: [] };
}

export function sampleParashuTrail(state: BladeTrailState, frame: BladeTrailFrame): BladeTrailState {
  const time = frame.timeSec;
  if (!Number.isFinite(time)) return state;
  const switched = frame.attackSerial !== state.attackSerial;
  const previous = switched ? [] : state.samples;
  // Limit trailing edge to ~110-160 ms. A large persistent sword halo
  // smothers enemies and recreates the earlier detached crescent problem.
  const maxAge = frame.heavy ? 0.19 : 0.145;
  const points = previous.filter(p => time >= p.timeSec && time - p.timeSec <= maxAge);
  const next: BladeTrailState = {
    attackSerial: frame.attackSerial,
    element: frame.element,
    heavy: frame.heavy,
    samples: points,
  };
  if (!frame.isAttacking || !frame.bladePoint) return next;
  const { x, y } = frame.bladePoint;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return next;
  const last = points[points.length - 1];
  if (last) {
    const distance = Math.hypot(x - last.x, y - last.y);
    if (distance < 2.2) return next; // ignore quantized sprite jitter
    if (distance > 125 || time - last.timeSec > 0.11) {
      // Teleport/chamber transition, pose jump, or animation cache miss:
      // never draw a long straight slab across the arena.
      next.samples = [];
    }
  }
  next.samples = [...next.samples, {x, y, timeSec:time}].slice(-14);
  return next;
}

export function visibleTrailLength(state: BladeTrailState): number {
  let distance = 0;
  for (let i=1;i<state.samples.length;i++) {
    distance += Math.hypot(
      state.samples[i].x-state.samples[i-1].x,
      state.samples[i].y-state.samples[i-1].y
    );
  }
  return distance;
}

type ColorTheme = {ink:string; middle:string; hot:string; accent:string};
const PALETTES: Record<BladeTrailElement,ColorTheme> = {
  agni: {ink:'#150508',middle:'#ed4416',hot:'#ffe5a4',accent:'#ff9d25'},
  vayu: {ink:'#061b16',middle:'#08a764',hot:'#ceffe4',accent:'#4bffad'},
  vajra: {ink:'#11142d',middle:'#5cbff2',hot:'#f4fbff',accent:'#c7d0ff'},
  varuna: {ink:'#06192e',middle:'#148fc9',hot:'#d8ffff',accent:'#47ecf1'},
};

/** Build one ordered, tapered brush contour. No full-circle topology. */
export function ribbonContour(
  points: BladeTrailPoint[],
  baseWidth: number,
  nowSec: number,
  lifeSec: number
): {outer:Array<{x:number;y:number}>;inner:Array<{x:number;y:number}>} {
  const outer:Array<{x:number;y:number}>=[];
  const inner:Array<{x:number;y:number}>=[];
  const count=points.length;
  for(let i=0;i<count;i++){
    const p=points[i];
    const a=points[Math.max(0,i-1)];
    const b=points[Math.min(count-1,i+1)];
    const dx=b.x-a.x;
    const dy=b.y-a.y;
    const mag=Math.max(0.001,Math.hypot(dx,dy));
    const u=i/Math.max(1,count-1);
    const aging=Math.max(0,Math.min(1,1-(nowSec-p.timeSec)/Math.max(0.03,lifeSec)));
    const tip=Math.pow(Math.max(0,Math.sin(Math.PI*(0.025+u*0.95))),0.66);
    // Uneven ink edges, but no random frame-to-frame flicker.
    const ripple=0.90+0.075*Math.sin(i*2.53+count*0.37);
    const width=baseWidth*tip*aging*ripple;
    const nx=-dy/mag,ny=dx/mag;
    outer.push({x:p.x+nx*width,y:p.y+ny*width});
    inner.push({x:p.x-nx*width,y:p.y-ny*width});
  }
  return {outer,inner};
}

function fillContour(
  ctx:CanvasRenderingContext2D,
  pts:BladeTrailPoint[],
  width:number,
  now:number,
  age:number,
  color:string,
  alpha:number
):void {
  const shape=ribbonContour(pts,width,now,age);
  if(shape.outer.length<3)return;
  ctx.beginPath();
  ctx.moveTo(shape.outer[0].x,shape.outer[0].y);
  for(let i=1;i<shape.outer.length;i++)ctx.lineTo(shape.outer[i].x,shape.outer[i].y);
  for(let i=shape.inner.length-1;i>=0;i--)ctx.lineTo(shape.inner[i].x,shape.inner[i].y);
  ctx.closePath();
  ctx.globalAlpha=alpha;
  ctx.fillStyle=color;
  ctx.fill();
}

/** Called AFTER the Rudra sprite at world coordinates and BEFORE HUD painting. */
export function drawParashuMotionTrail(
  ctx:CanvasRenderingContext2D,
  state:BladeTrailState,
  nowSec:number,
  reducedMotion=false
):boolean {
  if(reducedMotion||state.samples.length<3||visibleTrailLength(state)<12)return false;
  const last=state.samples[state.samples.length-1];
  if(nowSec-last.timeSec>0.18)return false;
  const colors=PALETTES[state.element];
  const age=state.heavy?0.19:0.145;
  const fade=Math.min(1,visibleTrailLength(state)/42)
    *Math.max(0,Math.min(1,(0.18-(nowSec-last.timeSec))/0.18));
  if(fade<=0.01)return false;
  const base=state.heavy?14:8.5;
  ctx.save();
  // No shadowBlur, no full-screen overlay, no expensive offscreen canvas.
  fillContour(ctx,state.samples,base+4,nowSec,age,colors.ink,0.78*fade);
  fillContour(ctx,state.samples,base,nowSec,age,colors.middle,0.82*fade);
  fillContour(ctx,state.samples,Math.max(2,base*0.22),nowSec,age,colors.hot,0.90*fade);
  // A few small forward-pointing brush licks, proportional to real motion.
  // Unlike orbiting particles, every tongue inherits the tangent of the blade.
  if(state.heavy&&state.samples.length>=6){
    for(let i=2;i<state.samples.length-2;i+=3){
      const p=state.samples[i],b=state.samples[i+1];
      const dx=b.x-p.x,dy=b.y-p.y;
      const d=Math.hypot(dx,dy);
      if(d<3)continue;
      const nx=-dy/d,ny=dx/d,scale=6+3*Math.sin(i*2);
      ctx.beginPath();
      ctx.moveTo(p.x+nx*2.5,p.y+ny*2.5);
      ctx.lineTo(p.x+nx*scale-dx*0.35,p.y+ny*scale-dy*0.35);
      ctx.lineTo(b.x+nx*1.2,b.y+ny*1.2);
      ctx.closePath();
      ctx.globalAlpha=0.53*fade;
      ctx.fillStyle=colors.accent;
      ctx.fill();
    }
  }
  ctx.restore();
  return true;
}

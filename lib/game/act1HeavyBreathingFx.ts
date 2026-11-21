/**
 * Kaliyuga Act I: genuinely blade-sourced, larger anime-inspired heavy
 * breathing silhouettes. Each ribbon is born ON a sampled cutting edge.
 *
 * This is PURE presentation geometry; real Parashu model animation remains
 * authoritative. No damage, hitbox, input or camera changes occur here.
 */
import type { WeaponTrailSample } from './act1WeaponPoseTrail';

export type Act1HeavyBreathingStance = 'smash'|'pillar'|'thrust';

export interface Act1HeavyBreathingPalette {
  soot: string;
  ember: string;
  pigment: string;
  hot: string;
  rim: string;
}
export interface Act1HeavyBreathingFlame {
  root: {x:number;y:number};
  leftBase: {x:number;y:number};
  rightBase: {x:number;y:number};
  bendOut: {x:number;y:number};
  bendIn: {x:number;y:number};
  tip: {x:number;y:number};
  opacity: number;
  width: number;
  reach: number;
  t: number;
}
const INK: Record<Act1HeavyBreathingStance,Act1HeavyBreathingPalette> = {
  smash: {soot:'#210914',ember:'#e4381f',pigment:'#ff8b26',hot:'#fff1b6',rim:'#ff501e'},
  pillar: {soot:'#061c1b',ember:'#03766c',pigment:'#34efab',hot:'#f3ffcc',rim:'#47ffbb'},
  thrust: {soot:'#07162b',ember:'#295ac1',pigment:'#3cd5fd',hot:'#f0f9ff',rim:'#a87aff'},
};
export function act1HeavyBreathingPalette(stance:Act1HeavyBreathingStance):Act1HeavyBreathingPalette {
  return INK[stance];
}
const clamp=(x:number,a:number,b:number):number=>Number.isFinite(x)?Math.max(a,Math.min(b,x)):a;

/**
 * The outer flame may reach 145px at maximum focus, with its root fixed at
 * an authentic blade sample. It grows *from* the swing, never as an unrelated
 * screen-fixed circular arc or an effect placed in front of Rudra.
 *
 * Works even with two physical sample points. Poses with no meaningful
 * movement remain silent rather than inventing a swing.
 */
export function buildAct1HeavyBladeFlames(
  samples: readonly WeaponTrailSample[],
  opts:{
    stance:Act1HeavyBreathingStance;
    focus:number;
    alpha:number;
    action:'heavy_unleash'|'execute';
  }
):Act1HeavyBreathingFlame[] {
  if (!samples || samples.length<2 || opts.alpha<=0.02) return [];
  const focus=clamp(opts.focus,0,4);
  const alpha=clamp(opts.alpha,0,1);
  const valid=samples.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&Number.isFinite(s.atMs));
  if(valid.length<2)return [];
  // Keep the hottest filaments near the leading edge, rather than filling
  // the entire chamber with old disconnected flame particles.
  const source=valid.slice(-5);
  const flames:Act1HeavyBreathingFlame[]=[];
  for(let i=1;i<source.length;i++){
    const prev=source[i-1],cur=source[i];
    const dx=cur.x-prev.x,dy=cur.y-prev.y;
    const len=Math.hypot(dx,dy);
    if(len<1.8||len>74)continue;
    const ux=dx/len,uy=dy/len;
    const nx=-uy,ny=ux;
    const age=(i)/(source.length-1);
    // 58px at 0 focus, up to 145px when fully charged.
    const reach=Math.min(145,(58+focus*18)*(0.72+0.28*age)*
      (opts.action==='execute'?0.88:1));
    const width=Math.min(30,9+focus*3.2+age*4);
    const sides: Array<-1|1>=opts.stance==='thrust'?[1,-1]:[-1,1];
    for(const side of sides){
      const sideReach=side===1?1:0.62;
      const r=reach*sideReach;
      const root={x:cur.x,y:cur.y}; // exact measured blade vertex
      const tip={
        x:cur.x+ux*r*0.27+nx*side*r*0.91,
        y:cur.y+uy*r*0.27+ny*side*r*0.91,
      };
      const bendOut={
        x:cur.x+ux*r*0.48+nx*side*r*0.57,
        y:cur.y+uy*r*0.48+ny*side*r*0.57,
      };
      const bendIn={
        x:cur.x-ux*r*0.12+nx*side*r*0.28,
        y:cur.y-uy*r*0.12+ny*side*r*0.28,
      };
      flames.push({
        root,tip,bendOut,bendIn,reach:r,
        leftBase:{x:root.x+nx*width*0.42,y:root.y+ny*width*0.42},
        rightBase:{x:root.x-nx*width*0.42,y:root.y-ny*width*0.42},
        width,
        t:age,
        opacity:alpha*(0.18+0.40*age)*(side===1?1:0.68),
      });
    }
  }
  return flames.slice(-8);
}

export function getAct1HeavyContactSpectacle(stance:Act1HeavyBreathingStance,focus:number):{
  energyRadius:number;shockwaveRadius:number; sparkCount:number;
  palette:'hinokami'|'wind'|'thunder';
  duration:number;
} {
  const f=clamp(focus,0,4);
  return {
    energyRadius:Math.min(170,100+f*17.5),
    shockwaveRadius:Math.min(195,132+f*15.5),
    sparkCount:Math.round(13+f*4),
    palette:stance==='pillar'?'wind':stance==='thrust'?'thunder':'hinokami',
    duration:Math.min(0.48,0.27+f*0.045),
  };
}

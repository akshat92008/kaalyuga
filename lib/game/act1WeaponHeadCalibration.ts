/**
 * Geometry-derived cutting edge marker for the canonical Parashu.
 * The shaft endpoint with the greatest distance from FBX origin may be the
 * POMMEL. Compare transverse widths near both ends to select the broad blade
 * head, then choose an actual surface vertex on that end.
 */
export type WeaponAxis = 'x' | 'y' | 'z';
export interface WeaponVertex3 { x:number; y:number; z:number }
export interface ParashuBladeHeadCalibration {
  point:WeaponVertex3;
  shaftAxis:WeaponAxis;
  headEnd:'positive'|'negative';
  headWidth:number;
  pommelWidth:number;
  sampledVertices:number;
}
const AXES:WeaponAxis[]=['x','y','z'];
export function calibrateParashuBladeHead(vertices:WeaponVertex3[]):ParashuBladeHeadCalibration|null {
  const safe=vertices.filter(v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y)&&Number.isFinite(v.z));
  if(safe.length<8)return null;
  const lo:Record<WeaponAxis,number>={x:Infinity,y:Infinity,z:Infinity};
  const hi:Record<WeaponAxis,number>={x:-Infinity,y:-Infinity,z:-Infinity};
  for(const v of safe)for(const a of AXES){lo[a]=Math.min(lo[a],v[a]);hi[a]=Math.max(hi[a],v[a]);}
  const shaftAxis=AXES.reduce((best,a)=>hi[a]-lo[a]>hi[best]-lo[best]?a:best,'x' as WeaponAxis);
  const length=hi[shaftAxis]-lo[shaftAxis];
  if(length<1e-6)return null;
  const cap=length*.28;
  const positive=safe.filter(v=>v[shaftAxis]>=hi[shaftAxis]-cap);
  const negative=safe.filter(v=>v[shaftAxis]<=lo[shaftAxis]+cap);
  if(positive.length<2||negative.length<2)return null;
  const others=AXES.filter(a=>a!==shaftAxis);
  const width=(points:WeaponVertex3[])=>{
    let maxSide=0;
    for(const a of others){
      let mn=Infinity,mx=-Infinity;
      for(const v of points){mn=Math.min(mn,v[a]);mx=Math.max(mx,v[a]);}
      maxSide=Math.max(maxSide,mx-mn);
    }
    return maxSide;
  };
  const pw=width(positive),nw=width(negative);
  const headEnd:'positive'|'negative'=pw>=nw?'positive':'negative';
  const headSamples=headEnd==='positive'?positive:negative;
  const gripSamples=headEnd==='positive'?negative:positive;
  const base=others.map(a=>gripSamples.reduce((sum,v)=>sum+v[a],0)/gripSamples.length);
  const radialScore=(v:WeaponVertex3)=>
    (v[others[0]]-base[0])**2+(v[others[1]]-base[1])**2;
  const chosen=headSamples.reduce((best,p)=>radialScore(p)>radialScore(best)?p:best);
  return {point:{x:chosen.x,y:chosen.y,z:chosen.z},shaftAxis,headEnd,
    headWidth:Math.max(pw,nw),pommelWidth:Math.min(pw,nw),sampledVertices:safe.length};
}

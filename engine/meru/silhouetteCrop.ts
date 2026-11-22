/**
 * Stable composition crop around a transparent rig sprite.
 * The first valid idle/preview frame establishes a bounded normalized crop
 * per scene. Camera movement then affects framing, not noisy alpha bounds.
 * Pure RGBA analysis, testable without DOM/Three.js.
 */
export interface SilhouetteCrop {
  x:number; y:number; width:number; height:number;
  /** Bottom of actual visible figure, relative to the crop. */
  footY:number;
  fitted:boolean;
}
export const FULL_SILHOUETTE_CROP:SilhouetteCrop={x:0,y:0,width:1,height:1,footY:1,fitted:false};
const clip=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
export function measureSilhouetteCrop(
  rgba:Uint8Array|Uint8ClampedArray,width:number,height:number,
  threshold=22
):SilhouetteCrop {
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||
     width>2048||height>2048||rgba.length<width*height*4)
    return {...FULL_SILHOUETTE_CROP};
  let left=width,right=-1,top=height,bottom=-1,seen=0;
  const step=3;
  for(let y=0;y<height;y+=step){
    for(let x=0;x<width;x+=step){
      const alpha=rgba[(y*width+x)*4+3];
      if(alpha<=threshold)continue;
      seen++;
      left=Math.min(left,x);right=Math.max(right,x);
      top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
  }
  if(seen<32||right-left<8||bottom-top<8 ||
     (right-left)>width*0.93&&(bottom-top)>height*0.93)
    return {...FULL_SILHOUETTE_CROP};
  // Keep weapons and horns safe while extracting transparent studio padding.
  const spanX=right-left+step,spanY=bottom-top+step;
  const padX=Math.max(8,spanX*0.18);
  const padY=Math.max(7,spanY*0.075);
  const sx=clip(Math.floor(left-padX),0,width-1);
  const sy=clip(Math.floor(top-padY),0,height-1);
  const ex=clip(Math.ceil(right+step+padX),sx+1,width);
  const ey=clip(Math.ceil(bottom+step+padY),sy+1,height);
  const cropWidth=(ex-sx)/width,cropHeight=(ey-sy)/height;
  return {
    x:sx/width,y:sy/height,width:cropWidth,height:cropHeight,
    footY:clip((bottom+step-sy)/(ey-sy),0,1),
    fitted:true,
  };
}

/**
 * Act I — deterministic world-space weapon-head trail.
 * The 3D renderer supplies a head projection taken from the same cached
 * animation frame as Rudra's sprite; the game camera uses the identical draw
 * transform for the character and VFX.
 *
 * This module has no browser, Three.js, input, or damage dependencies.
 */
export interface WeaponPoseUv { x: number; y: number }
export interface WeaponTrailSample { x: number; y: number; atMs: number }
export type WeaponTrailPoint = { x: number; y: number };
export interface WeaponTrailBand { x: number; y: number; leftX: number; leftY: number; rightX: number; rightY: number; t: number }

const MAX_SAMPLES = 9;
const MAX_AGE_MS = 155;
const MAX_STEP_PX = 74;

export function projectWeaponHeadToWorld(params: {
  uv: WeaponPoseUv | null;
  actorX: number;
  actorY: number;
  drawSize: number;
  footAnchorRatio: number;
}): WeaponTrailPoint | null {
  const { uv, actorX, actorY, drawSize, footAnchorRatio } = params;
  if (!uv || ![uv.x,uv.y,actorX,actorY,drawSize,footAnchorRatio].every(Number.isFinite)) return null;
  if (uv.x < -0.02 || uv.x > 1.02 || uv.y < -0.02 || uv.y > 1.02 || drawSize <= 0) return null;
  return {
    x: actorX + (uv.x - 0.5) * drawSize,
    y: actorY + (uv.y - footAnchorRatio) * drawSize,
  };
}

/** Keep only recent, contiguous physical motion; do not bridge teleport/pose pops. */
export function advanceWeaponPoseTrail(params: {
  previous: WeaponTrailSample[];
  point: WeaponTrailPoint | null;
  atMs: number;
}): WeaponTrailSample[] {
  const { point, atMs } = params;
  if (!Number.isFinite(atMs)) return [];
  const recent = params.previous.filter(s =>
    [s.x,s.y,s.atMs].every(Number.isFinite) &&
    s.atMs <= atMs && atMs - s.atMs <= MAX_AGE_MS
  ).slice(-MAX_SAMPLES);
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return [];
  const last = recent[recent.length - 1];
  if (last) {
    const dist = Math.hypot(point.x-last.x,point.y-last.y);
    if (dist > MAX_STEP_PX) return [{...point,atMs}];
    // Do not append identical points on quantized/cached 3D animation frames.
    if (dist < 1.75) return recent;
  }
  return [...recent,{...point,atMs}].slice(-MAX_SAMPLES);
}

/**
 * Swept, tapered, camera-aligned ink polygon. Uses the actual path of the
 * visible weapon head rather than an unrelated radial swing approximation.
 */
export function buildWeaponPoseTrailBands(
  samples: WeaponTrailSample[], widthPx: number, smooth = false
): WeaponTrailBand[] {
  if (samples.length < 2 || !Number.isFinite(widthPx) || widthPx <= 0) return [];
  const valid = samples.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (valid.length < 2) return [];
  // One bounded corner-cutting pass rounds polygon kinks at 30–60 FPS.
  // Every new point is a convex blend of two measured blade positions:
  // no overshoot, imaginary orbital VFX or expensive per-frame splines.
  // Keep the exact physical start and end of the motion.
  const points: WeaponTrailSample[] = smooth && valid.length > 2
    ? [valid[0], ...valid.slice(0, -1).flatMap((p, i) => {
        const next = valid[i + 1];
        const mix = (t: number): WeaponTrailSample => ({
          x: p.x + (next.x - p.x) * t,
          y: p.y + (next.y - p.y) * t,
          atMs: p.atMs + (next.atMs - p.atMs) * t,
        });
        return [mix(0.25), mix(0.75)];
      }), valid[valid.length - 1]]
    : valid;
  const count = points.length;
  const safeWidth = Math.max(1, Math.min(28,widthPx));
  const result: WeaponTrailBand[] = [];
  for (let i=0;i<count;i++) {
    const p=points[i];
    const prev=points[Math.max(0,i-1)];
    const next=points[Math.min(count-1,i+1)];
    const dx=next.x-prev.x, dy=next.y-prev.y;
    const len=Math.hypot(dx,dy);
    if (len < 0.0001) continue;
    const nx=-dy/len,ny=dx/len;
    const t=i/Math.max(1,count-1);
    // Growing hottest region close to head, but hard tapered ends. A tiny
    // one-pixel tip remains so the blade trajectory is never a blunt bar.
    const taper=Math.max(0.05,Math.pow(Math.sin(t*Math.PI),0.72));
    const half=safeWidth*0.5*taper;
    result.push({x:p.x,y:p.y,leftX:p.x+nx*half,leftY:p.y+ny*half,
      rightX:p.x-nx*half,rightY:p.y-ny*half,t});
  }
  return result.length >= 2 ? result : [];
}

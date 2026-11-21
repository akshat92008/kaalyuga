/**
 * Meru Cinematic Director: deterministic, data-driven scene evaluation.
 * Does not depend on React, DOM, WebGL, or the Kaliyuga combat loop.
 * Versioned scenes can be used by the in-game player and Meru Studio alike.
 */
export type Ease = 'linear' | 'smooth' | 'step';
export type BossCharacter = 'dundubhi' | 'vrikodara';
export type AnimationState = 'idle' | 'windup' | 'attack' | 'chase';
export type CueKind = 'drum' | 'roar' | 'impact' | 'subtitle' | 'vfx' | 'marker';

export interface CinematicCamera {
  x: number; y: number; zoom: number; roll: number; shake: number;
}
export interface CinematicActor {
  x: number; y: number; scale: number; opacity: number;
  state: AnimationState;
}
export interface CinematicLighting {
  warmth: number; exposure: number; vignette: number; ash: number;
}
export interface Keyframe<T> {
  time: number; value: T; ease?: Ease;
}
export interface CinematicCue {
  id: string; time: number; kind: CueKind; payload?: string;
}
export interface MeruCinematic {
  schemaVersion: 1;
  id: string;
  title: string;
  duration: number;
  boss: BossCharacter;
  backgroundUrl: string;
  posterUrl: string;
  camera: Keyframe<CinematicCamera>[];
  actor: Keyframe<CinematicActor>[];
  lighting: Keyframe<CinematicLighting>[];
  cues: CinematicCue[];
}
export interface CinematicFrame {
  time: number;
  camera: CinematicCamera;
  actor: CinematicActor;
  lighting: CinematicLighting;
}
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function ease(t: number, mode: Ease) {
  const x = clamp(t, 0, 1);
  return mode === 'step' ? 0 : mode === 'smooth' ? x * x * (3 - 2 * x) : x;
}
export function sampleKeyframes<T extends object>(
  keys: Keyframe<T>[], at: number
): T {
  if (!keys.length) throw new Error('Empty cinematic track');
  if (at <= keys[0].time) return { ...keys[0].value };
  const last = keys[keys.length - 1];
  if (at >= last.time) return { ...last.value };
  let left = 0;
  let right = keys.length - 1;
  while (right - left > 1) {
    const m = Math.floor((left + right) / 2);
    if (keys[m].time <= at) left = m;
    else right = m;
  }
  const a = keys[left];
  const b = keys[right];
  const p = ease((at - a.time) / (b.time - a.time), a.ease ?? 'smooth');
  const frame: Record<string, string | number> = {};
  for (const key of Object.keys(a.value)) {
    const v0 = (a.value as Record<string, number | string>)[key];
    const v1 = (b.value as Record<string, number | string>)[key];
    frame[key] = typeof v0 === 'number' && typeof v1 === 'number'
      ? lerp(v0, v1, p) : p < 1 ? v0 : v1;
  }
  return frame as T;
}
const CAMERA_KEYS: (keyof CinematicCamera)[] = ['x','y','zoom','roll','shake'];
const ACTOR_NUMBERS: (keyof CinematicActor)[] = ['x','y','scale','opacity'];
const LIGHT_KEYS: (keyof CinematicLighting)[] = ['warmth','exposure','vignette','ash'];
const SAFE_KINDS: CueKind[] = ['drum','roar','impact','subtitle','vfx','marker'];
const SAFE_STATES: AnimationState[] = ['idle','windup','attack','chase'];
const SAFE_EASINGS: Ease[] = ['linear','smooth','step'];
export function validateCinematic(input: unknown): MeruCinematic {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Scene must be an object');
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== 1) throw new Error('Unsupported cinematic schemaVersion');
  if (typeof value.id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(value.id)) throw new Error('Invalid scene ID');
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.length > 140) throw new Error('Invalid scene title');
  if (!finite(value.duration) || value.duration <= 0 || value.duration > 120) throw new Error('Scene duration must be 0-120 seconds');
  if (value.boss !== 'dundubhi' && value.boss !== 'vrikodara') throw new Error('Unsupported boss rig');
  for (const k of ['backgroundUrl','posterUrl']) {
    const str = value[k];
    if (typeof str !== 'string' || !/^\/(?:videos|kaalyuga\/arena|arenas)\/[a-zA-Z0-9_./%…-]+$/.test(str) || str.includes('..')) {
      throw new Error('Invalid local scene asset URL: ' + k);
    }
  }
  const duration = value.duration;
  const track = (name: 'camera' | 'actor' | 'lighting', numeric: string[]) => {
    const data = value[name];
    if (!Array.isArray(data) || !data.length || data.length > 300) throw new Error(name + ' requires 1-300 keyframes');
    let prev = -1;
    for (const [index, item] of data.entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(name + ' invalid keyframe');
      const key = item as Record<string, unknown>;
      if (!finite(key.time) || key.time < 0 || key.time > duration || key.time <= prev) {
        throw new Error(name + ' keyframe times must increase within scene');
      }
      if (index === 0 && key.time !== 0) throw new Error(name + ' must begin at t=0');
      prev = key.time;
      if (key.ease !== undefined && !SAFE_EASINGS.includes(key.ease as Ease)) throw new Error(name + ' invalid easing');
      const props = key.value;
      if (!props || typeof props !== 'object' || Array.isArray(props)) throw new Error(name + ' invalid keyframe value');
      const v = props as Record<string, unknown>;
      for (const field of numeric) if (!finite(v[field])) throw new Error(name + ' invalid ' + field);
      if (name === 'actor' && !SAFE_STATES.includes(v.state as AnimationState)) throw new Error('Invalid animation state');
    }
  };
  track('camera', CAMERA_KEYS);
  track('actor', ACTOR_NUMBERS);
  track('lighting', LIGHT_KEYS);
  const actor = value.actor as Keyframe<CinematicActor>[];
  const camera = value.camera as Keyframe<CinematicCamera>[];
  const lighting = value.lighting as Keyframe<CinematicLighting>[];
  for (const key of actor) {
    if (key.value.opacity < 0 || key.value.opacity > 1 || key.value.scale < 0.1 || key.value.scale > 5) throw new Error('Actor opacity / scale out of range');
  }
  for (const key of camera) if (key.value.zoom < 0.2 || key.value.zoom > 4 || Math.abs(key.value.roll) > 0.5) throw new Error('Camera zoom / roll out of range');
  for (const key of lighting) {
    if (key.value.exposure < 0 || key.value.exposure > 3 || key.value.vignette < 0 || key.value.vignette > 1 || key.value.ash < 0 || key.value.ash > 1 || key.value.warmth < 0 || key.value.warmth > 1) throw new Error('Lighting out of range');
  }
  if (!Array.isArray(value.cues) || value.cues.length > 300) throw new Error('Invalid event cues');
  const seen = new Set<string>();
  for (const item of value.cues) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid cue');
    const cue = item as Record<string, unknown>;
    if (typeof cue.id !== 'string' || !/^[a-z0-9_-]{1,80}$/i.test(cue.id) || seen.has(cue.id)) throw new Error('Cue IDs must be unique');
    seen.add(cue.id);
    if (!finite(cue.time) || cue.time < 0 || cue.time > duration) throw new Error('Cue time out of range');
    if (!SAFE_KINDS.includes(cue.kind as CueKind)) throw new Error('Invalid cue kind');
    if (cue.payload !== undefined && (typeof cue.payload !== 'string' || cue.payload.length > 500)) throw new Error('Invalid cue payload');
  }
  const scene = value as unknown as MeruCinematic;
  return {
    ...scene,
    camera: scene.camera.map(k => ({...k,value:{...k.value}})),
    actor: scene.actor.map(k => ({...k,value:{...k.value}})),
    lighting: scene.lighting.map(k => ({...k,value:{...k.value}})),
    cues: scene.cues.map(k => ({...k})).sort((a,b)=>a.time-b.time || a.id.localeCompare(b.id)),
  };
}
export function sampleCinematic(scene: MeruCinematic, t: number): CinematicFrame {
  const time = clamp(Number.isFinite(t) ? t : 0, 0, scene.duration);
  return {
    time,
    camera: sampleKeyframes(scene.camera, time),
    actor: sampleKeyframes(scene.actor, time),
    lighting: sampleKeyframes(scene.lighting, time),
  };
}
/** Inclusive after 0, exclusive of previous t: no events repeat on pause or seek. */
export function cuesBetween(scene: MeruCinematic, previous: number, next: number): CinematicCue[] {
  if (next <= previous) return [];
  return scene.cues.filter(c => c.time > previous && c.time <= next);
}
export class MeruTimelinePlayer {
  readonly scene: MeruCinematic;
  time = 0;
  playing = false;
  constructor(scene: MeruCinematic) { this.scene = validateCinematic(scene); }
  play() { if (this.time >= this.scene.duration) this.time = 0; this.playing = true; }
  pause() { this.playing = false; }
  seek(t: number) { this.time = clamp(Number.isFinite(t) ? t : 0, 0, this.scene.duration); }
  reset() { this.time = 0; this.playing = false; }
  /** Frame-rate-independent advance; large dt crosses all cues once. */
  tick(dt: number): { frame: CinematicFrame; cues: CinematicCue[]; ended: boolean } {
    if (!this.playing || !finite(dt) || dt <= 0) {
      return {frame:sampleCinematic(this.scene,this.time),cues:[],ended:false};
    }
    const previous = this.time;
    this.time = clamp(this.time + dt, 0, this.scene.duration);
    const cues = cuesBetween(this.scene, previous, this.time);
    const ended = this.time >= this.scene.duration;
    if (ended) this.playing = false;
    return {frame:sampleCinematic(this.scene,this.time),cues,ended};
  }
}
export function createDundubhiScene(): MeruCinematic {
  return validateCinematic({
    schemaVersion:1, id:'dundubhi-entrance', title:'Dundubhi — War-Drum Entrance', duration:8,
    boss:'dundubhi',
    backgroundUrl:'/kaalyuga/arena/dundubhi_chamber.mp4',
    posterUrl:'/kaalyuga/arena/dundubhi_mandapa.png',
    camera:[
      {time:0,value:{x:0,y:-18,zoom:0.92,roll:0,shake:0}},
      {time:3,value:{x:0,y:0,zoom:1.12,roll:0,shake:0}},
      {time:5.2,value:{x:0,y:-2,zoom:1.32,roll:0,shake:0.55}},
      {time:8,value:{x:0,y:0,zoom:1,roll:0,shake:0}}
    ],
    actor:[
      {time:0,value:{x:0,y:12,scale:1,opacity:0.4,state:'idle'}},
      {time:2,value:{x:0,y:0,scale:1.08,opacity:1,state:'idle'}},
      {time:3.6,value:{x:0,y:0,scale:1.10,opacity:1,state:'windup'}},
      {time:5.2,value:{x:0,y:0,scale:1.18,opacity:1,state:'attack'}},
      {time:6.1,value:{x:0,y:0,scale:1.08,opacity:1,state:'idle'}},
      {time:8,value:{x:0,y:0,scale:1,opacity:1,state:'idle'}}
    ],
    lighting:[
      {time:0,value:{warmth:0.65,exposure:0.7,vignette:0.85,ash:0.45}},
      {time:3,value:{warmth:0.8,exposure:0.85,vignette:0.70,ash:0.25}},
      {time:5.2,value:{warmth:1,exposure:1.2,vignette:0.50,ash:0.8}},
      {time:8,value:{warmth:0.6,exposure:0.95,vignette:0.35,ash:0.35}},
    ],
    cues:[
      {id:'drum-intro',time:0.65,kind:'drum'},
      {id:'boss-roar',time:3.8,kind:'roar'},
      {id:'earth-impact',time:5.15,kind:'impact'},
      {id:'reveal-title',time:6.25,kind:'subtitle',payload:'DUNDUBHI · THE LIVING WAR-DRUM'}
    ]
  });
}

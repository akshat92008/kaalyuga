/**
 * Safe policy for introducing both major Act I bosses with real authored scenes.
 * No title, hub, phase2, cleared, or non-boss encounter may trigger a cinematic.
 */
import {
  validateCinematic,
  type BossCharacter, type MeruCinematic,
} from './cinematicTimeline';
import {resolveProductionScene} from './productionSceneRegistry';

export const MERU_STUDIO_STORAGE_KEY='meru.studio.cinematic.v1';
export const MERU_VRIKODARA_STORAGE_KEY='meru.studio.cinematic.vrikodara.v1';

export const meruStorageKey=(kind:BossCharacter)=>
  kind==='vrikodara'?MERU_VRIKODARA_STORAGE_KEY:MERU_STUDIO_STORAGE_KEY;

export const defaultBossIntro=(kind:BossCharacter):MeruCinematic=>
  resolveProductionScene(kind,1);

export interface BossIntroContext {
  chamberIndex:number;
  stage:'playing'|'title'|'gameover'|string;
  hasDundubhi?:boolean;
  hasBoss?:boolean;
  boss?:BossCharacter;
  query?:string;
}
export function shouldStartBossIntro(ctx:BossIntroContext):boolean {
  const boss=ctx.boss??'dundubhi';
  const expectedChamber=boss==='dundubhi'?3:7;
  if(ctx.stage!=='playing'||ctx.chamberIndex!==expectedChamber||
    !(ctx.hasBoss??ctx.hasDundubhi??false))return false;
  const params=new URLSearchParams(ctx.query??'');
  if(params.get('cinematic')==='0')return false;
  if(params.get('cleared')==='1'||params.get('phase')==='2'||params.get('wave')==='2')return false;
  return true;
}
export function shouldStartDundubhiIntro(ctx:BossIntroContext):boolean {
  return shouldStartBossIntro({...ctx,boss:'dundubhi'});
}
/**
 * Preview scenes in this particular browser take precedence only when valid.
 * If there is no local preview, load the checked-in packaged production scene;
 * if none has been installed, use the original hand-authored default.
 * Corrupt or foreign JSON must never break live combat.
 */
/** Player builds must prefer the director-reviewed package, not browser
 * drafts left behind by someone who visited /meru-studio. Local preview is
 * intentionally supported in dev and inside the authoring Studio itself. */
export function allowLocalStudioPreview(runtimeMode:string,insideStudio=false):boolean {
  return insideStudio || runtimeMode!=='production';
}
export function readBossIntro(
  kind:BossCharacter,
  localPreview=allowLocalStudioPreview(process.env.NODE_ENV)
):MeruCinematic {
  const fallback=defaultBossIntro(kind);
  if(!localPreview||typeof localStorage==='undefined')return fallback;
  try{
    const raw=localStorage.getItem(meruStorageKey(kind));
    if(!raw||raw.length>400_000)return fallback;
    const parsed=validateCinematic(JSON.parse(raw));
    if(parsed.boss!==kind||parsed.id!==fallback.id)return fallback;
    return parsed;
  }catch{return fallback;}
}
export function readDundubhiIntro():MeruCinematic {
  return readBossIntro('dundubhi');
}

/** Phase scenes use separate authoring slots; intro edits are never overwritten. */
export const meruSceneStorageKey=(scene:MeruCinematic):string=>
  scene.bossPhase && scene.bossPhase>1
    ? 'meru.studio.cinematic.'+scene.boss+'.phase'+scene.bossPhase+'.v1'
    : meruStorageKey(scene.boss);

/** Only live, living bosses can perform a phase reveal; no debug phase starts. */
export function shouldStartBossPhase(ctx:BossIntroContext & {phase:2|3}):boolean {
  if(ctx.stage!=='playing'||!(ctx.hasBoss??ctx.hasDundubhi??false))return false;
  const boss=ctx.boss??'dundubhi';
  if(ctx.chamberIndex!==(boss==='dundubhi'?3:7))return false;
  const params=new URLSearchParams(ctx.query??'');
  return params.get('cinematic')!=='0' &&
    params.get('cleared')!=='1' && params.get('phase')!=='2';
}
export function readBossPhase(
  kind:BossCharacter,phase:2|3,
  localPreview=allowLocalStudioPreview(process.env.NODE_ENV)
):MeruCinematic {
  const fallback=resolveProductionScene(kind,phase);
  if(!localPreview||typeof localStorage==='undefined')return fallback;
  try{
    const raw=localStorage.getItem(meruSceneStorageKey(fallback));
    if(!raw||raw.length>400_000)return fallback;
    const parsed=validateCinematic(JSON.parse(raw));
    if(parsed.id!==fallback.id||parsed.boss!==kind||parsed.bossPhase!==phase)return fallback;
    return parsed;
  }catch{return fallback;}
}

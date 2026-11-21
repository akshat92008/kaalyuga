/**
 * Pure policy for introducing a boss with the Meru cinematic player.
 * Every transition (including direct debug chamber loads) follows the same rule.
 */
import {createDundubhiScene, validateCinematic, type MeruCinematic} from './cinematicTimeline';
export const MERU_STUDIO_STORAGE_KEY='meru.studio.cinematic.v1';

export interface BossIntroContext {
  chamberIndex:number;
  stage:'playing'|'title'|'gameover'|string;
  hasDundubhi:boolean;
  query?:string;
}
export function shouldStartDundubhiIntro(ctx:BossIntroContext):boolean {
  if(ctx.stage!=='playing'||ctx.chamberIndex!==3||!ctx.hasDundubhi)return false;
  const params=new URLSearchParams(ctx.query??'');
  if(params.get('cinematic')==='0')return false;
  if(params.get('cleared')==='1'||params.get('phase')==='2'||params.get('wave')==='2')return false;
  return true;
}
/**
 * Saved studio scenes can be used by the actual encounter. Incorrect versions,
 * mismatched bosses and inaccessible browser storage gracefully use the built-in scene.
 */
export function readDundubhiIntro():MeruCinematic {
  const fallback=createDundubhiScene();
  if(typeof localStorage==='undefined')return fallback;
  try{
    const raw=localStorage.getItem(MERU_STUDIO_STORAGE_KEY);
    if(!raw||raw.length>400_000)return fallback;
    const parsed=validateCinematic(JSON.parse(raw));
    if(parsed.boss!=='dundubhi'||parsed.id!==fallback.id)return fallback;
    return parsed;
  }catch{
    return fallback;
  }
}

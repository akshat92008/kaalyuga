/**
 * Meru production-scene delivery. The manifest is compiled into the game;
 * unlike Studio's browser-only localStorage it reaches every installed player.
 * A scene is shipped ONLY after the director exports it, installs it with the
 * validation CLI and commits the manifest. An empty manifest is intentional:
 * the checked-in hand-authored default scenes remain the safe fallback.
 */
import productionManifest from './productionScenes.json';
import {
  createBossPhaseScene,createDundubhiScene,createVrikodaraScene,
  validateCinematic,type BossCharacter,type MeruCinematic,
} from './cinematicTimeline';

export const MERU_PRODUCTION_SCENE_IDS=[
  'dundubhi-entrance','vrikodara-entrance',
  'dundubhi-phase2','dundubhi-phase3',
  'vrikodara-phase2','vrikodara-phase3',
] as const;
export type MeruProductionSceneId=typeof MERU_PRODUCTION_SCENE_IDS[number];

export interface MeruProductionManifest {
  schemaVersion:1;
  scenes:Partial<Record<MeruProductionSceneId,MeruCinematic>>;
}
const isRecord=(value:unknown):value is Record<string,unknown>=>
  value!==null&&typeof value==='object'&&!Array.isArray(value);

export function defaultProductionScene(kind:BossCharacter,phase:1|2|3=1):MeruCinematic {
  if(phase===1)return kind==='dundubhi'?createDundubhiScene():createVrikodaraScene();
  return createBossPhaseScene(kind,phase);
}

/** Strict release gate: reject unknown/foreign/oversized entries rather than
 * silently publishing a different boss, phase, or external asset URL. */
export function validateProductionManifest(input:unknown):MeruProductionManifest {
  if(!isRecord(input)||input.schemaVersion!==1||!isRecord(input.scenes))
    throw new Error('Invalid Meru production manifest');
  const scenes:MeruProductionManifest['scenes']={};
  const entries=Object.entries(input.scenes);
  if(entries.length>MERU_PRODUCTION_SCENE_IDS.length)
    throw new Error('Too many shipped scenes');
  for(const [id,raw] of entries){
    if(!(MERU_PRODUCTION_SCENE_IDS as readonly string[]).includes(id))
      throw new Error('Unknown production cinematic ID: '+id);
    if(JSON.stringify(raw).length>400_000)
      throw new Error('Production cinematic exceeds 400 KB: '+id);
    const candidate=validateCinematic(raw);
    const canonical=defaultProductionScene(candidate.boss,candidate.bossPhase??1);
    if(candidate.id!==id||candidate.id!==canonical.id||
       candidate.boss!==canonical.boss||
       (candidate.bossPhase??1)!==(canonical.bossPhase??1))
      throw new Error('Production scene boss/phase mismatch: '+id);
    scenes[id as MeruProductionSceneId]=candidate;
  }
  return {schemaVersion:1,scenes};
}

export function resolveProductionScene(
  kind:BossCharacter,phase:1|2|3=1,manifest:unknown=productionManifest
):MeruCinematic {
  const fallback=defaultProductionScene(kind,phase);
  try{
    const checked=validateProductionManifest(manifest);
    return checked.scenes[fallback.id as MeruProductionSceneId]??fallback;
  }catch{
    // Never crash a player's game because a shipped scene is corrupt.
    return fallback;
  }
}

export function getInstalledProductionSceneIds():MeruProductionSceneId[] {
  try{return Object.keys(validateProductionManifest(productionManifest).scenes) as MeruProductionSceneId[];}
  catch{return [];}
}

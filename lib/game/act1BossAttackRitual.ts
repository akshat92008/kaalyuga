/**
 * Act I boss strikes must not repeatedly place full-screen geometric cages
 * over the actual combat geometry. Ritual-level VFX are reserved for rare
 * phase-three named attacks. The separate phase-transition cinematic remains
 * responsible for its own high-authority boss transformation.
 */
export interface BossRitualStrikeInput {
  enemyType:string;
  isBoss:boolean;
  phase:number;
  attackKind:string;
  activeBossMoveId:string | null | undefined;
}
export function shouldSpawnRareBossStrikeRitual(p:BossRitualStrikeInput):boolean{
  if(!p.isBoss || p.phase<3)return false;
  if(p.enemyType==='vrikodara')
    return p.attackKind==='shockwave' &&
      p.activeBossMoveId==='kalagni_cataclysm_vortex';
  if(p.enemyType==='dundubhi')
    return p.attackKind==='cone' &&
      p.activeBossMoveId==='pralaya_triple_trample';
  return false;
}
export function getRareBossStrikeRitualBudget(enemyType:string):{
  palette:'magma'|'bronze';radius:number;duration:number;ringCount:number;
}{
  return enemyType==='vrikodara'
    ? {palette:'magma',radius:164,duration:.48,ringCount:2}
    : {palette:'bronze',radius:147,duration:.42,ringCount:2};
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {getRareBossStrikeRitualBudget,shouldSpawnRareBossStrikeRitual} from './act1BossAttackRitual';

test('No routine Dundubhi Phase 1 horn charge receives an opaque rune cage',()=>{
 const c={enemyType:'dundubhi',isBoss:true,phase:1,attackKind:'corridor',
  activeBossMoveId:'brahmadanda_horn_gore'};
 assert.equal(shouldSpawnRareBossStrikeRitual(c),false);
 assert.equal(shouldSpawnRareBossStrikeRitual({...c,phase:2}),false);
});
test('Regular mobs, brutes and minor wardens never trigger boss ritual',()=>{
 for(const enemyType of ['charnel_ghoul','semi_boss_bloodforge','bloodmaw_brute']){
   assert.equal(shouldSpawnRareBossStrikeRitual({enemyType,isBoss:false,
     phase:3,attackKind:'shockwave',activeBossMoveId:'kalagni_cataclysm_vortex'}),false);
 }
});
test('Vrikodara phase-3 named cataclysm and Dundubhi final trample remain special',()=>{
 assert.equal(shouldSpawnRareBossStrikeRitual({
   enemyType:'vrikodara',isBoss:true,phase:3,
   attackKind:'shockwave',activeBossMoveId:'kalagni_cataclysm_vortex'}),true);
 assert.equal(shouldSpawnRareBossStrikeRitual({
   enemyType:'dundubhi',isBoss:true,phase:3,
   attackKind:'cone',activeBossMoveId:'pralaya_triple_trample'}),true);
});
test('Ritual does not obscure the entire player-to-boss view',()=>{
 for(const type of ['dundubhi','vrikodara']){
   const b=getRareBossStrikeRitualBudget(type);
   assert.ok(b.radius<=170);
   assert.ok(b.duration<=.5);
   assert.equal(b.ringCount,2);
 }
});

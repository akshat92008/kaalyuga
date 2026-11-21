import test from 'node:test';
import assert from 'node:assert/strict';
import { getAct1ExecutionVisualPlan } from './act1ExecutionVisualPlan';

test('First execution is directional ground impact, not double-elemental wheel',()=>{
 const v=getAct1ExecutionVisualPlan('downward_crush');
 assert.equal(v.useGroundedOverheadContact,true);
 assert.equal(v.allowSpectralSkyBolts,false);
 assert.ok(v.groundShockwaveRadius<170);
 assert.ok(v.slashRadius<=136);
 assert.ok(v.slashWidth<45);
 assert.ok(v.slashArcSpan<Math.PI);
 assert.ok(v.sparkCount<=18);
 assert.ok(v.flipbookSize<180);
});
test('Other established execution variants retain their existing set pieces',()=>{
 const spin=getAct1ExecutionVisualPlan('spin_360_cleave');
 const thrust=getAct1ExecutionVisualPlan('impaling_lunge');
 assert.equal(spin.useGroundedOverheadContact,false);
 assert.equal(thrust.useGroundedOverheadContact,false);
 assert.equal(spin.allowSpectralSkyBolts,true);
 assert.equal(thrust.allowSpectralSkyBolts,true);
});
test('All finisher hit cues remain at the existing guaranteed single-contact frame',()=>{
 for(const variant of ['downward_crush','spin_360_cleave','impaling_lunge'] as const){
   const p=getAct1ExecutionVisualPlan(variant);
   assert.equal(p.contactProgress,0.35);
 }
});

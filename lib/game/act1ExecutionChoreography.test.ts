import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAct1FinisherContactAnchor,
  sampleAct1ExecutionVictimPose,
  sampleAct1ExecutionHeroRoot,
  type Act1ExecutionChoreographyToken,
} from './act1ExecutionChoreography';

const base: Act1ExecutionChoreographyToken = {
  enemyId: 42, chamberIndex: 0, attackSerial: 11,
  variant: 'downward_crush', facing: 1, contactRegistered: false,
};
function pose(token: Act1ExecutionChoreographyToken | null, progress: number,
  extra: Partial<Parameters<typeof sampleAct1ExecutionVictimPose>[1]> = {}) {
  return sampleAct1ExecutionVictimPose(token, {
    enemyId:42, chamberIndex:0, attackSerial:11,
    action:'execute', progress, isBoss:false, isDead:false, ...extra,
  });
}
test('No target reaction before one-shot contact or on stale attack/chamber', () => {
  const unhit = pose(base,0.55);
  assert.equal(unhit.forceHurt,false);
  assert.ok(Math.abs(unhit.offsetX)<0.0001);
  assert.equal(unhit.scaleX,1);
  assert.equal(pose({...base,contactRegistered:true},0.7,{chamberIndex:1}).rotationRad,0);
  assert.equal(pose({...base,contactRegistered:true},0.7,{attackSerial:12}).forceHurt,false);
  assert.equal(pose({...base,contactRegistered:true},0.7,{enemyId:99}).offsetX,0);
  assert.equal(pose({...base,contactRegistered:true},0.7,{action:'dodge'}).offsetX,0);
  assert.equal(pose({...base,contactRegistered:true},1).offsetX,0);
  assert.equal(pose(null,0.4).offsetX,0);
});
test('Three finishers have bounded and legible distinct contact-recoil signatures', () => {
 const byName={...base,contactRegistered:true};
 const down=pose({...byName,variant:'downward_crush'},.46);
 const spin=pose({...byName,variant:'spin_360_cleave'},.46);
 const lunge=pose({...byName,variant:'impaling_lunge'},.46);
 assert.ok(down.offsetY>4 && down.scaleY<.93);
 assert.ok(spin.offsetX>10 && spin.rotationRad>0.1);
 assert.ok(lunge.offsetX>spin.offsetX && lunge.scaleX<spin.scaleX);
 for(const variant of ['downward_crush','spin_360_cleave','impaling_lunge'] as const){
   const v=pose({...byName,variant},.46);
   assert.ok(v.scaleX>=.86 && v.scaleX<=1.12);
   assert.ok(v.scaleY>=.86 && v.scaleY<=1.12);
   assert.equal(v.forceHurt,true);
   const boss=pose({...byName,variant},.46,{isBoss:true});
   assert.ok(Math.abs(boss.offsetX)<Math.abs(v.offsetX)+1);
 }
 assert.equal(pose({...byName,variant:'impaling_lunge'},.46,{isDead:true}).forceHurt,false);
 assert.equal(pose(byName,.9).offsetX,0);
});
test('Time-based choreography is display-FPS invariant and fully releases after attack', () => {
 const token={...base,variant:'spin_360_cleave' as const,contactRegistered:true};
 for (const hz of [30,60,120]){
   const frame=Math.round(.5*hz);
   const t=frame/hz;
   const sample=pose(token,t);
   assert.ok(Math.abs(sample.offsetX-pose(token,.5).offsetX)<0.00001);
 }
 assert.equal(pose(token,NaN).offsetX,0);
 assert.equal(pose(token,-0.01).scaleY,1);
 assert.equal(pose(token,1).forceHurt,false);
});
test('Blended hit flashes stay on enemy if tracked blade is absent or implausibly far',()=>{
 assert.deepEqual(resolveAct1FinisherContactAnchor({enemyX:300,enemyY:420}),
   {x:300,y:396,source:'target'});
 assert.equal(resolveAct1FinisherContactAnchor({
   enemyX:300,enemyY:420,bladeX:999,bladeY:999,
 }).source,'target');
 const aligned=resolveAct1FinisherContactAnchor({
   enemyX:300,enemyY:420,bladeX:330,bladeY:400,
 });
 assert.equal(aligned.source,'blade');
 assert.equal(aligned.x,312);
 assert.equal(aligned.y,397.6);
});

test('Rudra executes a bounded, facing-aware stride that returns before idle',()=>{
 for(const variant of ['downward_crush','spin_360_cleave','impaling_lunge'] as const){
   const token={...base,variant};
   const sample=(t:number,side:1|-1=1)=>sampleAct1ExecutionHeroRoot(
     {...token,facing:side},
     {action:'execute',attackSerial:11,chamberIndex:0,progress:t}
   );
   const early=sample(.13), contact=sample(.36), finish=sample(.92);
   assert.ok(Math.abs(contact.offsetX)>Math.abs(early.offsetX));
   assert.equal(finish.offsetX,0);
   assert.equal(finish.offsetY,0);
   assert.ok(Math.abs(contact.offsetX)<=18);
   assert.ok(Math.abs(contact.offsetY)<=3);
   assert.equal(sample(.36,-1).offsetX,-contact.offsetX);
   assert.equal(sampleAct1ExecutionHeroRoot({...token},{
      action:'dodge',attackSerial:11,chamberIndex:0,progress:.36,
   }).offsetX,0);
   assert.equal(sampleAct1ExecutionHeroRoot({...token},{
      action:'execute',attackSerial:12,chamberIndex:0,progress:.36,
   }).offsetX,0);
 }
 const down=sampleAct1ExecutionHeroRoot({...base,variant:'downward_crush'},{
     action:'execute',attackSerial:11,chamberIndex:0,progress:.36,
 });
 const lunge=sampleAct1ExecutionHeroRoot({...base,variant:'impaling_lunge'},{
     action:'execute',attackSerial:11,chamberIndex:0,progress:.36,
 });
 assert.ok(lunge.offsetX>down.offsetX);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceWeaponPoseTrail,buildWeaponPoseTrailBands,projectWeaponHeadToWorld } from './act1WeaponPoseTrail';

test('Sprite head projection exactly shares Rudra world draw transform',()=>{
 const p=projectWeaponHeadToWorld({uv:{x:.5,y:.8},actorX:450,actorY:360,drawSize:136,footAnchorRatio:.8});
 assert.deepEqual(p,{x:450,y:360});
 const tip=projectWeaponHeadToWorld({uv:{x:.75,y:.4},actorX:450,actorY:360,drawSize:136,footAnchorRatio:.8});
 assert.ok(tip);
 assert.ok(Math.abs(tip.x-484)<1e-6 && Math.abs(tip.y-305.6)<1e-6);
});
test('Invalid, absent, or behind-frame head projection never draws a ghost weapon',()=>{
 for(const uv of [null,{x:Infinity,y:0.5},{x:2,y:0.4},{x:-2,y:0.2}]){
   assert.equal(projectWeaponHeadToWorld({uv,actorX:0,actorY:0,drawSize:136,footAnchorRatio:.8}),null);
 }
});
test('Samples expire after 155 ms and do not multiply on cached animation frames',()=>{
 let samples=[];
 for(let i=0;i<6;i++)samples=advanceWeaponPoseTrail({previous:samples,point:{x:100+i*6,y:100+i*2},atMs:i*20});
 assert.equal(samples.length,6);
 samples=advanceWeaponPoseTrail({previous:samples,point:{x:130,y:110},atMs:102});
 assert.equal(samples.length,6);
 const later=advanceWeaponPoseTrail({previous:samples,point:{x:135,y:113},atMs:400});
 assert.equal(later.length,1);
});
test('A skipped pose/teleport does not connect an enormous blade slash',()=>{
 const first=[{x:40,y:40,atMs:30},{x:50,y:48,atMs:50}];
 const next=advanceWeaponPoseTrail({previous:first,point:{x:220,y:100},atMs:60});
 assert.equal(next.length,1);
});
test('Direction derives from actual weapon positions; taper remains bounded',()=>{
 const s=[{x:10,y:10,atMs:1},{x:24,y:26,atMs:18},{x:41,y:30,atMs:35},{x:60,y:24,atMs:52}];
 const bands=buildWeaponPoseTrailBands(s,16);
 assert.equal(bands.length,4);
 assert.ok(Math.abs(bands[1].leftX-bands[1].rightX)>0.001);
 const maxThickness=Math.max(...bands.map(b=>Math.hypot(b.leftX-b.rightX,b.leftY-b.rightY)));
 assert.ok(maxThickness<=16.00001);
 assert.ok(Math.hypot(bands[0].leftX-bands[0].rightX,bands[0].leftY-bands[0].rightY)<maxThickness);
 assert.deepEqual(buildWeaponPoseTrailBands([],20),[]);
});

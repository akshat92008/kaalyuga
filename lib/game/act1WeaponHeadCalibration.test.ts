import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrateParashuBladeHead,type WeaponVertex3} from './act1WeaponHeadCalibration';
function sampleAxe(headPositive:boolean,axis:'x'|'z'='z'):WeaponVertex3[] {
 const pts:WeaponVertex3[]=[];
 for(let i=0;i<=22;i++){
   const t=-1.1+i*0.1;
   pts.push(axis==='z'?{x:0.02,y:0,z:t}:{x:t,y:0,z:0.02});
   pts.push(axis==='z'?{x:-0.02,y:0.02,z:t}:{x:t,y:0.02,z:-0.02});
 }
 for(let i=-5;i<=5;i++){
   const lateral=i*.1,head=headPositive?.84:-.84;
   pts.push(axis==='z'?{x:lateral,y:.01,z:head}:{x:head,y:.01,z:lateral});
 }
 return pts;
}
test('Blade-head width beats pommel distance from origin',()=>{
 const c=calibrateParashuBladeHead(sampleAxe(true)); assert.ok(c);
 assert.equal(c.shaftAxis,'z');assert.equal(c.headEnd,'positive');
 assert.ok(c.point.z>.6);assert.ok(Math.abs(c.point.x)>.35);
 assert.ok(c.headWidth>c.pommelWidth);
});
test('Mirrored axe and alternate shaft axis still find blade tip',()=>{
 for(const axis of ['x','z'] as const){
  const c=calibrateParashuBladeHead(sampleAxe(false,axis));assert.ok(c);
  assert.equal(c.headEnd,'negative');assert.equal(c.shaftAxis,axis);
  assert.ok(Math.abs(c.point[axis==='x'?'z':'x'])>.35);
 }
});
test('Reject invalid and zero-extent geometry',()=>{
 assert.equal(calibrateParashuBladeHead([]),null);
 assert.equal(calibrateParashuBladeHead(Array(8).fill({x:0,y:0,z:0})),null);
 assert.equal(calibrateParashuBladeHead(Array(8).fill({x:Infinity,y:0,z:0})),null);
});
test('Chosen cutting-edge marker is from the original mesh vertices',()=>{
 const pts=sampleAxe(true);
 const c=calibrateParashuBladeHead(pts);assert.ok(c);
 assert.ok(pts.some(p=>p.x===c.point.x&&p.y===c.point.y&&p.z===c.point.z));
});

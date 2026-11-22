import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBladeTrailState, sampleParashuTrail, ribbonContour,
  visibleTrailLength, drawParashuMotionTrail
} from './parashuMotionTrail';

test('samples actual weapon movement without constructing an artificial circular arc',()=>{
 let s=createBladeTrailState();
 for(let i=0;i<10;i++){
   s=sampleParashuTrail(s,{
     timeSec:i/80,attackSerial:10,isAttacking:true,
     bladePoint:{x:100+i*5,y:200+Math.sin(i*0.35)*12},heavy:true,element:'agni'
   });
 }
 assert.equal(s.samples.length,10);
 assert.ok(visibleTrailLength(s)>42);
 const shape=ribbonContour(s.samples,14,0.13,0.19);
 assert.equal(shape.outer.length,10);
 assert.equal(shape.inner.length,10);
 assert.ok(shape.outer.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
});

test('trail resets between attacks and cannot make a teleport-spanning slab',()=>{
 let s=createBladeTrailState();
 for(let i=0;i<5;i++)
   s=sampleParashuTrail(s,{timeSec:i/60,attackSerial:1,isAttacking:true,
     bladePoint:{x:50+i*9,y:100},heavy:false,element:'vayu'});
 s=sampleParashuTrail(s,{timeSec:0.09,attackSerial:2,isAttacking:true,
     bladePoint:{x:300,y:250},heavy:false,element:'vayu'});
 assert.equal(s.samples.length,1);
 s=sampleParashuTrail(s,{timeSec:0.11,attackSerial:2,isAttacking:true,
     bladePoint:{x:650,y:350},heavy:false,element:'vayu'});
 assert.equal(s.samples.length,1);
 assert.equal(visibleTrailLength(s),0);
});

test('stale, idle or invalid blade positions do not create visible trails',()=>{
 let s=createBladeTrailState();
 for(let i=0;i<4;i++)s=sampleParashuTrail(s,{
  timeSec:i*0.025,attackSerial:8,isAttacking:true,
  bladePoint:{x:100+i*7,y:200-i*4},heavy:true,element:'vajra'
 });
 s=sampleParashuTrail(s,{timeSec:0.3,attackSerial:8,isAttacking:false,
   bladePoint:{x:NaN,y:5},heavy:true,element:'vajra'});
 assert.equal(s.samples.length,0);
 const fakeCtx={};
 assert.equal(drawParashuMotionTrail(fakeCtx as CanvasRenderingContext2D,s,0.3),false);
});

test('follows actual sampled motion and draws only local tapered polygons',()=>{
 let s=createBladeTrailState();
 for(let i=0;i<10;i++)s=sampleParashuTrail(s,{
  timeSec:i/90,attackSerial:3,isAttacking:true,
  bladePoint:{x:90+i*5,y:150+Math.sin(i/2)*8},heavy:true,element:'varuna'
 });
 let drawCount=0,saves=0,restores=0;
 const canvas={
  save:()=>{saves++},restore:()=>{restores++},
  beginPath:()=>{},moveTo:()=>{},lineTo:()=>{},closePath:()=>{},
  fill:()=>{drawCount++},
  set globalAlpha(value:number){assert.ok(value>=0&&value<=1)},
  set fillStyle(value:string){assert.ok(/^#/.test(value))}
 } as unknown as CanvasRenderingContext2D;
 assert.equal(drawParashuMotionTrail(canvas,s,0.11),true);
 assert.ok(drawCount>=3&&drawCount<=9);
 assert.equal(saves,1);
 assert.equal(restores,1);
 assert.equal(drawParashuMotionTrail(canvas,s,0.11,true),false);
});

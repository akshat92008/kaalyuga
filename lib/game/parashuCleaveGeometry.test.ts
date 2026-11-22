import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSinuousInkCleaveGeometry } from './webglDemonSlayerVfx';

test('sinuous heavy attack geometry is open, tapered and curved (not a full ring or slab)',()=>{
 const geom=buildSinuousInkCleaveGeometry(195,26,49,1.0,56);
 const pos=geom.getAttribute('position');
 assert.equal(pos.count,114);
 geom.computeBoundingBox();
 const b=geom.boundingBox!;
 assert.ok((b.max.x-b.min.x)>160, 'long direction of attack');
 assert.ok((b.max.y-b.min.y)<175,'no fullscreen wedge');
 const first=0,last=pos.count-2;
 const width=(i:number)=>{
   const dx=pos.getX(i)-pos.getX(i+1);
   const dy=pos.getY(i)-pos.getY(i+1);
   return Math.hypot(dx,dy);
 };
 assert.ok(width(first)<0.1,'trail begins sharp');
 assert.ok(width(last)<0.1,'trail ends sharp');
 assert.ok(width(56)>18,'center of stroke visibly thicker');
 const center=(i:number)=>(pos.getY(i)+pos.getY(i+1))*0.5;
 assert.ok(Math.abs(center(56)-center(first))>18,'curve is real, not straight band');
 geom.dispose();
});

test('ink cleave variants have distinct curvature and finite positions',()=>{
 const x=buildSinuousInkCleaveGeometry(168,18,42,3.2,42);
 const y=buildSinuousInkCleaveGeometry(168,18,-42,5.2,42);
 const a=x.getAttribute('position'),b=y.getAttribute('position');
 assert.equal(a.count,b.count);
 assert.ok(a.array.every(Number.isFinite));
 assert.ok(b.array.every(Number.isFinite));
 const mid=Math.floor(a.count/4)*2;
 assert.ok(Math.abs(a.getY(mid)-b.getY(mid))>12);
 x.dispose();y.dispose();
});

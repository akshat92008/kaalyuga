import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseAct1BladeFxMode,
  getAct1FallbackBladeRadius,
  getAct1ExecutionContactBudget,
} from './act1BladeAttachedFx';

test('Loaded rig never draws a detached invented slash, even during crossfade', () => {
  assert.equal(chooseAct1BladeFxMode({rendered3D:true,hasProjectedHead:false,sampleCount:0}),'suppressed');
  assert.equal(chooseAct1BladeFxMode({rendered3D:true,hasProjectedHead:true,sampleCount:1}),'socket_tip');
  assert.equal(chooseAct1BladeFxMode({rendered3D:true,hasProjectedHead:true,sampleCount:3}),'socket_trail');
  assert.equal(chooseAct1BladeFxMode({rendered3D:false,hasProjectedHead:false,sampleCount:0}),'fallback_2d');
  assert.equal(chooseAct1BladeFxMode({rendered3D:false,hasProjectedHead:true,sampleCount:9}),'fallback_2d');
});
test('Legacy 2D slash is never larger than an axe reach', () => {
  for (const radius of [20,65,100,206,9999]) {
    const r=getAct1FallbackBladeRadius(radius);
    assert.ok(r>=16 && r<=46);
  }
  assert.equal(getAct1FallbackBladeRadius(Number.NaN),32);
});
test('Each execution contact remains localized; the 360 sweep belongs to the socket trail',()=>{
  for(const v of ['downward_crush','spin_360_cleave','impaling_lunge']){
    const x=getAct1ExecutionContactBudget(v);
    assert.ok(x.groundRadius<=100);
    assert.ok(x.impactFlipbookSize<=80);
    assert.ok(x.contactSparkSize<=90);
  }
  assert.ok(getAct1ExecutionContactBudget('spin_360_cleave').groundRadius>
    getAct1ExecutionContactBudget('impaling_lunge').groundRadius);
});

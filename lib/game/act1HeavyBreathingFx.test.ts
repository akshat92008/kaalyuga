import test from 'node:test';
import assert from 'node:assert/strict';
import {act1HeavyBreathingPalette,buildAct1HeavyBladeFlames,getAct1HeavyContactSpectacle} from './act1HeavyBreathingFx';
const samples=[
  {x:200,y:300,atMs:0},{x:219,y:287,atMs:20},
  {x:248,y:278,atMs:40},{x:270,y:259,atMs:60},
];
test('All large heavy flames are strictly rooted on real measured blade tips',()=>{
  for(const stance of ['smash','pillar','thrust'] as const){
    const flames=buildAct1HeavyBladeFlames(samples,{stance,focus:4,alpha:1,action:'heavy_unleash'});
    assert.ok(flames.length>=4);
    for(const flame of flames){
      assert.ok(samples.some(s=>s.x===flame.root.x && s.y===flame.root.y));
      assert.ok(Math.hypot(flame.tip.x-flame.root.x,flame.tip.y-flame.root.y)<=145);
      assert.ok(flame.reach<=145 && flame.reach>20);
      assert.ok(flame.opacity>0 && flame.opacity<=1);
      assert.ok(flame.width<=30);
      for(const point of [flame.tip,flame.bendOut,flame.bendIn,flame.leftBase,flame.rightBase])
        assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y));
    }
    assert.ok(act1HeavyBreathingPalette(stance).hot);
  }
});
test('No invented flame if actor socket is missing, still, teleported or cancelled',()=>{
  const opts={stance:'smash' as const,focus:3,alpha:0.8,action:'heavy_unleash' as const};
  assert.deepEqual(buildAct1HeavyBladeFlames([],opts),[]);
  assert.deepEqual(buildAct1HeavyBladeFlames([samples[0]],opts),[]);
  assert.deepEqual(buildAct1HeavyBladeFlames([samples[0],samples[0]],opts),[]);
  assert.deepEqual(buildAct1HeavyBladeFlames([{x:0,y:0,atMs:0},{x:900,y:900,atMs:20}],opts),[]);
  assert.deepEqual(buildAct1HeavyBladeFlames(samples,{...opts,alpha:0}),[]);
});
test('Focus materially increases gorgeous large scale without becoming an unattached 400px wheel',()=>{
  const opts={stance:'smash' as const,alpha:1,action:'heavy_unleash' as const};
  const plain=buildAct1HeavyBladeFlames(samples,{...opts,focus:0});
  const charged=buildAct1HeavyBladeFlames(samples,{...opts,focus:4});
  assert.ok(Math.max(...charged.map(f=>f.reach))>Math.max(...plain.map(f=>f.reach))*1.8);
  assert.ok(Math.max(...charged.map(f=>f.reach))<=145);
  const finisher=buildAct1HeavyBladeFlames(samples,{...opts,focus:4,action:'execute'});
  assert.ok(Math.max(...finisher.map(f=>f.reach))<Math.max(...charged.map(f=>f.reach)));
});
test('Heavy impact is large, stance-colored and controlled by actual consumed charge',()=>{
  for(const stance of ['smash','pillar','thrust'] as const){
    const low=getAct1HeavyContactSpectacle(stance,0);
    const high=getAct1HeavyContactSpectacle(stance,4);
    assert.ok(high.energyRadius>low.energyRadius);
    assert.ok(high.shockwaveRadius>low.shockwaveRadius);
    assert.ok(high.sparkCount>low.sparkCount);
    assert.ok(high.energyRadius<=170&&high.shockwaveRadius<=195);
    assert.ok(low.shockwaveRadius>=130);
  }
  assert.equal(getAct1HeavyContactSpectacle('smash',3).palette,'hinokami');
  assert.equal(getAct1HeavyContactSpectacle('pillar',3).palette,'wind');
  assert.equal(getAct1HeavyContactSpectacle('thrust',3).palette,'thunder');
  assert.deepEqual(getAct1HeavyContactSpectacle('smash',Number.NaN),getAct1HeavyContactSpectacle('smash',0));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createDundubhiScene, validateCinematic, sampleCinematic, cuesBetween, MeruTimelinePlayer} from './cinematicTimeline';
import {MeruAdaptiveQuality,GRAPHICS_PRESETS} from './adaptiveQuality';
import {beginPortalTransition,advancePortalTransition,portalPalette} from './portalDirector';

test('canonical Dundubhi sequence validates and produces finite frames at every sample',()=>{
  const scene=createDundubhiScene();
  assert.equal(scene.schemaVersion,1);
  for(let t=0;t<=8;t+=0.025){
    const frame=sampleCinematic(scene,t);
    assert.ok(Number.isFinite(frame.camera.zoom));
    assert.ok(frame.actor.opacity>=0&&frame.actor.opacity<=1);
  }
});
test('strict schema rejects malformed, duplicate, unsorted and unsafe content',()=>{
  const scene=createDundubhiScene();
  assert.throws(()=>validateCinematic({...scene,schemaVersion:2}),/schemaVersion/);
  assert.throws(()=>validateCinematic({...scene,duration:0}),/duration/);
  assert.throws(()=>validateCinematic({...scene,backgroundUrl:'https://example.com/data'}),/URL/);
  assert.throws(()=>validateCinematic({...scene,camera:[...scene.camera].reverse()}),/increase/);
  assert.throws(()=>validateCinematic({...scene,camera:[{...scene.camera[0],value:{...scene.camera[0].value,zoom:Infinity}}]}),/invalid zoom|Camera zoom/);
  assert.throws(()=>validateCinematic({...scene,cues:[...scene.cues,scene.cues[0]]}),/unique/);
});
test('interpolates and clamps without altering original scene',()=>{
  const scene=createDundubhiScene();
  const start=sampleCinematic(scene,-1),end=sampleCinematic(scene,20);
  assert.equal(start.time,0);
  assert.equal(end.time,scene.duration);
  assert.ok(sampleCinematic(scene,1).camera.zoom>start.camera.zoom);
  assert.equal(start.actor.state,'idle');
  assert.notEqual(sampleCinematic(scene,5.4).actor.state,'chase');
  assert.equal(scene.camera[0].value.zoom,0.92);
});
test('cues trigger exactly once, irrespective of frame delta; seek and pause are silent',()=>{
  const scene=createDundubhiScene();
  const p=new MeruTimelinePlayer(scene);
  p.play();assert.deepEqual(p.tick(0.65).cues.map(c=>c.id),['drum-intro']);
  assert.deepEqual(p.tick(0).cues,[]);
  p.pause();assert.deepEqual(p.tick(4).cues,[]);
  p.seek(4);assert.deepEqual(p.tick(0.1).cues,[]);
  p.play();
  assert.deepEqual(p.tick(2.5).cues.map(c=>c.id),['earth-impact','reveal-title']);
  assert.deepEqual(p.tick(100).cues,[]);
  assert.equal(p.playing,false);
  assert.deepEqual(cuesBetween(scene,5.2,4),[]);
});
test('timeline terminates once, replay resets, large dt cannot exceed duration',()=>{
  const p=new MeruTimelinePlayer(createDundubhiScene());
  p.play();const r=p.tick(100);assert.equal(r.ended,true);
  assert.equal(r.frame.time,p.scene.duration);
  assert.equal(p.tick(1).ended,false);
  p.play();assert.equal(p.time,0);
  p.reset();assert.equal(p.time,0);
  assert.equal(p.playing,false);
});
test('graphics budgets are ordered, bounded, and expose even pixel dimensions',()=>{
  assert.ok(GRAPHICS_PRESETS.lite.resolutionScale<GRAPHICS_PRESETS.balanced.resolutionScale);
  const q=new MeruAdaptiveQuality('balanced',60);
  const size=q.renderSize(1440,900,2);
  assert.ok(size.width<=4096&&size.height<=4096);
  assert.equal(size.width%2,0);assert.equal(size.height%2,0);
  assert.throws(()=>q.renderSize(0,100),/viewport/);
});
test('adaptive performance reacts only to sustained load and avoids oscillation',()=>{
  const q=new MeruAdaptiveQuality('cinematic',60);
  assert.equal(q.sample(1000),'cinematic');
  for(let i=0;i<130;i++)q.sample(28);
  assert.equal(q.tier,'balanced');
  q.setAutomatic(false);
  for(let i=0;i<1800;i++)q.sample(100);
  assert.equal(q.tier,'balanced');
  q.setTier('lite');assert.equal(q.tier,'lite');
});
test('portal loading never reveals an unready chamber, then finishes correctly',()=>{
  let p=beginPortalTransition('vaitarani','hub',1.6);
  for(let i=0;i<30;i++)p=advancePortalTransition(p,0.2,false);
  assert.equal(p.state,'loading');
  assert.ok(p.elapsed<=p.duration*0.62+0.0001);
  for(let i=0;i<30;i++)p=advancePortalTransition(p,0.2,true);
  assert.equal(p.state,'finished');
  assert.equal(p.elapsed,p.duration);
  assert.equal(advancePortalTransition(p,2,true),p);
  assert.notEqual(portalPalette('deva').core,portalPalette('warden').core);
  assert.throws(()=>beginPortalTransition('deva','',1.6),/Invalid/);
});

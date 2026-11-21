import test from 'node:test';
import assert from 'node:assert/strict';
import {createDundubhiScene, createVrikodaraScene, createBossPhaseScene, validateCinematic, sampleCinematic, cuesBetween, MeruTimelinePlayer} from './cinematicTimeline';
import {MeruAdaptiveQuality,GRAPHICS_PRESETS} from './adaptiveQuality';
import {beginPortalTransition,advancePortalTransition,portalPalette} from './portalDirector';
import {shouldStartDundubhiIntro,shouldStartBossIntro,shouldStartBossPhase,meruStorageKey,meruSceneStorageKey,defaultBossIntro} from './runtimePolicy';

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
  assert.throws(()=>validateCinematic({...scene,camera:[...scene.camera].reverse()}),/increase|begin at/);
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
  assert.deepEqual(p.tick(2.5).cues.map(c=>c.id),['earth-impact','earth-sunder','reveal-title']);
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

test('Dundubhi intro launches only for live normal boss encounter',()=>{
  const base={chamberIndex:3,stage:'playing',hasDundubhi:true};
  assert.equal(shouldStartDundubhiIntro(base),true);
  assert.equal(shouldStartDundubhiIntro({...base,query:'?cinematic=0'}),false);
  assert.equal(shouldStartDundubhiIntro({...base,query:'?phase=2'}),false);
  assert.equal(shouldStartDundubhiIntro({...base,query:'?cleared=1'}),false);
  assert.equal(shouldStartDundubhiIntro({...base,query:'?wave=2'}),false);
  assert.equal(shouldStartDundubhiIntro({...base,stage:'title'}),false);
  assert.equal(shouldStartDundubhiIntro({...base,hasDundubhi:false}),false);
  assert.equal(shouldStartDundubhiIntro({...base,chamberIndex:0}),false);
});

test('Act I cinematics use actual game arena and painted poster assets, not phantom paths',()=>{
  const d=createDundubhiScene();
  const v=createVrikodaraScene();
  assert.equal(d.boss,'dundubhi');
  assert.equal(v.boss,'vrikodara');
  assert.equal(d.id,'dundubhi-entrance');
  assert.equal(v.id,'vrikodara-entrance');
  assert.equal(d.backgroundUrl,'/videos/Flames_flickering_around_stone_f_09be2052.mp4');
  assert.equal(d.posterUrl,'/arenas/Gemini_Generated_Image_bc2kjfbc2kjfbc2k.png');
  assert.equal(v.backgroundUrl,'/videos/Animate_mythological_game_enviro_f7acefd6_1080p.mp4');
  assert.equal(v.posterUrl,'/assets/aistudio/Gemini_Generated_Image_plgsv7plgsv7plgs.png');
  assert.equal(validateCinematic(v).id,v.id);
  assert.equal(defaultBossIntro('vrikodara').id,v.id);
  assert.notEqual(meruStorageKey('dundubhi'),meruStorageKey('vrikodara'));
  for(const scene of [d,v]) {
    for(let t=0;t<=scene.duration;t+=0.035){
      const frame=sampleCinematic(scene,t);
      assert.ok(Number.isFinite(frame.camera.zoom));
      assert.ok(frame.actor.opacity>=0&&frame.actor.opacity<=1);
    }
  }
});
test('Vrikodara cinematic starts only for a live Chamber VIII phase-1 boss',()=>{
  const base={boss:'vrikodara' as const,chamberIndex:7,stage:'playing',hasBoss:true};
  assert.equal(shouldStartBossIntro(base),true);
  assert.equal(shouldStartBossIntro({...base,chamberIndex:3}),false);
  assert.equal(shouldStartBossIntro({...base,hasBoss:false}),false);
  assert.equal(shouldStartBossIntro({...base,stage:'title'}),false);
  for(const query of ['?phase=2','?cleared=1','?cinematic=0','?wave=2'])
    assert.equal(shouldStartBossIntro({...base,query}),false);
});
test('scene URL whitelist rejects external URLs and parent traversal for both bosses',()=>{
  const v=createVrikodaraScene();
  for(const bad of ['/assets/aistudio/../../private.png','//attacker/scene.png',
    'https://attacker.example/evil.png','/scripts/main.js']){
    assert.throws(()=>validateCinematic({...v,posterUrl:bad}),/URL/);
  }
});

test('editor-authored cue at zero fires once on play, not on pause or seek',()=>{
  const base=createDundubhiScene();
  const scene=validateCinematic({...base,cues:[
    ...base.cues,{id:'opening-sound',time:0,kind:'drum'},
  ]});
  const p=new MeruTimelinePlayer(scene);
  p.play();
  assert.deepEqual(p.tick(0.015).cues.map(c=>c.id),['opening-sound']);
  assert.deepEqual(p.tick(0.015).cues,[]);
  p.pause();
  assert.deepEqual(p.tick(3).cues,[]);
  p.play(); // Resuming from t>0 cannot re-fire the start sound.
  assert.deepEqual(p.tick(0.015).cues,[]);
  p.seek(0);p.pause();p.play();
  assert.deepEqual(p.tick(0.015).cues.map(c=>c.id),['opening-sound']);
});

test('all four phase reveals are validated, distinct, animated using the real rig and MP4 artwork',()=>{
  for(const kind of ['dundubhi','vrikodara'] as const){
    const intro=defaultBossIntro(kind);
    for(const phase of [2,3] as const){
      const scene=createBossPhaseScene(kind,phase);
      assert.equal(scene.boss,kind);
      assert.equal(scene.bossPhase,phase);
      assert.equal(validateCinematic(scene).id,scene.id);
      assert.ok(scene.duration>=3&&scene.duration<=5);
      assert.notEqual(scene.id,intro.id);
      assert.notEqual(meruSceneStorageKey(scene),meruStorageKey(kind));
      assert.ok(scene.cues.some(c=>c.kind==='impact'));
      assert.ok(scene.cues.some(c=>c.kind==='subtitle'));
      assert.ok(scene.backgroundUrl.startsWith('/videos/'));
      for(let t=0;t<=scene.duration;t+=0.05){
        const f=sampleCinematic(scene,t);
        assert.ok(f.camera.zoom>=0.2&&f.camera.zoom<=4);
        assert.ok(f.actor.opacity>=0&&f.actor.opacity<=1);
      }
      assert.throws(()=>validateCinematic({...scene,bossPhase:4}),/boss phase/);
      assert.throws(()=>validateCinematic({...scene,bossPhase:'2'}),/boss phase/);
    }
  }
  const eclipse=createBossPhaseScene('vrikodara',2);
  assert.equal(eclipse.backgroundUrl,'/videos/Furnaces_spewing_flames_and_slag_baeefd93_1080p.mp4');
  assert.equal(eclipse.posterUrl,'/arenas/Gemini_Generated_Image_3ay6rk3ay6rk3ay6.png');
});
test('boss phase reveals never launch on title, wrong chamber, dead rig or debug phase',()=>{
  const active={boss:'vrikodara' as const,phase:2 as const,chamberIndex:7,stage:'playing',hasBoss:true};
  assert.equal(shouldStartBossPhase(active),true);
  assert.equal(shouldStartBossPhase({...active,stage:'title'}),false);
  assert.equal(shouldStartBossPhase({...active,hasBoss:false}),false);
  assert.equal(shouldStartBossPhase({...active,chamberIndex:3}),false);
  assert.equal(shouldStartBossPhase({...active,query:'?cinematic=0'}),false);
  assert.equal(shouldStartBossPhase({...active,query:'?phase=2'}),false);
  assert.equal(shouldStartBossPhase({...active,query:'?cleared=1'}),false);
  assert.equal(meruSceneStorageKey(createDundubhiScene()),meruStorageKey('dundubhi'));
});

test('authored entrance impacts align with their visual beat and remain in camera space',()=>{
  const scenes=[
    createDundubhiScene(),createVrikodaraScene(),
    createBossPhaseScene('dundubhi',2),createBossPhaseScene('dundubhi',3),
    createBossPhaseScene('vrikodara',2),createBossPhaseScene('vrikodara',3),
  ];
  for(const scene of scenes){
    const audioImpacts=scene.cues.filter(c=>c.kind==='impact');
    const visualImpacts=scene.cues.filter(c=>c.kind==='vfx');
    assert.ok(audioImpacts.length>=1,scene.id+' has an authored impact sound');
    assert.ok(visualImpacts.length>=1,scene.id+' has an authored visual impact');
    assert.ok(audioImpacts.some(sound=>visualImpacts.some(vfx=>Math.abs(sound.time-vfx.time)<=0.05)),
      scene.id+' visual and audible impacts remain synchronized');
    assert.ok(visualImpacts.every(c=>['earth-sunder','blood-furnace','ward-break'].includes(c.payload??'')),
      scene.id+' only uses palette-authored, bounded ink impact effects');
  }
});

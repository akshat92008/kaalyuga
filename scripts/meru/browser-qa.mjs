import { chromium } from 'playwright';
import { readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { join } from 'node:path';

const out='artifacts/meru-browser';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];
try{
  const context=await browser.newContext({viewport:{width:1440,height:900},acceptDownloads:true});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto('http://127.0.0.1:3000/meru-studio',{waitUntil:'domcontentloaded',timeout:90000});
  assert.equal(response?.status(),200,'Meru editor route should return HTTP 200');
  await page.getByRole('heading',{name:'Cinematic Studio'}).waitFor({timeout:25000});
  await page.getByRole('button',{name:'Play scene'}).click();
  await page.getByRole('button',{name:'Pause'}).waitFor();
  await page.getByRole('button',{name:'Pause'}).click();
  await page.getByRole('button',{name:'Restart'}).click();
  await page.getByRole('heading',{name:'Inspector · current playhead'}).waitFor();
  const downloadP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const download=await downloadP;
  await download.saveAs(join(out,'exported-dundubhi.meru.json'));
  const data=JSON.parse(await readFile(join(out,'exported-dundubhi.meru.json'),'utf8'));
  assert.equal(data.schemaVersion,1);
  assert.equal(data.boss,'dundubhi');
  assert.ok(data.camera.length>=3);
  assert.ok(data.pose?.length>=4,'Original rig includes authored skeletal choreography');
  await page.screenshot({path:join(out,'meru-studio.png'),fullPage:true,animations:'disabled'});
  // Author actual FBX joint rotations and a hard camera cut through UI,
  // export and validate the result. No synthetic scene or isolated harness.
  const armControl=page.getByLabel('Weapon-arm lift');
  await armControl.focus();
  await page.keyboard.press('ArrowRight');
  await page.locator('button[title="camera at 3.00s"]').click();
  await page.getByRole('button',{name:'Insert camera cut at playhead'}).click();
  const choreoExportP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const choreoExport=await choreoExportP;
  await choreoExport.saveAs(join(out,'exported-dundubhi-choreography.meru.json'));
  const choreoData=JSON.parse(await readFile(join(out,'exported-dundubhi-choreography.meru.json'),'utf8'));
  assert.ok(choreoData.pose[0].value.rightArmLift>data.pose[0].value.rightArmLift,
    'Studio joint control must persist to exported real-rig pose tracks');
  assert.equal(choreoData.camera[0].ease,'step',
    'Director camera cut must produce a discontinuous camera track');
  await page.screenshot({path:join(out,'meru-studio-choreography.png'),fullPage:true,animations:'disabled'});
  console.log('MERU_DIRECTOR_QA: editable rig joint keyframes, hard camera cut, export and roundtrip PASS');
  await page.getByLabel('Retime entire scene').focus();
  await page.keyboard.press('ArrowRight'); // 8.0s -> 8.5s
  const retimeExportP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const retimeDownload=await retimeExportP;
  await retimeDownload.saveAs(join(out,'exported-dundubhi-retimed.meru.json'));
  const retimed=JSON.parse(await readFile(join(out,'exported-dundubhi-retimed.meru.json'),'utf8'));
  assert.equal(retimed.duration,8.5,'Director retiming control must affect scene duration');
  assert.ok(Math.abs(retimed.cues.find(c=>c.id==='earth-impact').time-5.15*8.5/8)<0.000001);
  assert.equal(retimed.pose.at(-1).time,8.5,'Final skeletal pose stays on new cutscene endpoint');
  // An editor needs to remove accidental keyframes without invalidating t=0.
  const middleCamera=retimed.camera[1].time.toFixed(2);
  await page.locator('button[title="camera at '+middleCamera+'s"]').click();
  await page.getByLabel('Track for keyframe deletion').selectOption('camera');
  await page.getByRole('button',{name:'Delete keyframe at playhead'}).click();
  const trimmedP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const trimmedDownload=await trimmedP;
  await trimmedDownload.saveAs(join(out,'exported-dundubhi-trimmed.meru.json'));
  const trimmed=JSON.parse(await readFile(join(out,'exported-dundubhi-trimmed.meru.json'),'utf8'));
  assert.equal(trimmed.camera.length,retimed.camera.length-1,'Removing a camera keyframe must persist');
  console.log('MERU_DIRECTOR_QA: retimed all cues and pose, removed selected camera keyframe PASS');


  // Meru should use the same real, proxy-mapped MP4 and poster as the actual
  // boss chamber. This check catches silent black/blank backgrounds.
  const checkSceneAssets=async(scene)=>{
    for(const asset of [scene.backgroundUrl,scene.posterUrl]){
      const assetResp=await page.request.head('http://127.0.0.1:3000'+asset,{timeout:60000});
      assert.ok(assetResp.status()===200||assetResp.status()===206,
        'Scene asset missing '+asset+' (HTTP '+assetResp.status()+')');
    }
  };
  await checkSceneAssets(data);
  // Capture a combined actual arena MP4/poster + rigged-character PNG, not an
  // image of only the transparent overlay. File integrity is verified.
  const pngPromise=page.waitForEvent('download',{timeout:30000});
  await page.getByRole('button',{name:'Capture current frame PNG'}).click();
  const pngDownload=await pngPromise;
  const pngPath=join(out,'meru-exported-composed-frame.png');
  await pngDownload.saveAs(pngPath);
  const pngBytes=await readFile(pngPath);
  assert.ok(pngBytes.length>10000,'Composed cinematic PNG must contain rendered content');
  assert.deepEqual([...pngBytes.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  // A reproducible local performance report helps the developer run QA on an
  // actual Mac; CI only verifies output shape, not any hardware FPS threshold.
  const perfPromise=page.waitForEvent('download',{timeout:15000});
  await page.getByRole('button',{name:'Export local frame pacing report'}).click();
  const perfDownload=await perfPromise;
  const perfPath=join(out,'meru-browser-frame-pacing.json');
  await perfDownload.saveAs(perfPath);
  const perfData=JSON.parse(await readFile(perfPath,'utf8'));
  assert.equal(perfData.format,'meru-frame-pacing-v1');
  assert.ok(perfData.frames.sampleCount>0,'Browser frame-pacing report must have real RAF samples');
  assert.ok(perfData.frames.p95Ms>=0);
  console.log('MERU_CAPTURE_QA: composed PNG and local frame-pacing export valid');
  // Independently authored Phase II scene must not overwrite Vrikodara's
  // entrance and must reuse the actual blood-eclipse MP4/poster assets.
  await page.getByLabel('Select boss cinematic').selectOption('vrikodara-phase2');
  await page.getByText('Camera A · Vrikodara — The Second Awakening').waitFor();
  const phaseExportP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const phaseExport=await phaseExportP;
  await phaseExport.saveAs(join(out,'exported-vrikodara-phase2.meru.json'));
  const phaseData=JSON.parse(await readFile(join(out,'exported-vrikodara-phase2.meru.json'),'utf8'));
  assert.equal(phaseData.bossPhase,2);
  assert.equal(phaseData.boss,'vrikodara');
  assert.ok(phaseData.pose?.some(k=>Math.abs(k.value.rightArmLift)>0.1),
    'Boss transformation scene must include a real arm performance');
  await checkSceneAssets(phaseData);
  await page.screenshot({path:join(out,'meru-vrikodara-phase2-editor.png'),fullPage:true,animations:'disabled'});
  await page.getByLabel('Select boss cinematic').selectOption('vrikodara');
  await page.getByText('Camera A · Vrikodara — Infernal Maw').waitFor();
  const vDownloadP=page.waitForEvent('download',{timeout:10000});
  await page.getByRole('button',{name:'Export scene JSON'}).click();
  const vDownload=await vDownloadP;
  await vDownload.saveAs(join(out,'exported-vrikodara.meru.json'));
  const vData=JSON.parse(await readFile(join(out,'exported-vrikodara.meru.json'),'utf8'));
  assert.equal(vData.boss,'vrikodara');
  assert.equal(vData.id,'vrikodara-entrance');
  await checkSceneAssets(vData);
  await page.screenshot({path:join(out,'meru-studio-vrikodara.png'),fullPage:true,animations:'disabled'});
  console.log('MERU_BROWSER_QA: Both bosses selectable; editor exports valid scenes; real MP4/poster assets resolve');
    console.log('MERU_BROWSER_QA: HTTP=200; play/pause/restart=OK; inspector=OK; export JSON=OK; screenshot=OK');
  console.log('MERU_BROWSER_QA: page errors:',errors.length, errors.slice(0,4));
  if(errors.length)throw new Error('Unhandled browser exceptions: '+errors.join(' | ').slice(0,1000));
  // Real project round trip: a validated Studio-authored scene must be loaded
  // by the actual combat arena, not merely export as JSON.
  data.title='Dundubhi QA Authored Entrance';
  // Long timeline for the manual Skip path: screenshots must not race the
  // successful automatic completion on software-rendered CI browsers.
  data.duration=30;
  await page.evaluate(serialized=>{
    window.localStorage.setItem('meru.studio.cinematic.v1',serialized);
  },JSON.stringify(data));
  // Real Act I integration: start directly at Chamber IV, then skip the cinematic.
  // We verify the game actually gives control back, not merely an isolated preview.
  const gamePage=await context.newPage();
  const gameErrors=[];
  gamePage.on('pageerror',e=>gameErrors.push(e.message));
  const gameResponse=await gamePage.goto('http://127.0.0.1:3000/?chamber=4&cinematic=1',{
    waitUntil:'domcontentloaded',timeout:120000
  });
  assert.equal(gameResponse?.status(),200,'Main Kaliyuga route should load');
  const dialog=gamePage.getByTestId('meru-boss-cinematic');
  await dialog.waitFor({timeout:90000});
  await gamePage.getByRole('dialog',{name:'Dundubhi QA Authored Entrance cinematic'}).waitFor();
  // Rendered screenshot must represent an actual animated boss, not an
  // unnoticed portrait fallback or the initial black loading overlay.
  const checkRigAndFrame=async(targetPage,label)=>{
    const selector='[data-testid="meru-boss-cinematic"]';
    await targetPage.waitForFunction(sel=>{
      const node=document.querySelector(sel);
      return node?.getAttribute('data-meru-rig-status')==='rigged';
    },selector,{timeout:60000}).catch(async e=>{
      const node=targetPage.getByTestId('meru-boss-cinematic');
      const detail=await node.getAttribute('data-meru-rig-detail').catch(()=>'(dialog missing)');
      throw new Error(label+' did not load its real FBX model. Detail: '+detail+'; '+e.message);
    });
    const rigStatus=await targetPage.getByTestId('meru-boss-cinematic').getAttribute('data-meru-rig-status');
    const startedWithRig=await targetPage.getByTestId('meru-boss-cinematic').getAttribute('data-meru-started-with-rig');
    const timeAtRig=await targetPage.getByTestId('meru-cinematic-clock').textContent();
    console.log('MERU_RIG_QA: '+label+' real-rig state='+rigStatus+'; first frame was rigged='+startedWithRig+'; visible at '+timeAtRig);
    assert.equal(startedWithRig,'yes',label+' started a cinematic before the 3D rig was ready');
    await targetPage.waitForFunction(()=>{
      const node=document.querySelector('[data-testid="meru-cinematic-clock"]');
      return node&&Number.parseFloat(node.textContent||'0')>=2.5;
    },null,{timeout:30000});
    const actualAfterAnimation=await targetPage.getByTestId('meru-boss-cinematic').getAttribute('data-meru-rig-status');
    assert.equal(actualAfterAnimation,'rigged',label+' lost its real 3D renderer after playback began');
  };
  await checkRigAndFrame(gamePage,'dundubhi');
  await gamePage.screenshot({path:join(out,'meru-ingame-dundubhi-intro.png'),animations:'disabled'});
  await gamePage.waitForFunction(()=>{
    const caption=document.querySelector('[data-testid="meru-accessible-caption"]');
    return (caption?.textContent??'').includes('DUNDUBHI');
  },null,{timeout:30000});
  console.log('MERU_ACCESSIBILITY_QA: gameplay screen-reader caption matches authored cinematic title');
  await gamePage.getByRole('button',{name:'Skip boss cinematic and begin combat'}).click();
  await dialog.waitFor({state:'detached',timeout:15000});
  console.log('MERU_GAMEPLAY_QA: chamber=4 intro visible; Skip releases overlay; HTTP=200');
  console.log('MERU_GAMEPLAY_QA: page errors:',gameErrors.length,gameErrors.slice(0,4));
  if(gameErrors.length)throw new Error('Game page exceptions: '+gameErrors.join(' | ').slice(0,1200));
  await gamePage.close();
  // Natural completion should be checked against the original eight-second
  // scene, not the deliberately extended Skip-test scene.
  data.duration=8;
  await page.evaluate(serialized=>{
    window.localStorage.setItem('meru.studio.cinematic.v1',serialized);
  },JSON.stringify(data));
  // A second visit verifies natural completion also unfreezes gameplay without
  // requiring the player to press Skip.
  const naturalPage=await context.newPage();
  naturalPage.on('pageerror',e=>gameErrors.push(e.message));
  await naturalPage.goto('http://127.0.0.1:3000/?chamber=4&cinematic=1',{
    waitUntil:'domcontentloaded',timeout:120000,
  });
  const naturalDialog=naturalPage.getByTestId('meru-boss-cinematic');
  await naturalDialog.waitFor({timeout:60000});
  await naturalDialog.waitFor({state:'detached',timeout:35000});
  console.log('MERU_GAMEPLAY_QA: natural completion releases cinematic and gameplay; authored Studio scene loaded');
  assert.equal(gameErrors.length,0,'Game QA should not throw unhandled browser errors');
  await naturalPage.close();

  // Same gameplay contract for the Act I final boss: an authored Vrikodara
  // scene must play in Chamber VIII and be skippable without combat errors.
  vData.title='Vrikodara QA Authored Entrance';
  vData.duration=30;
  await page.evaluate(serialized=>{
    window.localStorage.setItem('meru.studio.cinematic.vrikodara.v1',serialized);
  },JSON.stringify(vData));
  const vrikodaraPage=await context.newPage();
  const vrikodaraErrors=[];
  vrikodaraPage.on('pageerror',e=>vrikodaraErrors.push(e.message));
  const vGameResponse=await vrikodaraPage.goto('http://127.0.0.1:3000/?chamber=8&cinematic=1',{
    waitUntil:'domcontentloaded',timeout:120000,
  });
  assert.equal(vGameResponse?.status(),200);
  await vrikodaraPage.getByRole('dialog',{name:'Vrikodara QA Authored Entrance cinematic'}).waitFor({timeout:90000});
  await checkRigAndFrame(vrikodaraPage,'vrikodara');
  await vrikodaraPage.screenshot({path:join(out,'meru-ingame-vrikodara-intro.png'),animations:'disabled'});
  await vrikodaraPage.getByRole('button',{name:'Skip boss cinematic and begin combat'}).click();
  await vrikodaraPage.getByTestId('meru-boss-cinematic').waitFor({state:'detached',timeout:15000});
  assert.equal(vrikodaraErrors.length,0,'Vrikodara game encounter should not throw');
  console.log('MERU_GAMEPLAY_QA: Chamber VIII loads authored Vrikodara cinematic; Skip releases combat; browser errors=0');
  await vrikodaraPage.close();

  // Exercise the ACTUAL walkable ferry portal, not a mocked Meru component.
  // Keep the movement key held until Rudra enters the northern gate. The UI
  // must stop input, preload its next chamber poster and return playable state.
  const ferryPage=await context.newPage();
  const ferryErrors=[];
  ferryPage.on('pageerror',e=>ferryErrors.push(e.message));
  const ferryResponse=await ferryPage.goto('http://127.0.0.1:3000/?hub=1&cinematic=0',{
    waitUntil:'domcontentloaded',timeout:120000,
  });
  assert.equal(ferryResponse?.status(),200,'Walkable Vaitarani hub must load');
  await ferryPage.waitForFunction(()=>document.body.dataset.state==='playing',null,{timeout:45000});
  const journey=ferryPage.getByTestId('meru-portal-travel');
  await ferryPage.keyboard.down('w');
  try{
    await journey.waitFor({timeout:60000});
  }finally{
    await ferryPage.keyboard.up('w');
  }
  assert.match(await journey.getAttribute('aria-label')||'',/CHAR(NEL|NEL PLAINS)/i);
  const initialSwitched=await journey.getAttribute('data-meru-portal-switched');
  assert.equal(initialSwitched,'no','Destination must not swap before the portal begins');
  await ferryPage.screenshot({path:join(out,'meru-hub-portal-journey.png'),animations:'disabled'});
  await ferryPage.getByRole('button',{name:'Accelerate portal passage when ready'}).click();
  await journey.waitFor({state:'detached',timeout:30000});
  await ferryPage.waitForFunction(()=>document.body.dataset.state==='playing',null,{timeout:30000});
  assert.equal(ferryErrors.length,0,
    'Walking into Vaitarani gate and completing portal cannot throw browser errors');
  console.log('MERU_PORTAL_QA: Vaitarani walk-to-gate, poster gate, Skip, real chamber handoff, input release PASS');
  await ferryPage.close();

  // Act I story sequence runs the exact component now mounted in the actual
  // preserver_interlude. The preview route does not mutate combat saves.
  const storyPage=await context.newPage();
  const storyErrors=[];
  storyPage.on('pageerror',error=>storyErrors.push(error.message));
  const storyResponse=await storyPage.goto('http://127.0.0.1:3000/meru-story-preview',{
    waitUntil:'domcontentloaded',timeout:90000,
  });
  assert.equal(storyResponse?.status(),200,'Meru story director preview must resolve');
  const film=storyPage.getByTestId('meru-story-cinematic');
  await film.waitFor({timeout:25000});
  assert.equal(await film.getAttribute('data-meru-story-shot'),'rudra-looks-up');
  assert.equal(await storyPage.locator('video').count(),1,
    'MacBook Air cinematic must use only one video decoder');
  await storyPage.waitForFunction(()=>{
    return document.querySelector('[data-testid="meru-story-cinematic"]')
      ?.getAttribute('data-meru-story-shot')==='rudra-close';
  },null,{timeout:16000});
  await storyPage.screenshot({path:join(out,'meru-preserver-four-shot-preview.png'),animations:'disabled'});
  await storyPage.getByRole('button',{name:'Skip Preserver memory and return to combat'}).click();
  await film.waitFor({state:'detached',timeout:5000});
  await storyPage.getByText('Playback completed.',{exact:false}).waitFor();
  // Accessibility: reduced-motion preview uses source painting only; there
  // must not be a hidden looping MP4 decoding behind the requested still.
  await storyPage.emulateMedia({reducedMotion:'reduce'});
  await storyPage.getByRole('button',{name:'Replay four-shot cinematic'}).click();
  await film.waitFor();
  assert.equal(await film.getAttribute('data-meru-story-clip-status'),'still');
  assert.equal(await storyPage.locator('video').count(),0);
  assert.match(await storyPage.locator('#meru-story-narration').textContent()??'',/sky opened/i);
  await storyPage.getByRole('button',{name:'Skip Preserver memory and return to combat'}).click();
  assert.equal(storyErrors.length,0,'Preserver film must not cause uncaught browser errors');
  console.log('MERU_STORY_QA: four-shot narrative film, timed cut, story handoff, one decoder, reduced-motion fallback PASS');
  await storyPage.close();

}finally{await browser.close();}

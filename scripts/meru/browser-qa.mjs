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
  await page.screenshot({path:join(out,'meru-studio.png'),fullPage:true,animations:'disabled'});
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
  await gamePage.screenshot({path:join(out,'meru-ingame-dundubhi-intro.png'),animations:'disabled'});
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

}finally{await browser.close();}

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
}finally{await browser.close();}

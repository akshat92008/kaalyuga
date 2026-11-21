/**
 * Actual production-browser Dundubhi charge traversal audit.
 *
 * Does not mutate enemies or spawn debug targets: lets the boss AI approach and
 * attack naturally from the canonical Chapter 4 room. Runs in headless
 * SwiftShader; timing is NOT a GPU performance claim about the user's Mac.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const base = process.env.ACT1_QA_BASE || 'http://127.0.0.1:3000';
const out = path.resolve(process.env.ACT1_QA_OUTPUT || 'artifacts/act1-dundubhi');
const limit = Number(process.env.ACT1_QA_TIMEOUT_MS || 240000);
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({headless: true, args: [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl',
  '--disable-dev-shm-usage', '--no-sandbox',
]});
const page = await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[];
page.on('pageerror', e=>errors.push(e.message));
const report = { checkedAt:new Date().toISOString(),
  browserVersion:browser.version(), platform:process.platform, chamber:4,
  warning:'SwiftShader visuals and timings are not measurements of physical Mac GPU performance.',
  result:'not_finished', errors:[], trace:[], movement:null };
try {
  await page.goto(base+'/?autostart=1&chamber=4&perf=1',{
    waitUntil:'domcontentloaded',timeout:60000,
  });
  await page.waitForFunction(() =>
    document.body.dataset.state === 'playing' &&
    (window.__KALIYUGA_ACT1_PERF__?.samples || 0) >= 18,
    null,{timeout:90000}
  );
  // Avoid input cheating: just let the natural boss attack cycle play.
  // Capture the first complete charge trace; it survives its 420ms movement
  // inside an opt-in 96-sample ring even if the next telemetry tick is later.
  await page.waitForFunction(() => {
    const trace = window.__KALIYUGA_ACT1_PERF__?.bossChargeTrace || [];
    return trace.some(x=>x.chamber===4 && x.phase==='launch') &&
      trace.some(x=>x.chamber===4 && x.phase==='impact');
  }, null, {timeout:limit,polling:250});
  const raw = await page.evaluate(() =>
    window.__KALIYUGA_ACT1_PERF__?.bossChargeTrace || []
  );
  const trace = raw.filter(x=>x.chamber===4);
  const launchIndex = trace.findIndex(x=>x.phase==='launch');
  const impactIndex = trace.findIndex((x,i)=>i>launchIndex && x.phase==='impact');
  const segment=trace.slice(launchIndex,impactIndex+1);
  const steps=segment.filter(x=>x.phase==='step');
  const launch=segment[0], impact=segment.at(-1);
  const displacement=Math.hypot(impact.x-launch.x,impact.y-launch.y);
  const intermediate = steps.filter(x=>x.progress>0.05 && x.progress<0.95);
  const uniquePositions=new Set(steps.map(x=>Math.round(x.x*10)+','+Math.round(x.y*10)));
  const numReversals=steps.reduce((total,x,i)=>{
    if(i===0)return total;
    const a=Math.hypot(x.x-launch.x,x.y-launch.y);
    const b=Math.hypot(steps[i-1].x-launch.x,steps[i-1].y-launch.y);
    return total+(a+0.001<b?1:0);
  },0);
  report.trace=segment;
  report.movement={
    elapsedSteps:steps.length,intermediateSteps:intermediate.length,
    distinctPositions:uniquePositions.size,displacementPx:Number(displacement.toFixed(2)),
    reversedFrames:numReversals,hitPlayer:Boolean(impact.contactPlayer),
    launch:{x:launch.x,y:launch.y},impact:{x:impact.x,y:impact.y}
  };
  await page.screenshot({path:path.join(out,'dundubhi-post-charge.png'),
    animations:'disabled',timeout:45000});
  if(steps.length<3 || intermediate.length<2 || uniquePositions.size<3 ||
    displacement<20 || numReversals>1){
    throw new Error('Charge did not show multiple progressive world-space steps: '+
      JSON.stringify(report.movement));
  }
  if(errors.length) throw new Error('Browser exceptions: '+errors.slice(0,3).join(' | '));
  report.result='passed';
}catch(error){
  report.result='failed';
  report.errors.push(String(error.message||error));
  report.errors.push(...errors.slice(0,20));
  try {
    await page.screenshot({path:path.join(out,'dundubhi-failure.png'),
      animations:'disabled',timeout:20000});
  }catch{}
  process.exitCode=1;
}finally{
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:report.result,movement:report.movement,
    errors:report.errors},null,2));
  await page.close();
  await browser.close();
}

/* Act I smoke capture on a real browser against a built app.
 * Never treats software-renderer FPS as MacBook performance.
 * Use: npm run start (localhost:3000) + node scripts/act1-browser-smoke.mjs
 * Install Playwright locally with: npm install --no-save playwright && npx playwright install chromium
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const outDir = path.resolve(process.env.ACT1_SMOKE_OUTPUT || 'artifacts/act1-browser');
const base = process.env.ACT1_SMOKE_BASE || 'http://127.0.0.1:3000';
const raw = process.env.ACT1_SMOKE_CHAMBERS || '1,4,8';
const preset = process.env.ACT1_SMOKE_PRESET || 'performance';
if (!['performance','balanced','ultra'].includes(preset)) throw new Error('Unknown Act I QA preset: '+preset);
const chambers = raw.split(',').map(Number).filter(x => Number.isInteger(x) && x >= 1 && x <= 8);
const maxWaitMs = Number(process.env.ACT1_SMOKE_TIMEOUT || 85000);
await fs.mkdir(outDir, {recursive:true});
const browser = await chromium.launch({ headless:true, args:[
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl',
  '--disable-dev-shm-usage', '--no-sandbox'
] });
const result = {
  runAt: new Date().toISOString(),
  platform:process.platform, browserVersion:browser.version(),
  note:'Headless CI SwiftShader timings are NOT representative of Mac M3 Air FPS.',
  requestedPreset:preset,
  chambers:[],
};
let failures = 0;
try {
  for (const chamber of chambers) {
    const page = await browser.newPage({viewport:{width:1280,height:720}, deviceScaleFactor:1});
    const errors = [];
    const misses = [];
    const failuresDuringNavigation=[];
    page.on('pageerror', e => errors.push(e.message.slice(0,300)));
    page.on('response', response => {
      if (response.status() >= 400) misses.push({status:response.status(),url:response.url().slice(0,170)});
    });
    page.on('requestfailed', request =>
      failuresDuringNavigation.push({url:request.url().slice(0,170),reason:request.failure()?.errorText}));
    let ready=false, telemetry=null, state=null, inputGate=null;
    let start = Date.now();
    try {
      await page.goto(base+'/?autostart=1&chamber='+chamber+'&perf=1',
          {waitUntil:'domcontentloaded',timeout:60000});
      await page.waitForFunction(() => document.body.dataset.state === 'playing',
          null,{timeout:maxWaitMs});
      await page.waitForFunction(() =>
         (window.__KALIYUGA_ACT1_PERF__?.samples || 0) >= 18,
         null,{timeout:maxWaitMs});
      ready=true;
      // Drive the same player-visible quality control used in the actual game.
      // Initial saved tier in a fresh headless context is ultra (cinematic).
      if (preset !== 'ultra') {
        await page.getByTestId('hud-controls-btn').click({timeout:20000});
        const qaButton = page.getByTestId('act1-quality-profile');
        const clicks = preset === 'performance' ? 1 : 2;
        for (let j=0;j<clicks;j++) await qaButton.click({timeout:20000});
      }
      // This checks the *applied engine tier*, not merely the button caption.
      await page.waitForFunction(
        desired => window.__KALIYUGA_ACT1_PERF__?.graphicsTier === desired,
        preset, {timeout:20000}
      );
      // Actual input-isolation check: the Controls popover pauses the game.
      // With it open, J/K/Q MUST NOT change combat actions or spend Astra.
      await page.waitForFunction(
        () => window.__KALIYUGA_ACT1_PERF__?.combat?.modalPaused === true,
        null, {timeout:20000}
      );
      const beforeMenu = await page.evaluate(() => window.__KALIYUGA_ACT1_PERF__.combat);
      for (const key of ['j','k','q']) await page.keyboard.press(key);
      await page.waitForTimeout(750);
      const duringMenu = await page.evaluate(() => window.__KALIYUGA_ACT1_PERF__?.combat);
      if (!duringMenu ||
          beforeMenu.attackSerial !== duringMenu.attackSerial ||
          beforeMenu.astraEnergy !== duringMenu.astraEnergy) {
        throw new Error('Blocked menu leaked a combat key into Rudra state');
      }
      // Escape must close the overlay without pausing the game, then J must work.
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        () => window.__KALIYUGA_ACT1_PERF__?.combat?.modalPaused === false,
        null, {timeout:20000}
      );
      await page.keyboard.press('j');
      await page.waitForFunction(
        previous => (window.__KALIYUGA_ACT1_PERF__?.combat?.attackSerial || 0) > previous,
        beforeMenu.attackSerial, {timeout:20000}
      );
      inputGate={blockedKeysChecked:['j','k','q'], modalPaused:true,
        escapeRestoredPlay:true, lightAttackAcceptedAfterClose:true};
      await page.keyboard.down('d');
      await page.waitForTimeout(300);
      await page.keyboard.up('d');
      await page.waitForTimeout(1200);
      // A/B director checkpoints taken at the actual gameplay camera.
      // Does not claim these shots prove animations are frame-perfect.
      if (process.env.ACT1_SMOKE_COMBAT !== '0') {
        const combos = [
          ['light', 'j', 160],
          ['heavy', 'k', 230],
          ['agneyastra', 'q', 310],
        ];
        for (const [action, key, pauseMs] of combos) {
          await page.waitForTimeout(650);
          await page.keyboard.press(key);
          await page.waitForTimeout(pauseMs);
          await page.screenshot({
            path:path.join(outDir,'act1-ch'+chamber+'-'+action+'.png'),
            animations:'disabled',timeout:45000,
          });
        }
      }
    } catch (error) {
      errors.push('smoke-readiness: '+String(error.message||error).slice(0,240));
    }
    try {
      telemetry=await page.evaluate(()=>window.__KALIYUGA_ACT1_PERF__ || null);
      state=await page.evaluate(()=>({
        bodyState:document.body.dataset.state,
        canvases:document.querySelectorAll('canvas').length,
        canvasSize:[...document.querySelectorAll('canvas')].map(c=>[c.width,c.height]).slice(0,4),
        playerCanFocus:document.visibilityState==='visible'
      }));
      await page.screenshot({path:path.join(outDir,'act1-ch'+chamber+'.png'),
           animations:'disabled', timeout:45000});
    } catch (e) { errors.push('capture: '+String(e.message||e).slice(0,200)); }
    const record={chamber,preset,ready,elapsedMs:Date.now()-start,telemetry,state,inputGate,
       pageErrors:errors.slice(0,30),
       httpErrors:misses.slice(0,50),
       networkFailures:failuresDuringNavigation.slice(0,40)};
    result.chambers.push(record);
    await fs.writeFile(path.join(outDir,'ch'+chamber+'.json'),JSON.stringify(record,null,2));
    if (!ready || !telemetry || errors.length) failures++;
    await page.close();
  }
} finally {
  await browser.close();
}
result.failures=failures;
await fs.writeFile(path.join(outDir,'report.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failures) process.exitCode=1;

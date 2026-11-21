/* Kaliyuga Act I: real Chromium screenshots and live route interaction smoke. */
'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const OUTPUT = path.resolve(process.env.QA_OUTPUT || 'artifacts/act1-phase1-4');
fs.mkdirSync(OUTPUT, { recursive: true });
const base = process.env.GAME_URL || 'http://127.0.0.1:3100';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--disable-web-security']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const report = { browser: await browser.version(), checks: [], errors: [], screenshots: [] };
  page.on('pageerror', error => report.errors.push('Uncaught: ' + error.message));
  const capture = async (name) => {
    const file = name + '.png';
    await page.screenshot({ path: path.join(OUTPUT, file), fullPage: false });
    report.screenshots.push(file);
  };
  try {
    await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('start-odyssey-btn').waitFor({ timeout: 30000 });
    await capture('01-title-screen');
    report.checks.push('title loads');

    const assets = [
      '/kaalyuga/rudra/rigged.fbx',
      '/kaalyuga/parashu/weapon.fbx',
      '/kaalyuga/anims/rudra/attack1.fbx',
      '/kaalyuga/anims/rudra/heavy.fbx',
      '/animations/pro_melee_axe/standing%20melee%20attack%20downward.fbx',
    ];
    for (const asset of assets) {
      const response = await page.request.get(base + asset, { timeout: 30000 });
      assert.equal(response.status(), 200, 'Missing game asset ' + asset + ' HTTP ' + response.status());
    }
    report.checks.push('rig, axe, attack and fallback assets serve with HTTP 200');

    await page.getByTestId('start-odyssey-btn').click();
    await page.waitForTimeout(5500);
    await capture('02-live-game-after-start');
    report.checks.push('live-game start click and render');

    await page.goto(base + '/cinematic-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Play cinematic/i }).waitFor({ timeout: 30000 });
    await capture('03-dundubhi-before-play');
    await page.getByRole('button', { name: /Play cinematic/i }).click();
    await page.waitForTimeout(3200);
    await capture('04-dundubhi-reveal');
    await page.waitForTimeout(2900);
    await capture('05-dundubhi-impact');
    await page.getByRole('button', { name: 'Skip cinematic' }).click();
    assert.equal(await page.getByRole('button', { name: 'Skip cinematic' }).isDisabled(), true, 'Skip must restore idle state');
    await capture('06-dundubhi-after-skip');
    await page.getByRole('button', { name: /Replay cinematic/i }).click();
    await page.waitForTimeout(1200);
    await capture('07-dundubhi-restart');
    report.checks.push('Dundubhi cinematic play, impact, skip and replay');

    assert.equal(report.errors.length, 0, 'Uncaught page errors: ' + report.errors.join(' | '));
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.fatal = String(error.stack || error);
    try { await capture('failure-current-screen'); } catch { /* leave primary failure intact */ }
    throw error;
  } finally {
    fs.writeFileSync(path.join(OUTPUT, 'browser-verification.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify(report, null, 2));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

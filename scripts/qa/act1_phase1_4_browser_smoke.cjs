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

    // Real combat, not the isolated cinematic-lab. Use the game's existing direct
    // chamber debug route and assert the production WebGL director fired each element.
    await page.goto(base + '/?debug=1&chamber=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const qa = window.__kaliyugaPhaseQA;
      return qa && qa.state === 'playing' && qa.chamber === 1;
    }, null, { timeout: 35000 });
    await page.waitForTimeout(2600);
    await capture('08-live-combat-entry');
    report.checks.push('real combat arena loaded with debug QA snapshot');
    const qa = () => page.evaluate(() => window.__kaliyugaPhaseQA);
    const awaitIdle = async () => {
      await page.waitForFunction(() => {
        const snap = window.__kaliyugaPhaseQA;
        return snap && snap.action === 'idle';
      }, null, { timeout: 12000 });
      await page.waitForTimeout(90);
    };
    for (const attack of [
      { key: '1', name: 'agni-smash', element: 'agni' },
      { key: '2', name: 'vayu-green-gale', element: 'vayu' },
      { key: '3', name: 'vajra-thunder', element: 'vajra' },
    ]) {
      await awaitIdle();
      await page.keyboard.press(attack.key);
      await page.waitForTimeout(100);
      const pre = await qa();
      assert.equal(pre.stance, attack.key === '1' ? 'smash' : attack.key === '2' ? 'pillar' : 'thrust');
      const previous = pre.recentEvents.filter(e => e.name === 'heavy-contact').length;
      await page.keyboard.press('k');
      await page.waitForFunction(({ element, previous }) => {
        const q = window.__kaliyugaPhaseQA;
        return q && q.recentEvents.filter(e => e.name === 'heavy-contact').length > previous &&
          q.recentEvents.some(e => e.name === 'heavy-contact' && e.meta === element);
      }, { element: attack.element, previous }, { timeout: 12000 });
      await capture('09-' + attack.name + '-heavy-contact');
      report.checks.push('actual ' + attack.element + ' heavy contact event observed');
    }
    for (const attack of [
      { key: 'j', name: 'light-parashu' },
      { key: 'q', name: 'agneyastra-fire' },
      { key: 'e', name: 'vayavyastra-wind' },
      { key: 'r', name: 'vajrastra-thunder' },
      { key: '4', name: 'varuna-water-dragon' },
      { key: 'z', name: 'guardian-summon' },
    ]) {
      await awaitIdle();
      await page.keyboard.press(attack.key);
      await page.waitForTimeout(110);
      await capture('10-' + attack.name);
      report.checks.push('visual capture during ' + attack.name);
    }
    // A new direct boss room must start an actual game-world camera track.
    await page.goto(base + '/?debug=1&chamber=4', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.cameraKind === 'boss', null, { timeout: 30000 });
    await capture('11-live-dundubhi-boss-entrance');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.cameraKind === null, null, { timeout: 10000 });
    report.checks.push('actual boss entrance camera runs and skips safely in live game');
    await capture('12-live-boss-after-skip');

    await page.goto(base + '/cinematic-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Play cinematic/i }).waitFor({ timeout: 30000 });
    await capture('03-dundubhi-before-play');
    await page.getByRole('button', { name: /Play cinematic/i }).click();
    await page.waitForTimeout(3200);
    await capture('04-dundubhi-reveal');
    await page.waitForTimeout(2900);
    await capture('05-dundubhi-impact');
    // Screenshot and software-rendered FBX processing can take longer than the
    // 8.6s cinematic. Never treat an already-completed timeline as a skip bug.
    // Restart explicitly, then exercise skip while the timeline is RUNNING.
    await page.getByRole('button', { name: /Restart cinematic|Replay cinematic/i }).click();
    const skipButton = page.getByRole('button', { name: 'Skip cinematic' });
    await skipButton.waitFor({ state: 'visible' });
    assert.equal(await skipButton.isEnabled(), true, 'Fresh cinematic must be skippable');
    await skipButton.click({ timeout: 10000 });
    assert.equal(await skipButton.isDisabled(), true, 'Skip must restore idle state');
    await capture('06-dundubhi-after-skip');
    await page.getByRole('button', { name: /Replay cinematic/i }).click();
    await page.waitForTimeout(350);
    assert.equal(await skipButton.isEnabled(), true, 'Replay must restore an active, skippable cinematic');
    await capture('07-dundubhi-restart');
    report.checks.push('Dundubhi cinematic play, impact, in-progress skip and replay');

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

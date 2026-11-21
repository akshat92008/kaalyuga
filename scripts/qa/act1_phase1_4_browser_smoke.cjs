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
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
  const report = {
    browser: await browser.version(), checks: [], errors: [],
    screenshots: [], screenshotFailures: [], visualCoverageComplete: false,
  };
  page.on('pageerror', error => report.errors.push('Uncaught: ' + error.message));
  const capture = async (name) => {
    const file = name + '.png';
    // Software WebGL can stall GPU readback for >30s. A failed screenshot must
    // be recorded as MISSING VISUAL EVIDENCE, not obscure live combat failures.
    try {
      await page.screenshot({
        path: path.join(OUTPUT, file), fullPage: false,
        timeout: 14000, animations: 'disabled',
      });
      report.screenshots.push(file);
      return true;
    } catch (error) {
      report.screenshotFailures.push(name + ': ' + String(error.message || error).slice(0, 240));
      return false;
    }
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

    // Direct live combat with deterministic TEST-ONLY resources and frozen opponents.
    // This is still the production keyboard/weapon/Astra pipeline, not mock effects.
    await page.goto(base + '/?debug=1&qaFixtures=1&chamber=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => {
      const q = window.__kaliyugaPhaseQA;
      return q?.state === 'playing' && q.chamber === 1 && Boolean(window.__kaliyugaPhaseQAFixture);
    }, null, { timeout: 35000 });
    const qa = () => page.evaluate(() => window.__kaliyugaPhaseQA);
    const fixture = () => page.evaluate(() => window.__kaliyugaPhaseQAFixture.grantResources());
    const countEvent = async (name) => (await qa()).recentEvents.filter(e => e.name === name).length;
    const assertEvent = async (name, meta, before) => {
      await page.waitForFunction(({ name, meta, before }) => {
        const arr = window.__kaliyugaPhaseQA?.recentEvents || [];
        return arr.filter(e => e.name === name).length > before &&
          arr.some(e => e.name === name && e.meta === meta);
      }, { name, meta, before }, { timeout: 16000 });
    };
    await fixture();
    await page.waitForTimeout(1200);
    await capture('08-live-combat-entry');
    report.checks.push('real WebGL combat loaded, deterministic resources available');
    for (const attack of [
      { key: '1', name: 'agni-smash', element: 'agni', stance: 'smash' },
      { key: '2', name: 'vayu-green-gale', element: 'vayu', stance: 'pillar' },
      { key: '3', name: 'vajra-thunder', element: 'vajra', stance: 'thrust' },
    ]) {
      await fixture();
      await page.waitForTimeout(1000); // visual cooldown isolates individual element silhouettes
      await page.keyboard.press(attack.key);
      const pre = await qa();
      assert.equal(pre.stance, attack.stance, 'Stance switch did not reach gameplay');
      const before = await countEvent('heavy-contact');
      await page.keyboard.press('k');
      await assertEvent('heavy-contact', attack.element, before);
      await capture('09-' + attack.name + '-heavy-contact');
      report.checks.push('real ' + attack.element + ' heavy: stance, animation contact and screenshot');
    }
    await fixture();
    await page.waitForTimeout(950);
    const lightBefore = await countEvent('light-contact');
    await page.keyboard.press('j');
    await assertEvent('light-contact', 'thrust', lightBefore);
    await capture('10-light-parashu');
    report.checks.push('real light Parashu active-frame contact and screenshot');

    for (const astra of [
      { key: 'q', name: 'agneyastra-fire', id: 'agneyastra' },
      { key: 'e', name: 'vayavyastra-wind', id: 'vayavyastra' },
      { key: 'r', name: 'vajrastra-thunder', id: 'vajrastra' },
    ]) {
      await fixture();
      await page.waitForTimeout(980);
      const before = await countEvent('astra-invoked');
      await page.keyboard.press(astra.key);
      await assertEvent('astra-invoked', astra.id, before);
      // The cast event precedes WebGL's next animation frame; a screenshot
      // taken immediately at keydown can show NO VFX despite a valid cast.
      await page.waitForTimeout(240);
      await capture('10-' + astra.name);
      report.checks.push('real ' + astra.id + ' meter-spending Astra and screenshot');
    }

    await fixture();
    await page.waitForTimeout(950);
    const waterBefore = await countEvent('varuna-water-dragon');
    await page.keyboard.press('4');
    await assertEvent('varuna-water-dragon', 'varuna', waterBefore);
    await page.waitForTimeout(160);
    await capture('10-varuna-water-dragon');
    report.checks.push('real Varuna water-dragon input, VFX dispatch and screenshot');

    await fixture();
    await page.waitForTimeout(1100);
    await page.keyboard.press('z');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.transformRemaining > 0, null, { timeout: 9000 });
    const guardianBefore = await countEvent('heavy-contact');
    await page.keyboard.press('k');
    await assertEvent('heavy-contact', 'guardian', guardianBefore);
    await capture('10-guardian-heavy-contact');
    report.checks.push('real guardian transformation and guardian-element heavy contact');

    for (const variant of ['downward_crush', 'spin_360_cleave', 'impaling_lunge']) {
      await page.evaluate(v => window.__kaliyugaPhaseQAFixture.prepareExecution(v), variant);
      await page.waitForTimeout(750);
      const before = await countEvent('execution-contact');
      await page.keyboard.press('f');
      await assertEvent('execution-contact', variant, before);
      await capture('13-execution-' + variant);
      await page.waitForFunction(() =>
        window.__kaliyugaPhaseQA?.action === 'idle' &&
        window.__kaliyugaPhaseQA?.cameraKind === null,
        null, { timeout: 15000 }
      );
      const completed = await qa();
      assert.equal(
        completed.recentEvents.filter(e => e.name === 'execution-contact' && e.meta === variant).length,
        1,
        'Execution contact must commit exactly once: ' + variant
      );
      report.checks.push('live execution ' + variant + ': one contact and safe camera recovery');
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
    report.visualCoverageComplete = report.screenshotFailures.length === 0;
    report.passed = true;
    if (!report.visualCoverageComplete) {
      report.visualLimitation = 'Functional checks passed, but missing screenshot(s) still require rendered visual QA';
    }
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

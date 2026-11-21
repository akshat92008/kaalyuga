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
      // A transient PNG/WebGL readback stall should not erase VFX evidence.
      // Retry once using lower-cost JPEG encoding, while preserving the PNG
      // error when both readbacks fail so CI can reject incomplete coverage.
      const jpeg = name + '.jpg';
      try {
        await page.screenshot({
          path: path.join(OUTPUT, jpeg), type: 'jpeg', quality: 84,
          fullPage: false, timeout: 22000, animations: 'disabled',
        });
        report.screenshots.push(jpeg);
        return true;
      } catch (fallbackError) {
        report.screenshotFailures.push(
          name + ': PNG ' + String(error.message || error).slice(0, 120) +
          '; JPEG ' + String(fallbackError.message || fallbackError).slice(0, 120)
        );
        return false;
      }
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
    // Every stance must produce its own live light-attack contact. Previously
    // only Thrust was captured, leaving two weapon-combo styles unverified.
    for (const light of [
      { key: '1', stance: 'smash', screenshot: '10-smash-light-parashu' },
      { key: '2', stance: 'pillar', screenshot: '10-pillar-light-parashu' },
      { key: '3', stance: 'thrust', screenshot: '10-light-parashu' },
    ]) {
      await fixture();
      await page.waitForTimeout(950);
      await page.keyboard.press(light.key);
      const lightBefore = await countEvent('light-contact');
      await page.keyboard.press('j');
      await assertEvent('light-contact', light.stance, lightBefore);
      await capture(light.screenshot);
      report.checks.push('real ' + light.stance + ' light Parashu active-frame contact and screenshot');
    }

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
    // Skipping an authored execution camera must NOT skip damage or leave
    // Rudra input/camera permanently locked. Test against the real F key path.
    await page.evaluate(() => window.__kaliyugaPhaseQAFixture.prepareExecution('downward_crush'));
    const skipImpactBefore = await countEvent('execution-contact');
    await page.keyboard.press('f');
    await page.waitForFunction(
      () => window.__kaliyugaPhaseQA?.cameraKind === 'execution',
      null, { timeout: 8000 }
    );
    await page.keyboard.press('Escape');
    await page.waitForFunction(() =>
      window.__kaliyugaPhaseQA?.cameraKind === null &&
      window.__kaliyugaPhaseQA?.state === 'playing',
      null, { timeout: 8000 }
    );
    await assertEvent('execution-contact', 'downward_crush', skipImpactBefore);
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.action === 'idle',
      null, { timeout: 16000 });
    report.checks.push('Escape skips execution camera while preserving once-only finisher damage and input recovery');

    // Run the ACTUAL pre-fight narrative overlay and enter combat through its
    // visible ENGAGE DUNDUBHI button. A camera that expires behind dialogue
    // makes the boss entrance invisible even though the timeline unit test passes.
    await page.goto(base + '/?debug=1&qaFixtures=1&chamber=4', {
      waitUntil: 'domcontentloaded', timeout: 60000
    });
    await page.waitForFunction(() =>
      window.__kaliyugaPhaseQA?.state === 'playing' &&
      typeof window.__kaliyugaPhaseQAFixture?.prepareBossDialogue === 'function',
      null, { timeout: 30000 }
    );
    await page.waitForTimeout(1000); // let the loading overlay disappear
    await page.evaluate(() => window.__kaliyugaPhaseQAFixture.prepareBossDialogue('dundubhi'));
    await page.getByRole('button', { name: /ENGAGE DUNDUBHI/i }).waitFor({ timeout: 10000 });
    const cameraBeforeDialogue = await qa();
    assert.equal(cameraBeforeDialogue.cameraKind, 'boss');
    await page.waitForTimeout(950);
    const cameraDuringDialogue = await qa();
    assert.ok(
      Math.abs(cameraDuringDialogue.cameraElapsedSec - cameraBeforeDialogue.cameraElapsedSec) < 0.07,
      'The boss entrance played invisibly behind narrative dialogue'
    );
    await page.getByRole('button', { name: /ENGAGE DUNDUBHI/i }).click();
    await page.waitForFunction(() => {
      const q = window.__kaliyugaPhaseQA;
      return q?.sliceStage === 'combat_arena' &&
        q.cameraKind === 'boss' && q.cameraElapsedSec > 0.15;
    }, null, { timeout: 15000 });
    await capture('11-live-dundubhi-boss-entrance');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.cameraKind === null, null, { timeout: 10000 });
    report.checks.push('Dundubhi entrance is paused behind real dialogue, plays after ENGAGE, and skips safely');
    await capture('12-live-boss-after-skip');

    // The isolated lab is a 16:9 cinematic player plus controls. A 540px
    // viewport only captured the UPPER HALF of its actual animated canvas,
    // falsely making the boss look cropped and hiding the ground-contact shot.
    await page.setViewportSize({ width: 960, height: 820 });
    await page.goto(base + '/cinematic-lab', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByRole('button', { name: /Play cinematic/i }).waitFor({ timeout: 30000 });
    const cinematicViewport = await page.evaluate(() => {
      const canvas = document.querySelector('canvas[aria-label*="Animated entrance preview"]');
      const rect = canvas?.getBoundingClientRect();
      return { top: rect?.top ?? -1, bottom: rect?.bottom ?? Infinity, viewport: window.innerHeight };
    });
    assert.ok(
      cinematicViewport.top >= 0 &&
      cinematicViewport.bottom <= cinematicViewport.viewport - 20,
      'Full Dundubhi cinematic canvas must fit in the QA screenshot viewport'
    );
    report.checks.push('full 16:9 boss cinematic and ground contact are visible in screenshot viewport');
    await capture('03-dundubhi-before-play');
    await page.getByRole('button', { name: /Play cinematic/i }).click();
    // The FBX character and its MP4 arena must use an identical dolly.
    // This catches the former cutout bug: boss zoomed, scenery stayed fixed.
    await page.waitForFunction(() => {
      const layer = document.querySelector('[data-testid="dundubhi-camera-arena-layer"]');
      return layer && new DOMMatrixReadOnly(getComputedStyle(layer).transform).a > 1.035;
    }, null, { timeout: 24000 });
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
    await page.waitForFunction(() => {
      const layer = document.querySelector('[data-testid="dundubhi-camera-arena-layer"]');
      if (!layer) return false;
      const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform);
      return Math.abs(m.a - 1) < 0.005 && Math.abs(m.e) < 2 && Math.abs(m.f) < 2;
    }, null, { timeout: 16000 });
    report.checks.push('Dundubhi arena and FBX share one dolly; skip restores unzoomed video');
    await capture('06-dundubhi-after-skip');
    await page.getByRole('button', { name: /Replay cinematic/i }).click();
    await page.waitForTimeout(350);
    assert.equal(await skipButton.isEnabled(), true, 'Replay must restore an active, skippable cinematic');
    await capture('07-dundubhi-restart');
    report.checks.push('Dundubhi cinematic play, impact, in-progress skip and replay');

    assert.equal(report.errors.length, 0, 'Uncaught page errors: ' + report.errors.join(' | '));
    report.visualCoverageComplete = report.screenshotFailures.length === 0;
    if (!report.visualCoverageComplete) {
      throw new Error('Visual QA incomplete: ' + report.screenshotFailures.join(' | '));
    }
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

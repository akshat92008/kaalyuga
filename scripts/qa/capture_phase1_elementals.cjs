const fs = require('node:fs/promises');
const { chromium } = require('playwright');

async function main() {
  const directory = 'phase1-captures';
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: directory, size: { width: 1152, height: 720 } },
  });
  const video = page.video();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && /webgl|shader/i.test(message.text())) errors.push(message.text());
  });
  const screenshots = [];
  const weaponMotion = [];
  const combatPresentation = [];
  const captureFailures = [];
  const press = (key) => page.keyboard.press(key);
  async function capture(name) {
    await page.screenshot({ path: `${directory}/${name}.png` });
    screenshots.push(name);
  }
  async function ready(stance) {
    await page.waitForTimeout(950);
    await page.evaluate(() => window.__kaliyugaPhaseQAFixture.grantResources());
    await press(stance);
  }
  async function captureLight(element) {
    const previous = await page.evaluate(() => Math.max(0, ...window.__kaliyugaPhaseQA.recentEvents
      .filter((event) => event.name === 'light-contact')
      .map((event) => event.frameTime)));
    await press('KeyJ');
    await page.waitForFunction((last) => window.__kaliyugaPhaseQA.recentEvents.some(
      (event) => event.name === 'light-contact' && event.frameTime > last
    ), previous, { timeout: 15000 });
    await capture(`${element}-light`);
    await page.waitForTimeout(42);
    await capture(`${element}-light-release`);
  }
  async function captureRegularWeapons() {
    const weapons = [
      ['khanda_dual', 'Alt+Digit1', 'Digit2'],
      ['parashu', 'Alt+Digit2', 'Digit1'],
      ['trishula_great', 'Alt+Digit3', 'Digit3'],
    ];
    for (const [weapon, equipKey, stanceKey] of weapons) {
      await press(equipKey);
      await ready(stanceKey);
      for (const [attack, key] of [['light', 'KeyJ'], ['heavy', 'KeyK']]) {
        await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined, { timeout: 45000 });
        const previous = await page.evaluate(() => {
          window.__kaliyugaPhaseQAFixture.prepareStrikeTarget();
          window.__kaliyugaPhaseQAFixture.armWeaponCapture();
          return performance.now();
        });
        try {
          await press(key);
          await page.waitForFunction(({ weapon, attack, previous }) => {
            const qa = window.__kaliyugaPhaseQA;
            return window.__kaliyugaPhaseQAFixture.isWeaponFrameHeld() &&
              qa.chamber === 1 && qa.recentEvents.some((event) =>
                event.name === `weapon-${attack}-release` && event.meta === weapon && event.frameTime > previous &&
                Number.isFinite(event.contactX) && Number.isFinite(event.contactY)
              );
          }, { weapon, attack, previous }, { polling: 50, timeout: 45000 });
          const impact = await page.evaluate(() => window.__kaliyugaPhaseQA.combatImpact);
          combatPresentation.push({ weapon, attack, impact });
          const expected = attack === 'light' ? 'light_hit' : 'heavy_hit';
          if (impact.reactCount < 1 ||
              ![expected, 'heavy_hit', 'posture_break'].includes(impact.kind)) {
            captureFailures.push({ weapon, attack, impact });
          }
          await capture(`regular-${weapon}-${attack}`);
        } finally {
          await page.evaluate(() => window.__kaliyugaPhaseQAFixture.resumeWeaponCapture());
        }
        await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined, { timeout: 45000 });
        const samples = await page.evaluate(({ weapon, previous }) =>
          window.__kaliyugaPhaseQA.recentEvents.filter((event) =>
            event.name === 'weapon-blade-sample' && event.meta === weapon && event.frameTime > previous
          ).map(({ progress, contactX, contactY }) => ({ progress, contactX, contactY })), { weapon, previous });
        weaponMotion.push({ weapon, attack, samples });
        const usesBladeTrail = attack === 'light' || weapon !== 'khanda_dual';
        if (usesBladeTrail &&
            (samples.length < 2 || !samples.some((pose) =>
              Math.hypot(pose.contactX - samples[0].contactX, pose.contactY - samples[0].contactY) > 4))) {
          const failure = { weapon, attack, samples };
          captureFailures.push(failure);
          console.log('No blade follow-through sampled: ' + JSON.stringify(failure));
        }
      }
    }
    await press('Alt+Digit2');
  }
  async function captureVrikodaraBenchmark() {
    await page.goto('http://127.0.0.1:3100/?debug=1&qaFixtures=1&chamber=8',
      { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => {
      const qa = window.__kaliyugaPhaseQA;
      return qa?.state === 'playing' && qa.chamber === 8 && qa.rudra3dReady && qa.bossScreen &&
        window.__kaliyugaPhaseQAFixture;
    }, undefined, { timeout: 90000 });
    const faceBoss = page.getByRole('button', { name: /FACE VRIKODARA/ });
    if (await faceBoss.isVisible()) await faceBoss.click();
    await page.waitForFunction(() => window.__kaliyugaPhaseQA.sliceStage === 'combat_arena',
      undefined, { timeout: 20000 });
    await page.getByTestId('kaliyuga-canvas').focus();
    const prepare = () => page.evaluate(() => window.__kaliyugaPhaseQAFixture.prepareVrikodaraBenchmark());
    const idle = () => page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle',
      undefined, { timeout: 15000 });
    const latest = (name) => page.evaluate((eventName) => Math.max(0, ...window.__kaliyugaPhaseQA.recentEvents
      .filter((event) => event.name === eventName).map((event) => event.frameTime)), name);
    const contact = (name, meta, last) => page.waitForFunction(({ name, meta, last }) =>
      window.__kaliyugaPhaseQA.recentEvents.some((event) =>
        event.name === name && event.meta === meta && event.frameTime > last), { name, meta, last }, { timeout: 15000 });

    await prepare();
    await press('Digit1');
    await capture('vrikodara-benchmark-baseline');
    for (let step = 1; step <= 4; step++) {
      const lastHit = await latest('vrikodara-light-hit');
      await idle();
      await press('KeyJ');
      await contact('vrikodara-light-hit', String(step), lastHit);
      if (step === 4) await capture('vrikodara-light-combo-finish');
    }

    for (const [element, stance] of [['varuna', 'Digit1'], ['vayu', 'Digit2']]) {
      await idle();
      await prepare();
      await press(stance);
      if (element === 'varuna') {
        await press('Digit4');
        await page.waitForFunction(() => window.__kaliyugaPhaseQA.varunaInfusionRemaining > 0,
          undefined, { timeout: 15000 });
        await idle();
      }
      const lastHeavy = await latest('heavy-contact');
      await press('KeyK');
      await contact('heavy-contact', element, lastHeavy);
      await capture(`vrikodara-${element}-heavy`);
      await page.waitForTimeout(70);
      await capture(`vrikodara-${element}-wake`);
    }
  }
  try {
    await page.goto('http://127.0.0.1:3100/?debug=1&qaFixtures=1&chamber=1',
      { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.state === 'playing' &&
      window.__kaliyugaPhaseQA?.rudra3dReady && window.__kaliyugaPhaseQAFixture,
    undefined, { timeout: 90000 });
    const canvas = page.getByTestId('kaliyuga-canvas');
    await canvas.focus();
    await page.mouse.move(900, 510);
    await capture('arena-baseline');

    const cancelled = await page.evaluate(() => {
      window.__kaliyugaPhaseQAFixture.prepareStrikeTarget();
      const before = window.__kaliyugaPhaseQA.damageDealt;
      const key = (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      };
      key('KeyJ');
      const afterInput = window.__kaliyugaPhaseQA.damageDealt;
      key('Space');
      return { before, afterInput, action: window.__kaliyugaPhaseQA.action };
    });
    await page.waitForTimeout(140);
    const afterDodge = await page.evaluate(() => window.__kaliyugaPhaseQA.damageDealt);
    if (cancelled.before !== cancelled.afterInput || cancelled.before !== afterDodge || cancelled.action !== 'dodge') {
      throw Error('Cancelling light startup committed damage or failed to dodge: ' + JSON.stringify(cancelled));
    }
    await capture('light-startup-dodge-cancel');
    await captureRegularWeapons();

    for (const [element, stance, astra] of [
      ['agni', 'Digit1', 'KeyQ'],
      ['vayu', 'Digit2', 'KeyE'],
      ['vajra', 'Digit3', 'KeyR'],
      ['varuna', 'Digit1', 'Digit4'],
    ]) {
      await ready(stance);
      if (element === 'varuna') {
        await press(astra);
        await capture('varuna-cast');
        await page.waitForTimeout(930);
      }
      await captureLight(element);
      await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined, { timeout: 15000 });
      const previousHeavy = await page.evaluate(() => Math.max(0, ...window.__kaliyugaPhaseQA.recentEvents
        .filter((event) => event.name === 'heavy-contact')
        .map((event) => event.frameTime)));
      await press('KeyK');
      try {
        await page.waitForFunction(({ id, previous }) => window.__kaliyugaPhaseQA.recentEvents.some(
          (event) => event.name === 'heavy-contact' && event.meta === id && event.frameTime > previous
        ), { id: element, previous: previousHeavy }, { polling: 50, timeout: 45000 });
      } catch (error) {
        if (error.name !== 'TimeoutError') throw error;
        const facts = await page.evaluate(({ id, previous }) => {
          const { action, recentEvents } = window.__kaliyugaPhaseQA;
          return {
            action,
            observedContact: recentEvents.some((event) =>
              event.name === 'heavy-contact' && event.meta === id && event.frameTime > previous),
            recentEvents: recentEvents.slice(-5),
          };
        }, { id: element, previous: previousHeavy });
        if (!facts.observedContact) {
          captureFailures.push({ element, facts });
          console.log('Heavy capture did not observe the expected event: ' + JSON.stringify({ element, facts }));
        }
      }
      await capture(`${element}-heavy`);
      await page.waitForTimeout(85);
      await capture(`${element}-heavy-release`);
      if (element !== 'varuna') {
        await ready(stance);
        await press(astra);
        await page.waitForTimeout(element === 'vajra' ? 115 : 55);
        await capture(`${element}-astra`);
      }
    }
    await ready('Digit1');
    await press('KeyZ');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA?.transformRemaining > 0);
    await press('KeyK');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA.recentEvents.some(
      (event) => event.name === 'heavy-contact' && event.meta === 'guardian'
    ), undefined, { timeout: 15000 });
    await capture('guardian-heavy');
    await page.waitForTimeout(90);
    await capture('guardian-heavy-release');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined, { timeout: 15000 });
    await captureLight('guardian');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined, { timeout: 15000 });
    await page.evaluate(() => window.__kaliyugaPhaseQAFixture.preparePerfectParry());
    await press('ShiftLeft');
    await page.waitForFunction(() => window.__kaliyugaPhaseQA.combatImpact.inkKind === 'parry_clash',
      undefined, { polling: 50, timeout: 45000 });
    await capture('perfect-parry');

    for (const variant of ['downward_crush', 'spin_360_cleave', 'impaling_lunge']) {
      const previous = await page.evaluate((variant) => {
        window.__kaliyugaPhaseQAFixture.prepareExecution(variant);
        return performance.now();
      }, variant);
      await press('KeyF');
      await page.waitForFunction(({ variant, previous }) => {
        const qa = window.__kaliyugaPhaseQA;
        return qa.combatImpact.inkKind === 'execution' && qa.recentEvents.some(event =>
          event.name === 'execution-contact' && event.meta === variant && event.frameTime > previous);
      }, { variant, previous }, { polling: 50, timeout: 45000 });
      await capture(`execution-${variant}`);
    }
    await captureVrikodaraBenchmark();
    if (errors.length || captureFailures.length) throw Error(JSON.stringify({ errors, captureFailures }));
  } catch (error) {
    await capture('failure-current-screen');
    throw error;
  } finally {
    await fs.writeFile(`${directory}/report.json`, JSON.stringify({ screenshots, errors, captureFailures, weaponMotion, combatPresentation }, null, 2));
    try {
      await page.close();
      await video?.saveAs(`${directory}/phase1-combat-effects.webm`);
      await video?.delete();
    } finally {
      await browser.close();
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

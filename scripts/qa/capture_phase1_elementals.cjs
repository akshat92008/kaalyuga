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
        ), { id: element, previous: previousHeavy }, { timeout: 15000 });
      } catch {
        const facts = await page.evaluate(() => ({
          action: window.__kaliyugaPhaseQA.action,
          recentEvents: window.__kaliyugaPhaseQA.recentEvents.slice(-5),
        }));
        captureFailures.push({ element, facts });
        console.log('Heavy capture did not observe the expected event: ' + JSON.stringify({ element, facts }));
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
    await capture('perfect-parry');
    if (errors.length || captureFailures.length) throw Error(JSON.stringify({ errors, captureFailures }));
  } catch (error) {
    await capture('failure-current-screen');
    throw error;
  } finally {
    await fs.writeFile(`${directory}/report.json`, JSON.stringify({ screenshots, errors, captureFailures }, null, 2));
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

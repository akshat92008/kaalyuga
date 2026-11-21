const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright-core');

async function main() {
  const output = path.resolve(process.env.ARTIFACT_DIR || 'act1-captures');
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({
    channel: 'chrome',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const result = { errors: [], mediaFailures: [], rooms: [] };
  page.on('pageerror', error => result.errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && /\.(png|jpg|fbx|bin|mp4|mp3|wav)(\?|$)/i.test(response.url())) {
      result.mediaFailures.push({ url: response.url(), status: response.status() });
    }
  });
  try {
    const base = process.env.GAME_URL || 'http://127.0.0.1:3000';
    await page.goto(base + '/?chamber=1', { waitUntil: 'domcontentloaded' });
    for (let chamber = 1; chamber <= 8; chamber++) {
      const quality = ['balanced', 'performance', 'cinematic'][(chamber - 1) % 3];
      if (chamber > 1) {
        await page.getByTestId('hud-controls-btn').click();
        await page.getByRole('combobox', { name: 'Graphics quality' }).selectOption(quality);
        if (chamber === 5) await page.setViewportSize({ width: 960, height: 540 });
        await page.getByRole('button', { name: new RegExp('^CH ' + chamber + '(?: |$)') }).click();
      }
      await page.locator('[data-testid="kaliyuga-canvas"][data-chamber-id="' + chamber + '"]').waitFor({ timeout: 90000 });
      await page.getByTestId('hud-pause-btn').waitFor({ timeout: 90000 });
      await page.getByTestId('chamber-loader').waitFor({ state: 'hidden', timeout: 90000 });
      await page.keyboard.press('KeyJ');
      const timing = await page.evaluate(async () => {
        const intervals = [];
        let prev = await new Promise(requestAnimationFrame);
        for (let i = 0; i < 60; i++) {
          const now = await new Promise(requestAnimationFrame);
          intervals.push(now - prev);
          prev = now;
        }
        intervals.sort((a, b) => a - b);
        return { medianMs: intervals[29], p95Ms: intervals[56], state: document.body.dataset.state };
      });
      if (timing.state !== 'playing') throw new Error('Room ' + chamber + ' ended in ' + timing.state);
      result.rooms.push({ chamber, quality, resolution: page.viewportSize(), ...timing });
      console.log('Chamber', chamber, quality, JSON.stringify(timing));
      await page.screenshot({ path: path.join(output, 'chamber-' + chamber + '.png') });
      await page.getByTestId('hud-pause-btn').click();
      await page.waitForFunction(() => document.body.dataset.state === 'paused');
      await page.getByRole('button', { name: 'RESUME [ESC]' }).click();
      await page.waitForFunction(() => document.body.dataset.state === 'playing');
    }
    if (result.errors.length) throw new Error(result.errors.join('\n'));
  } finally {
    await fs.writeFile(path.join(output, 'measurements.json'), JSON.stringify(result, null, 2));
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });

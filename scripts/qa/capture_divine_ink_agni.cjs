const fs = require('node:fs/promises');
const { chromium } = require('playwright');
async function main() {
  const dir = 'divine-ink-captures';
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const report = [];
  try {
    for (const enabled of [false, true]) {
      const name = enabled ? 'divine-ink' : 'baseline';
      const page = await browser.newPage({viewport: {width:1440,height:900}, recordVideo:{dir,size:{width:1152,height:720}}});
      const video = page.video(), errors = [];
      let atlasLoaded = false;
      page.on('response', r => { if (r.url().endsWith('/vfx/divine-ink/agni-ribbon-atlas.png') && r.ok()) atlasLoaded = true; });
      page.on('pageerror', e => errors.push(String(e)));
      page.on('console', m => { if (m.type() === 'error' && /webgl|shader/i.test(m.text())) errors.push(m.text()); });
      try {
        await page.goto('http://127.0.0.1:3100/?debug=1&qaFixtures=1&chamber=1' + (enabled ? '&divineInk=1' : ''), {waitUntil:'domcontentloaded',timeout:90000});
        await page.waitForFunction(() => window.__kaliyugaPhaseQA?.state === 'playing' && window.__kaliyugaPhaseQA?.rudra3dReady && window.__kaliyugaPhaseQAFixture, undefined, {timeout:90000});
        await page.getByTestId('kaliyuga-canvas').focus();
        await page.mouse.move(900,510);
        await page.keyboard.press('Alt+Digit2');
        await page.keyboard.press('Digit1');
        await page.waitForTimeout(1000);
        if (enabled && !atlasLoaded) throw Error('Experimental atlas not loaded');
        await page.screenshot({path:dir+'/'+name+'-idle.png'});
        for (const [attack,key] of [['light','KeyJ'],['heavy','KeyK']]) {
          await page.waitForFunction(() => window.__kaliyugaPhaseQA.action === 'idle', undefined,{timeout:45000});
          const previous = await page.evaluate(() => {
            window.__kaliyugaPhaseQAFixture.grantResources();
            window.__kaliyugaPhaseQAFixture.prepareStrikeTarget();
            window.__kaliyugaPhaseQAFixture.armWeaponCapture();
            return performance.now();
          });
          try {
            await page.keyboard.press(key);
            await page.waitForFunction(({attack,previous}) => window.__kaliyugaPhaseQAFixture.isWeaponFrameHeld() &&
              window.__kaliyugaPhaseQA.recentEvents.some(e=>e.name === 'weapon-'+attack+'-release' && e.meta === 'parashu' && e.frameTime > previous),{attack,previous},{timeout:45000});
            await page.screenshot({path:dir+'/'+name+'-'+attack+'-contact.png'});
          } finally { await page.evaluate(()=>window.__kaliyugaPhaseQAFixture.resumeWeaponCapture()); }
          await page.waitForTimeout(85);
          await page.screenshot({path:dir+'/'+name+'-'+attack+'-wake.png'});
          report.push({name,attack,atlasLoaded,impact:await page.evaluate(()=>window.__kaliyugaPhaseQA.combatImpact)});
        }
        if(errors.length) throw Error(errors.join('\n'));
      } catch(e) {
        report.push({name,error:String(e),errors,atlasLoaded});
        await page.screenshot({path:dir+'/'+name+'-failure.png'}).catch(()=>{});
        throw e;
      } finally {
        await page.close();
        await video.saveAs(dir+'/'+name+'.webm');
        await video.delete();
      }
    }
  } finally { await fs.writeFile(dir+'/report.json',JSON.stringify(report,null,2)); await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1;});

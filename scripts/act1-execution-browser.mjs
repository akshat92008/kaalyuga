/**
 * Act I end-to-end F-key Downward Parashu Crush proof in production browser.
 *
 * The source chamber and real enemy rig/animation/VFX/damage/camera are not
 * mocked. A clearly labelled ?perf=1&qaExecution=1 condition positions the
 * EXISTING first enemy in a posture-broken state to make the interaction
 * deterministic; this is NOT evidence of ordinary combat stagger frequency.
 * No code alters the game when those diagnostic query parameters are absent.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const base=process.env.ACT1_QA_BASE || 'http://127.0.0.1:3000';
const variant=process.env.ACT1_QA_FINISHER || 'downward_crush';
if(!['downward_crush','spin_360_cleave','impaling_lunge'].includes(variant)){
  throw new Error('Invalid ACT1_QA_FINISHER '+variant);
}
const imageLabel=variant.replaceAll('_','-');
const out=path.resolve(process.env.ACT1_QA_OUTPUT || 'artifacts/act1-execution');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
  '--disable-dev-shm-usage','--no-sandbox',
]});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const pageErrors=[];
page.on('pageerror',e=>pageErrors.push(e.message));
const report={
  kind:'Act I '+variant+' production-renderer action',
  qaMode:'existing enemy is staged into posture break; execution itself is unmodified',
  browserVersion:browser.version(),platform:process.platform,
  renderedOnSoftwareGpu:true,
  conclusion:'not_finished',
  at:new Date().toISOString(),evidence:{},errors:[],
};
try{
  await page.goto(base+'/?autostart=1&chamber=1&perf=1&qaExecution=1&qaExecutionVariant='+variant,
    {waitUntil:'domcontentloaded',timeout:60000});
  // "playing" is set before the media-loading overlay has cleared.
  // Pressing [F] while modalPaused is true is correctly ignored by gameplay.
  // Wait for the actual interactive window instead of losing the only input
  // and letting the idle player die during a four-minute CI timeout.
  await page.waitForFunction(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return document.body.dataset.state==='playing'&&
      (t.samples||0)>=7&&t.combat?.modalPaused===false;
  },null,{timeout:150000,polling:200});
  const before=await page.evaluate(()=>{
    const p=window.__KALIYUGA_ACT1_PERF__||{};
    return {gameState:p.gameState,combat:p.combat,frameSamples:p.samples};
  });
  report.evidence.before=before;
  if(before.gameState!=='playing')throw new Error('Game did not enter playing state');
  if(before.combat?.modalPaused)
    throw new Error('Execution rehearsal attempted before chamber loading finished');
  // Real keyboard input and canonical F execution, no JS calls to combat.
  await page.keyboard.press('f',{delay:72});
  await page.waitForFunction(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return (t.strikeCues||[]).some(e=>
      e.action==='execute'&&e.kind==='fired');
  },null,{timeout:110000,polling:250});
  // Prove the real dynamic camera actually received the eased cinematic
  // boost. The previous implementation multiplied that boost by frame dt.
  await page.waitForFunction((requiredVariant)=>{
    const samples=window.__KALIYUGA_ACT1_PERF__?.cameraShotTrace||[];
    return samples.some(s=>s.variant===requiredVariant &&
      s.boost>=0.035 && s.zoom>s.unboostedZoom+0.03 &&
      s.focusWeight>=0.2);
  },variant,{timeout:45000,polling:250});
  const after=await page.evaluate(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return {
      gameState:t.gameState,combat:t.combat,
      strikeCues:t.strikeCues,weaponPoseTrace:t.weaponPoseTrace,
      cameraShotTrace:t.cameraShotTrace,frameSamples:t.samples,
    };
  });
  report.evidence.after=after;
  report.evidence.cameraPeakBoost=Math.max(0,...(after.cameraShotTrace||[])
    .filter(s=>s.variant===variant).map(s=>s.boost));
  const cue=after.strikeCues?.find(e=>e.action==='execute'&&e.kind==='fired');
  if(!cue)throw new Error('No real execution active-frame cue');
  if(cue.finisherVariant!==variant)
    throw new Error('Wrong finisher used for '+variant+' proof: '+JSON.stringify(cue));
  if(cue.damageDelta<=0)throw new Error('Real execution contact did no damage: '+JSON.stringify(cue));
  if(cue.progress<cue.threshold || cue.progress>1.05)
    throw new Error('Execution hit fired outside active action: '+JSON.stringify(cue));
  await page.waitForFunction(()=>Boolean(
    window.__KALIYUGA_ACT1_ACTIVE_FRAMES__?.['ch1-execute']
  ),null,{timeout:45000,polling:250});
  const dataUrl=await page.evaluate(()=>
    window.__KALIYUGA_ACT1_ACTIVE_FRAMES__?.['ch1-execute']||null
  );
  if(!dataUrl?.startsWith('data:image/png;base64,'))
    throw new Error('No exact in-game active-frame PNG from execution');
  const bytes=Buffer.from(dataUrl.slice('data:image/png;base64,'.length),'base64');
  if(bytes.length<10000)throw new Error('Execution PNG is unusually small');
  await fs.writeFile(path.join(out,imageLabel+'-contact.png'),bytes);
  report.evidence.contactImageBytes=bytes.length;
  await page.screenshot({path:path.join(out,imageLabel+'-recovery.png'),timeout:45000});
  await page.waitForFunction(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return t.gameState==='playing'&&t.combat?.action==='idle';
  },null,{timeout:50000,polling:250});
  report.evidence.recovery=await page.evaluate(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return {gameState:t.gameState,playerAction:t.combat?.action,playerHp:t.combat?.hp};
  });
  if(pageErrors.length)throw new Error('Page exceptions: '+pageErrors.join(' | '));
  report.conclusion='passed';
}catch(error){
  report.conclusion='failed';
  report.errors.push(String(error.message||error));
  report.errors.push(...pageErrors.slice(0,12));
  try{
    report.evidence.last=await page.evaluate(()=>{
      const t=window.__KALIYUGA_ACT1_PERF__||{};
      return {state:document.body.dataset.state,combat:t.combat,
        strikeCues:t.strikeCues};
    });
    await page.screenshot({path:path.join(out,'failure.png'),timeout:30000});
  }catch{}
  process.exitCode=1;
}finally{
  await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({conclusion:report.conclusion,evidence:report.evidence,
    errors:report.errors},null,2).slice(0,19000));
  await page.close();
  await browser.close();
}

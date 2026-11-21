/**
 * Actual next build / GPU-backed Three.js sprite / keyboard attack QA.
 * Never fabricates projectile damage or bypasses gameplay.
 * QA stages one first-room target, 4 stored focus orbs, then sends user keys.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const mode=process.env.ACT1_QA_ELEMENT||'smash';
const valid=['smash','pillar','thrust','water','susanoo','light'];
if(!valid.includes(mode))throw new Error('Invalid element QA mode '+mode);
const stance=mode==='pillar'||mode==='thrust'?mode:'smash';
const expectedElement=mode==='smash'||mode==='light'?'fire':
  mode==='pillar'?'wind':mode==='thrust'?'thunder':mode;
const act=mode==='light'?'light_attack':'heavy_unleash';
const key=mode==='light'?'j':'k';
const root=path.resolve(process.env.ACT1_QA_OUTPUT||'artifacts/act1-elemental/'+mode);
await fs.mkdir(root,{recursive:true});
const base=process.env.ACT1_QA_BASE||'http://127.0.0.1:3000';
const browser=await chromium.launch({headless:true,args:[
  '--use-gl=angle','--use-angle=swiftshader','--enable-webgl',
  '--disable-dev-shm-usage','--no-sandbox',
]});
const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1});
const exceptions=[];
page.on('pageerror',e=>exceptions.push(e.message));
const report={
  mode,expectedElement,action:act,conclusion:'unfinished',
  gpu:'software SwiftShader (not native Apple Silicon performance)',
  originalInput:mode==='water'?'4 then K':mode==='susanoo'?'Z then K':key.toUpperCase(),
  at:new Date().toISOString(),evidence:{},errors:[],
};
try{
  await page.goto(base+'/?autostart=1&chamber=1&perf=1&qaHeavy=1&qaHeavyStance='+stance,
    {waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return document.body.dataset.state==='playing'&&
      (t.samples||0)>=7 && t.combat?.modalPaused===false;
  },null,{timeout:150000,polling:200});
  if(mode==='water'){
    await page.keyboard.press('4',{delay:80});
    await page.waitForTimeout(150);
  }
  if(mode==='susanoo'){
    await page.keyboard.press('z',{delay:80});
    await page.waitForTimeout(280);
  }
  await page.keyboard.press(key,{delay:70});
  await page.waitForFunction((action)=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return (t.strikeCues||[]).some(v=>v.action===action&&v.kind==='fired');
  },act,{timeout:120000,polling:200});
  await page.waitForFunction((a)=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return (t.weaponPoseTrace||[]).some(p=>p.action===a&&
      p.mode==='socket_trail'&&p.sampleCount>=2) ||
      (a==='heavy_unleash' && (t.susanooFistTrace||[]).some(p=>
         p.action===a&&p.sampleCount>=2));
  },act,{timeout:55000,polling:200});
  // A four-focus heavy must paint a substantial blade-rooted elemental
  // canopy, not a detached firewheel or tiny ordinary hit-glint.
  await page.waitForFunction(([element,a])=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    if(element==='susanoo')return (t.susanooFistTrace||[])
      .some(v=>v.action===a&&v.sampleCount>=2);
    return (t.heavyBreathingTrace||[]).some(v=>
      v.action===a&&v.element===element&&v.sampleCount>=2&&
      v.peakReach>=(a==='light_attack'?24:110));
  },[expectedElement,act],{timeout:55000,polling:200});
  const data=await page.evaluate(()=>{
    const t=window.__KALIYUGA_ACT1_PERF__||{};
    return {
      state:t.gameState,combat:t.combat,
      heavyBreathingTrace:t.heavyBreathingTrace,
      susanooFistTrace:t.susanooFistTrace,
      weaponPoseTrace:t.weaponPoseTrace,strikeCues:t.strikeCues,
      samples:t.samples,estimatedFps:t.estimatedFps,
      medianMs:t.medianMs,p95Ms:t.p95Ms,
    };
  });
  report.evidence=data;
  const strikes=(data.strikeCues||[]).filter(c=>c.action===act&&c.kind==='fired');
  if(!strikes.length)throw new Error('No original keyboard-driven physical attack cue');
  const expected=act==='light_attack'?'ch1-light':'ch1-heavy';
  await page.waitForFunction(k=>Boolean(
    window.__KALIYUGA_ACT1_ACTIVE_FRAMES__?.[k]
  ),expected,{timeout:50000,polling:200});
  const img=await page.evaluate(k=>window.__KALIYUGA_ACT1_ACTIVE_FRAMES__[k],expected);
  if(!img.startsWith('data:image/png;base64,'))
    throw new Error('Missing full production in-game active frame');
  const png=Buffer.from(img.slice('data:image/png;base64,'.length),'base64');
  if(png.length<10000)throw new Error('Empty active frame');
  await fs.writeFile(path.join(root,mode+'-active-frame.png'),png);
  report.evidence.activeFrameBytes=png.length;
  await page.screenshot({path:path.join(root,mode+'-recovery.png'),timeout:45000});
  if(exceptions.length)throw new Error('Game JS exceptions: '+exceptions.join(' | '));
  report.conclusion='passed';
}catch(e){
  report.conclusion='failed';
  report.errors.push(String(e.message||e),...exceptions.slice(0,12));
  try{
    report.evidence.failureTelemetry=await page.evaluate(()=>{
      const t=window.__KALIYUGA_ACT1_PERF__||{};
      return {state:document.body.dataset.state,combat:t.combat,
        heavyBreathingTrace:t.heavyBreathingTrace,
        susanooFistTrace:t.susanooFistTrace,
        weaponPoseTrace:t.weaponPoseTrace,strikeCues:t.strikeCues};
    });
    await page.screenshot({path:path.join(root,'failure.png'),timeout:25000});
  }catch{}
  process.exitCode=1;
}finally{
  await fs.writeFile(path.join(root,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({
    mode,conclusion:report.conclusion,
    traces:report.evidence?.heavyBreathingTrace?.length||0,
    susanoo:report.evidence?.susanooFistTrace?.length||0,
    errors:report.errors,
  }));
  await page.close();
  await browser.close();
}

/**
 * Install director-authored .meru.json files into the production bundle.
 *
 * Usage:
 *   npx tsx scripts/meru/install-scenes.ts --check
 *   npx tsx scripts/meru/install-scenes.ts downloads/dundubhi.meru.json [...]
 *
 * Does NOT upload, deploy, merge or execute any imported JSON. A failed batch
 * leaves the committed manifest unchanged. Review the generated git diff.
 */
import {readFile,writeFile,rename} from 'node:fs/promises';
import {resolve,dirname,basename,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {
  validateProductionManifest,type MeruProductionSceneId,
  MERU_PRODUCTION_SCENE_IDS,
} from '../../engine/meru/productionSceneRegistry';
import {validateCinematic} from '../../engine/meru/cinematicTimeline';

const productionPath=resolve(process.cwd(),'engine/meru/productionScenes.json');
const inputFiles=process.argv.slice(2);
const inputLimit=400_000;
async function main(){
  if(inputFiles.length===0){
    throw new Error('Provide scene JSON file paths or --check');
  }
  const existing=validateProductionManifest(JSON.parse(await readFile(productionPath,'utf8')));
  if(inputFiles.length===1&&inputFiles[0]==='--check'){
    console.log('MERU_PRODUCTION_MANIFEST_VALID: '+Object.keys(existing.scenes).length+
      '/'+MERU_PRODUCTION_SCENE_IDS.length+' studio-authored scenes installed; defaults fill remaining slots');
    return;
  }
  if(inputFiles.some(x=>x.startsWith('--')))
    throw new Error('Unknown option (only --check is supported)');
  const replacement={...existing.scenes};
  const batch=new Set<string>();
  for(const filename of inputFiles){
    const bytes=await readFile(resolve(filename));
    if(bytes.byteLength>inputLimit)
      throw new Error('Scene export exceeds 400 KB: '+basename(filename));
    const scene=validateCinematic(JSON.parse(bytes.toString('utf8')));
    if(!MERU_PRODUCTION_SCENE_IDS.includes(scene.id as MeruProductionSceneId))
      throw new Error('Scene is not an Act I production cinematic: '+scene.id);
    if(batch.has(scene.id))throw new Error('Duplicate scene file in batch: '+scene.id);
    batch.add(scene.id);
    replacement[scene.id as MeruProductionSceneId]=scene;
  }
  // Revalidate EVERY imported scene and its canonical boss/phase identity.
  const installed=validateProductionManifest({schemaVersion:1,scenes:replacement});
  const output=JSON.stringify(installed,null,2)+'\n';
  // Ensure no oversized manifest or half-written file on crash.
  if(output.length>6*inputLimit+50_000)throw new Error('Manifest exceeds safe bound');
  const temp=join(dirname(productionPath),'.productionScenes.'+randomUUID()+'.tmp');
  try{
    await writeFile(temp,output,{flag:'wx'});
    await rename(temp,productionPath);
  }catch(error){
    const {unlink}=await import('node:fs/promises');
    await unlink(temp).catch(()=>undefined);
    throw error;
  }
  console.log('MERU_PRODUCTION_MANIFEST_UPDATED: '+batch.size+' new/replaced scene(s); '+
    Object.keys(installed.scenes).length+' packaged in total. Review and commit '+productionPath);
}
main().catch(error=>{
  console.error('MERU_PRODUCTION_MANIFEST_ERROR:',error instanceof Error?error.message:String(error));
  process.exitCode=1;
});

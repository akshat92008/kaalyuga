/**
 * Meru Story Director: production-ready sequence of existing footage and
 * paintings (no invented 3D Vishnu rig). A camera-safe four-shot storyboard for
 * the original Kaliyuga Preserver memory.
 *
 * Built as a pure evaluator to make cut timing repeatable and testable.
 */
import { GAME_ASSETS } from '../../lib/game/assets';

export interface MeruStoryShot {
  id: string;
  duration: number;
  motionVideo?: string;
  poster: string;
  subject: 'rudra' | 'cosmos' | 'vishnu';
  title: string;
  narration: string;
  /** Enforce a deliberate in-shot hold on still portraits. */
  slowPush: number;
}
export interface MeruStorySequence {
  id: string;
  title: string;
  shots: MeruStoryShot[];
}
export interface MeruStoryFrame {
  shot: MeruStoryShot;
  index: number;
  elapsed: number;
  localTime: number;
  progress: number;
  transitionOpacity: number;
  ended: boolean;
}
const allowedLocal=(value:string)=>/^\/(videos|assets\/aistudio)\/[a-zA-Z0-9_.\/% -]+$/.test(value)&&!value.includes('..');
export function validateMeruStory(sequence:MeruStorySequence):MeruStorySequence {
  if(!/^[a-z0-9_-]{1,72}$/.test(sequence.id)||!sequence.title.trim()||
    !Array.isArray(sequence.shots)||sequence.shots.length<1||sequence.shots.length>12)
    throw new Error('Invalid Meru story sequence');
  let duration=0;
  const seen=new Set<string>();
  for(const shot of sequence.shots){
    if(!/^[a-z0-9_-]{1,72}$/.test(shot.id)||seen.has(shot.id))throw new Error('Duplicate or invalid story shot ID');
    seen.add(shot.id);
    if(!Number.isFinite(shot.duration)||shot.duration<1.5||shot.duration>15)
      throw new Error('Story shot duration outside 1.5-15 seconds');
    duration+=shot.duration;
    if(!allowedLocal(shot.poster)||(shot.motionVideo&&!allowedLocal(shot.motionVideo)))
      throw new Error('Story shots may only load approved local footage');
    if(!['rudra','cosmos','vishnu'].includes(shot.subject))throw new Error('Unsupported story subject');
    if(!shot.title.trim()||shot.title.length>100||!shot.narration.trim()||
       shot.narration.length>360||!Number.isFinite(shot.slowPush)||
       shot.slowPush<0||shot.slowPush>0.1)throw new Error('Invalid story narration or camera move');
  }
  if(duration>90)throw new Error('Story too long');
  return {id:sequence.id,title:sequence.title,shots:sequence.shots.map(s=>({...s}))};
}
export function meruStoryDuration(sequence:MeruStorySequence):number {
  return sequence.shots.reduce((s,shot)=>s+shot.duration,0);
}
export function sampleMeruStory(sequence:MeruStorySequence,time:number):MeruStoryFrame {
  const duration=meruStoryDuration(sequence);
  const elapsed=Math.max(0,Math.min(duration,Number.isFinite(time)?time:0));
  let start=0;
  let index=sequence.shots.length-1;
  for(let i=0;i<sequence.shots.length;i++){
    const end=start+sequence.shots[i].duration;
    if(elapsed<end || i===sequence.shots.length-1){index=i;break;}
    start=end;
  }
  const shot=sequence.shots[index];
  const localTime=Math.min(shot.duration,elapsed-start);
  return {
    shot,index,elapsed,localTime,progress:localTime/shot.duration,
    transitionOpacity:Math.min(1,localTime/0.45),
    ended:elapsed>=duration,
  };
}
export const MERU_PRESERVER_STORY:MeruStorySequence=validateMeruStory({
  id:'preserver-memory-four-shots',
  title:'THE PRESERVER · THE EIGHTEENTH NIGHT',
  shots:[
    {
      id:'rudra-looks-up',duration:4.8,subject:'rudra',
      motionVideo:GAME_ASSETS.cutsceneVideos.cosmicManifest,
      poster:GAME_ASSETS.portraits.rudra,
      title:'I · A BREATH BEFORE THE END',
      narration:'The sky opened above Rudra. For one breath, even the battlefield stood still.',
      slowPush:0.025,
    },
    {
      id:'rudra-close',duration:4.5,subject:'rudra',
      motionVideo:GAME_ASSETS.cutsceneVideos.rudraAmidstFire,
      poster:GAME_ASSETS.portraits.rudra,
      title:'II · THE MANI BURNS',
      narration:'The jewel beneath his brow burned with the memory of those he had slain.',
      slowPush:0.035,
    },
    {
      id:'cosmic-arrival',duration:5.2,subject:'cosmos',
      motionVideo:GAME_ASSETS.cutsceneVideos.cameraSpace,
      poster:GAME_ASSETS.scrolls.scroll5FallOfFather,
      title:'III · THE WHEEL OF TIME',
      narration:'Beyond the smoke, the heavens turned. A presence held time itself.',
      slowPush:0.018,
    },
    {
      id:'preserver-revealed',duration:6,subject:'vishnu',
      motionVideo:GAME_ASSETS.cutsceneVideos.cloudsStarry,
      poster:GAME_ASSETS.portraits.preserver,
      title:'IV · GO AND LOOK',
      narration:'The Preserver had not come to strike. He broke the Mani to free the souls. “Rudra. Go and look.”',
      slowPush:0.015,
    },
  ],
});

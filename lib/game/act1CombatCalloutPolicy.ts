/**
 * Act I on-hit text hierarchy: keep animation, enemy telegraphs and blade
 * silhouette visible during multi-target light/heavy attacks.
 *
 * This is purely visual UI policy. No damage, score, karma, stun, rewards or
 * accessibility hints change. Numeric damage and vital [F] execute prompts
 * are never discarded solely because other text is on screen.
 */
export interface LiveCombatCallout {
  active: boolean;
  text: string;
  life: number;
  x: number;
  y: number;
}

function isNumeric(text:string):boolean{
  return /^-?\d+!?$/.test(text.trim());
}
export function isCriticalCombatCallout(text: string): boolean {
  const s=text.toUpperCase();
  return s.includes('BROKEN!') || s.includes('[F]') ||
    s.includes('PARRY!') || s.includes('EXECUTE') ||
    s.includes('BOSS') || s.includes('PHASE');
}
export function shouldSpawnCombatCallout(params:{
  existing:LiveCombatCallout[];
  text:string;
  x:number;
  y:number;
}):boolean{
  const {existing,text,x,y}=params;
  if(isNumeric(text))return true;
  const critical=isCriticalCombatCallout(text);
  const inArea=existing.filter(e=>e.active&&e.life>0.18&&
    Math.abs(e.x-x)<135&&Math.abs(e.y-y)<85&&!isNumeric(e.text));
  // A duplicate on the same target adds no information; keep the older
  // callout stable instead of adding a 3-5-layer text cloud.
  if(inArea.some(e=>e.text===text))return false;
  // Critical prompts are never dropped because of nearby routine messages.
  if(critical)return true;
  // One routine response near the contact point is sufficient to communicate
  // a parry/counter. Enemy attack telegraph colors/shapes remain untouched.
  const routineCount=inArea.filter(e=>!isCriticalCombatCallout(e.text)).length;
  return routineCount<1;
}

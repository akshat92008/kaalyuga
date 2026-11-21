/**
 * Adaptive Meru graphics budget. Pure logic so it is testable without a GPU.
 * Hysteresis prevents visible oscillation in heavy boss encounters.
 */
export type GraphicsTier = 'lite' | 'balanced' | 'cinematic';
export interface QualityBudget {
  tier: GraphicsTier;
  resolutionScale: number;
  particleMultiplier: number;
  maxDynamicLights: number;
  maxCharacterRenderFps: number;
  maxPostPasses: number;
  contactShadows: boolean;
}
export const GRAPHICS_PRESETS: Record<GraphicsTier, QualityBudget> = {
  lite: {tier:'lite',resolutionScale:0.65,particleMultiplier:0.40,maxDynamicLights:1,maxCharacterRenderFps:30,maxPostPasses:1,contactShadows:true},
  balanced: {tier:'balanced',resolutionScale:0.85,particleMultiplier:0.72,maxDynamicLights:2,maxCharacterRenderFps:45,maxPostPasses:2,contactShadows:true},
  cinematic: {tier:'cinematic',resolutionScale:1,particleMultiplier:1,maxDynamicLights:3,maxCharacterRenderFps:60,maxPostPasses:3,contactShadows:true},
};
const order: GraphicsTier[] = ['lite','balanced','cinematic'];
function clamp(n:number,a:number,b:number){return Math.max(a,Math.min(n,b));}
export class MeruAdaptiveQuality {
  private recent: number[] = [];
  private cooldown = 0;
  private slowTime = 0;
  private fastTime = 0;
  private current:GraphicsTier;
  constructor(
    initial:GraphicsTier='balanced',
    private targetFps=60,
    private auto=true
  ){
    this.current=initial;
    if (!Number.isFinite(targetFps) || targetFps < 24 || targetFps > 144) throw new Error('Invalid FPS target');
  }
  get tier(){return this.current;}
  get budget():QualityBudget{return {...GRAPHICS_PRESETS[this.current]};}
  get automatic(){return this.auto;}
  setAutomatic(enabled:boolean){this.auto=enabled;this.resetHistory();}
  setTier(tier:GraphicsTier){if(!(tier in GRAPHICS_PRESETS))throw new Error('Invalid quality tier');this.current=tier;this.resetHistory();}
  private resetHistory(){this.recent=[];this.cooldown=1.5;this.slowTime=0;this.fastTime=0;}
  sample(frameTimeMs:number):GraphicsTier{
    if(!Number.isFinite(frameTimeMs)||frameTimeMs<=0||frameTimeMs>500)return this.current;
    const dt=frameTimeMs/1000;
    this.cooldown=Math.max(0,this.cooldown-dt);
    this.recent.push(frameTimeMs);
    if(this.recent.length>90)this.recent.shift();
    if(!this.auto||this.recent.length<30)return this.current;
    // Use arithmetic average for sustained load, not a single frame spike.
    const mean=this.recent.reduce((a,b)=>a+b,0)/this.recent.length;
    const target=1000/this.targetFps;
    const isSlow=mean>target*1.24;
    const isFast=mean<target*0.76;
    this.slowTime=isSlow?this.slowTime+dt:Math.max(0,this.slowTime-dt*2);
    this.fastTime=isFast?this.fastTime+dt:Math.max(0,this.fastTime-dt*2);
    if(this.cooldown<=0&&this.slowTime>=1.35&&order.indexOf(this.current)>0){
      this.current=order[order.indexOf(this.current)-1];
      this.resetHistory();
    } else if(this.cooldown<=0&&this.fastTime>=8&&order.indexOf(this.current)<2){
      this.current=order[order.indexOf(this.current)+1];
      this.resetHistory();
    }
    return this.current;
  }
  /** Pixel dimensions for an internal framebuffer. CSS size never changes. */
  renderSize(cssWidth:number,cssHeight:number,dpr=1){
    if (![cssWidth,cssHeight,dpr].every(v=>Number.isFinite(v)&&v>0))throw new Error('Invalid viewport');
    const scale=clamp(this.budget.resolutionScale*Math.min(dpr,2),0.5,2);
    const width=Math.max(2,Math.min(4096,Math.round(cssWidth*scale/2)*2));
    const height=Math.max(2,Math.min(4096,Math.round(cssHeight*scale/2)*2));
    return {width,height,scale};
  }
}

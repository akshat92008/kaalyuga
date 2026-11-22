/**
 * Meru browser-side frame-pacing sampling.
 * Reports requestAnimationFrame intervals: this is not GPU timestamp profiling
 * and cannot replace target-device thermal, memory or power measurements.
 * Bounded to one minute of 60fps samples; no telemetry or network transfer.
 */
export interface MeruFrameReport {
  sampleCount:number;
  averageMs:number;
  medianMs:number;
  p95Ms:number;
  p99Ms:number;
  worstMs:number;
  estimatedFps:number;
  jankOver33MsPercent:number;
}
const rounded=(n:number)=>Math.round(n*100)/100;
export class MeruFrameProbe {
  private samples:number[]=[];
  constructor(private readonly maxSamples=3600){
    if(!Number.isInteger(maxSamples)||maxSamples<2||maxSamples>10000)throw new Error('Invalid sample window');
  }
  reset(){this.samples=[];}
  sample(frameMs:number){
    if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>1000)return;
    this.samples.push(frameMs);
    if(this.samples.length>this.maxSamples)this.samples.shift();
  }
  get count(){return this.samples.length;}
  report():MeruFrameReport {
    const n=this.samples.length;
    if(!n)return {sampleCount:0,averageMs:0,medianMs:0,p95Ms:0,p99Ms:0,worstMs:0,estimatedFps:0,jankOver33MsPercent:0};
    const sorted=[...this.samples].sort((a,b)=>a-b);
    const pick=(q:number)=>sorted[Math.min(n-1,Math.ceil(n*q)-1)];
    const avg=this.samples.reduce((sum,ms)=>sum+ms,0)/n;
    return {
      sampleCount:n,averageMs:rounded(avg),
      medianMs:rounded(pick(0.5)),p95Ms:rounded(pick(0.95)),
      p99Ms:rounded(pick(0.99)),worstMs:rounded(sorted[n-1]),
      estimatedFps:rounded(1000/avg),
      jankOver33MsPercent:rounded(this.samples.filter(ms=>ms>33.33).length/n*100),
    };
  }
}

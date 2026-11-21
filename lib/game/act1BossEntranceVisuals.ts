/**
 * Act I opening tableau for the two real bosses and semi-boss.
 * The first readable pose is more important than a full-screen geometric
 * web obscuring face, horn direction or combat counterplay.
 */
export type BossEntranceKind='dundubhi'|'vrikodara'|'semi_boss';
export interface BossEntranceVisualPlan{
  kind:BossEntranceKind;
  palette:'blood'|'hinokami'|'void';
  ringRadius:number;
  ringDuration:number;
  sparkCount:number;
  sparkSpeed:number;
  showScreenFillingCage:false;
}
export function getBossEntranceVisualPlan(kind:BossEntranceKind):BossEntranceVisualPlan{
  if(kind==='dundubhi')return {
    kind,palette:'blood',ringRadius:152,ringDuration:.62,
    sparkCount:11,sparkSpeed:140,showScreenFillingCage:false
  };
  if(kind==='vrikodara')return {
    kind,palette:'hinokami',ringRadius:172,ringDuration:.73,
    sparkCount:15,sparkSpeed:162,showScreenFillingCage:false
  };
  return {
    kind,palette:'void',ringRadius:118,ringDuration:.46,
    sparkCount:8,sparkSpeed:110,showScreenFillingCage:false
  };
}

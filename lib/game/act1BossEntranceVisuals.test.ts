import test from 'node:test';
import assert from 'node:assert/strict';
import {getBossEntranceVisualPlan} from './act1BossEntranceVisuals';
test('Dundubhi entrance leaves horn/armor silhouette readable',()=>{
 const p=getBossEntranceVisualPlan('dundubhi');
 assert.equal(p.showScreenFillingCage,false);
 assert.ok(p.ringRadius<=165);
 assert.ok(p.sparkCount<14);
 assert.equal(p.palette,'blood');
});
test('Vrikodara furnace and Dundubhi bronze have separate recognizable palettes',()=>{
 const a=getBossEntranceVisualPlan('vrikodara');
 const b=getBossEntranceVisualPlan('dundubhi');
 assert.notEqual(a.palette,b.palette);
 assert.ok(a.ringRadius>b.ringRadius);
 assert.ok(a.sparkCount>b.sparkCount);
});
test('Minor bosses never get a bigger intro than campaign bosses',()=>{
 const a=getBossEntranceVisualPlan('semi_boss');
 const b=getBossEntranceVisualPlan('dundubhi');
 assert.ok(a.ringRadius<b.ringRadius);
 assert.ok(a.sparkCount<b.sparkCount);
});

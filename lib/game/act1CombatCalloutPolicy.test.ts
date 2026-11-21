import test from 'node:test';
import assert from 'node:assert/strict';
import {isCriticalCombatCallout,shouldSpawnCombatCallout} from './act1CombatCalloutPolicy';

test('Damage numbers are always displayed regardless of nearby captions',()=>{
 const e=[{active:true,text:'COUNTER!',life:.55,x:100,y:100}];
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'350!',x:103,y:105}),true);
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'-45',x:103,y:105}),true);
});
test('Multi-hit counter spam collapses into a single readable contact callout',()=>{
 const e=[{active:true,text:'⚡ COUNTER!',life:.50,x:100,y:100}];
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'⚡ COUNTER!',x:108,y:111}),false);
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'DEFLECTED',x:101,y:99}),false);
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'DEFLECTED',x:415,y:99}),true);
});
test('Critical posture-break/execute prompt wins over incidental counters',()=>{
 const e=[{active:true,text:'⚡ COUNTER!',life:.50,x:100,y:100}];
 assert.equal(isCriticalCombatCallout('BROKEN! [F]'),true);
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'BROKEN! [F]',x:102,y:101}),true);
});
test('Duplicate prompt is suppressed only while still present nearby',()=>{
 const e=[{active:true,text:'BROKEN! [F]',life:.6,x:100,y:100}];
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'BROKEN! [F]',x:111,y:105}),false);
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'BROKEN! [F]',x:350,y:105}),true);
 assert.equal(shouldSpawnCombatCallout({existing:e.map(x=>({...x,life:.02})),text:'BROKEN! [F]',x:111,y:105}),true);
});
test('A vanished or inactive callout never suppresses new information',()=>{
 const e=[{active:false,text:'DEFLECTED',life:0,x:100,y:100}];
 assert.equal(shouldSpawnCombatCallout({existing:e,text:'COUNTER!',x:100,y:100}),true);
});

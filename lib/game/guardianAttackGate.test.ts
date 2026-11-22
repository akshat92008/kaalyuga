import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldStartGuardianSwing } from './guardianAttackGate';

test('guardian animation starts once when one gameplay attack serial persists across frames', () => {
  assert.equal(shouldStartGuardianSwing({isAttacking:true,attackSerial:12,lastAttackSerial:11,wasAttacking:true}),true);
  for(let i=0;i<30;i++){
    assert.equal(shouldStartGuardianSwing({isAttacking:true,attackSerial:12,lastAttackSerial:12,wasAttacking:true}),false);
  }
  assert.equal(shouldStartGuardianSwing({isAttacking:true,attackSerial:13,lastAttackSerial:12,wasAttacking:true}),true);
});
test('does not replay attack when attack hold animation ends',()=>{
  assert.equal(shouldStartGuardianSwing({isAttacking:false,attackSerial:1,lastAttackSerial:0,wasAttacking:false}),false);
  assert.equal(shouldStartGuardianSwing({isAttacking:true,attackSerial:0,lastAttackSerial:-1,wasAttacking:false}),true);
  assert.equal(shouldStartGuardianSwing({isAttacking:true,lastAttackSerial:-1,wasAttacking:false}),true);
  assert.equal(shouldStartGuardianSwing({isAttacking:true,lastAttackSerial:-1,wasAttacking:true}),false);
  assert.equal(shouldStartGuardianSwing({isAttacking:false,lastAttackSerial:-1,wasAttacking:true}),false);
});
test('rejects NaN serial as a new serial event',()=>{
  assert.equal(shouldStartGuardianSwing({isAttacking:true,attackSerial:NaN,lastAttackSerial:2,wasAttacking:true}),false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ndcWeaponTipToDrawOffset,
  resolveVisualWeaponContact,
} from './weaponContactProjection';

test('NDC weapon tip matches sprite draw location and foot alignment', () => {
  const centered = ndcWeaponTipToDrawOffset({x:0,y:0,z:0}, 136, 0.56);
  assert.deepEqual(centered, {dx: 0, dy: 136*(0.5-0.56)});
  const right = ndcWeaponTipToDrawOffset({x:0.5,y:0.4,z:0}, 136, 0.56);
  assert.ok(right);
  assert.equal(right.dx, 34);
  assert.ok(right.dy < 0);
});
test('invalid or offscreen projection never becomes a bad gameplay anchor', () => {
  for (const bad of [{x:NaN,y:0},{x:10,y:0},{x:0,y:0,z:2}]) {
    assert.equal(ndcWeaponTipToDrawOffset(bad,136,0.56),null);
  }
  assert.equal(ndcWeaponTipToDrawOffset({x:0,y:0},0,0.5),null);
});
test('accept plausible actual sword head but reject stale or impossible offsets', () => {
  assert.deepEqual(
    resolveVisualWeaponContact(100,200,0,46,28,{dx:58,dy:-12}),
    {x:158,y:188,source:'weapon_mesh'}
  );
  assert.deepEqual(
    resolveVisualWeaponContact(100,200,0,46,28,{dx:-70,dy:0}),
    {x:146,y:200,source:'simulation_fallback'}
  );
  assert.equal(
    resolveVisualWeaponContact(100,200,0,46,28,{dx:900,dy:0}).source,
    'simulation_fallback'
  );
  assert.equal(
    resolveVisualWeaponContact(100,200,0,46,28,null).source,
    'simulation_fallback'
  );
});
test('the visual sample never changes hit/damage rules or throws on missing pose', () => {
  const hit = resolveVisualWeaponContact(200,120,Math.PI/2,46,28,undefined);
  assert.ok(Number.isFinite(hit.x) && Number.isFinite(hit.y));
  assert.equal(hit.source,'simulation_fallback');
});

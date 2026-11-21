import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const renderer = readFileSync(join(root, 'lib/game/rudra3dRenderer.ts'), 'utf8');

const mandatory = [
  '/kaalyuga/rudra/rigged.fbx',
  '/kaalyuga/parashu/weapon.fbx',
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.fbx',
  '/models/Meshy_AI_Ashen_Warborn_20261025_texture_fbx/Meshy_AI_Ashen_Warborn_20261025_texture.png',
  '/models/Meshy_AI_Bloodforged_Trident_A_1025041928_texture_fbx/Meshy_AI_Bloodforged_Trident_A_1025041928_texture.png',
];

const clipNames = [
  'idle', 'run', 'dodge', 'attack1', 'attack2',
  'attack3', 'heavy', 'cast', 'block', 'hurt',
];

test('every URL for Rudra main 3D model, texture and Parashu actually exists in public', () => {
  for (const url of mandatory) {
    assert.ok(renderer.includes("'" + url + "'"), 'Rudra renderer does not reference ' + url);
    assert.ok(existsSync(join(root, 'public', url.slice(1))), 'Missing public file: ' + url);
  }
});

test('all ten local combat animation clips exist', () => {
  for (const name of clipNames) {
    const url = '/kaalyuga/anims/rudra/' + name + '.fbx';
    assert.ok(renderer.includes("'" + url + "'"), 'Missing source reference for ' + url);
    assert.ok(existsSync(join(root, 'public', url.slice(1))), 'Missing clip: ' + url);
  }
});

test('fallback axe-pack animation URLs resolve to repository assets rather than missing new_3d_assets', () => {
  const matches = [...renderer.matchAll(/'\/(animations\/pro_melee_axe\/[^']+\.fbx)'/g)];
  assert.equal(matches.length, 10, 'Expected one fallback for each Rudra state');
  for (const match of matches) {
    assert.ok(existsSync(join(root, 'public', match[1])), 'Missing fallback: ' + match[1]);
  }
  assert.ok(!renderer.includes("'/new_3d_assets/"), 'Stale production 404 route reintroduced');
});

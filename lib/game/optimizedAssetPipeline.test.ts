import test from 'node:test';
import assert from 'node:assert/strict';
import { getOptimizedGlbUrl } from './meshSimplifier';

test('prefers locally built GLBs only when the manifest maps the exact original rig URL', () => {
  const manifest = {
    '/models_v2/horned_warlord_abyss.fbx': '/optimized/glb/abcdef_susanoo.glb',
    '/new_3d_assets/Animations/Creature Pack (4)/mutant roaring.fbx':
      '/optimized/glb/123456_mutant_roaring.glb',
  };
  assert.equal(
    getOptimizedGlbUrl('/models_v2/horned_warlord_abyss.fbx', manifest),
    '/optimized/glb/abcdef_susanoo.glb'
  );
  assert.equal(
    getOptimizedGlbUrl('/new_3d_assets/Animations/Creature%20Pack%20(4)/mutant%20roaring.fbx', manifest),
    '/optimized/glb/123456_mutant_roaring.glb'
  );
  assert.equal(getOptimizedGlbUrl('/models/missing.fbx', manifest), null);
});

test('rejects traversal, remote, data and non-GLB manifest paths', () => {
  for (const untrusted of [
    'https://evil.example/susanoo.glb',
    '//evil.example/susanoo.glb',
    '/optimized/../../private/rig.glb',
    '/optimized/rig.gltf',
    '/optimized/rig.glb?redirect=1',
    '/optimized/rig.glb#hash',
    '/optimized\\\\rogue.glb',
  ]) {
    assert.equal(getOptimizedGlbUrl('/models/susanoo.fbx', {
      '/models/susanoo.fbx': untrusted,
    }), null);
  }
});

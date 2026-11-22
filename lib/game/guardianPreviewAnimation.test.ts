import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createGuardianProofClips } from './guardianPreviewAnimation';

test('guardian preview requires a genuine skeleton with matching named bones', () => {
  const root = new THREE.Group();
  for (const name of [
    'mixamorig:Spine2', 'mixamorig:RightArm', 'mixamorig:LeftArm',
    'mixamorig:RightForeArm', 'mixamorig:LeftForeArm',
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  }
  const { clips, animatedBones } = createGuardianProofClips(root);
  assert.equal(animatedBones.length, 5);
  for (const key of ['idle', 'roar', 'swing1', 'swing2', 'swing3'] as const) {
    assert.equal(clips[key].tracks.length, 5, 'Missing keyed bone rotations in ' + key);
    for (const track of clips[key].tracks) {
      assert.match(track.name, /mixamorig:/);
      assert.ok(track.values.every(Number.isFinite));
      assert.ok(track.times.every(Number.isFinite));
    }
  }
  const mixer = new THREE.AnimationMixer(root);
  const arm = root.getObjectByName('mixamorig:RightArm') as THREE.Bone;
  assert.ok(arm);
  const before = arm.quaternion.clone();
  mixer.clipAction(clips.swing2).play();
  mixer.update(0.43);
  assert.ok(arm.quaternion.angleTo(before) > 0.1, 'Heavy attack must actually rotate skeleton bones');
});

test('no unskinned guardian can masquerade as animated preview', () => {
  const root = new THREE.Group();
  const {clips,animatedBones} = createGuardianProofClips(root);
  assert.deepEqual(animatedBones, []);
  assert.ok(Object.values(clips).every(clip=>clip.tracks.length===0));
});

test('works with FBXLoader-sanitized Mixamo bone names lacking colons', () => {
  const root = new THREE.Group();
  for (const name of [
    'mixamorigSpine2', 'mixamorigRightArm', 'mixamorigLeftArm',
    'mixamorigRightForeArm', 'mixamorigLeftForeArm',
  ]) {
    const bone = new THREE.Bone();
    bone.name = name;
    root.add(bone);
  }
  const { clips, animatedBones } = createGuardianProofClips(root);
  assert.equal(animatedBones.length, 5);
  assert.ok(clips.swing2.tracks.length >= 4);
  const mixer = new THREE.AnimationMixer(root);
  const arm = root.getObjectByName('mixamorigRightArm') as THREE.Bone;
  mixer.clipAction(clips.swing2).play();
  mixer.update(0.42);
  assert.ok(arm.quaternion.angleTo(new THREE.Quaternion()) > 0.1);
});

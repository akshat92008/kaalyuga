import * as THREE from 'three';
import { createDemonSlayerCelMaterial } from './demonSlayerShader';

export interface RudraWeaponSocket {
  group: THREE.Group;
  root: THREE.Object3D;
  tip: THREE.Object3D;
  offHand?: THREE.Group;
}

type Profile = readonly (readonly [number, number])[];

function blade(material: THREE.Material, profile: Profile, y = 0, z = 0): THREE.Mesh {
  const shape = new THREE.Shape();
  for (const [i, [x, width]] of profile.entries()) {
    if (i === 0) shape.moveTo(x, width);
    else shape.lineTo(x, width);
  }
  for (const [x, width] of [...profile].reverse()) shape.lineTo(x, -width);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.016, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.012, bevelThickness: 0.009,
  });
  geometry.translate(0, y, z - 0.008);
  return new THREE.Mesh(geometry, material);
}

function shaft(material: THREE.Material, start: number, end: number, radius: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, end - start, 8), material);
  mesh.rotation.z = -Math.PI / 2;
  mesh.position.x = (start + end) / 2;
  return mesh;
}

function socket(hand: THREE.Object3D, start: number, end: number): RudraWeaponSocket {
  const group = new THREE.Group();
  const scale = hand.getWorldScale(new THREE.Vector3());
  group.scale.set(1 / Math.abs(scale.x || 1), 1 / Math.abs(scale.y || 1), 1 / Math.abs(scale.z || 1));
  const root = new THREE.Object3D();
  root.position.x = start;
  const tip = new THREE.Object3D();
  tip.position.x = end;
  group.add(root, tip);
  group.visible = false;
  hand.add(group);
  return { group, root, tip };
}

export function mountRudraAlternateWeapons(
  right: THREE.Object3D,
  left: THREE.Object3D | undefined,
): { khanda: RudraWeaponSocket; trishula: RudraWeaponSocket; materials: THREE.Material[] } {
  const steel = createDemonSlayerCelMaterial({ tintHex: 0xcbd6d9, rimColorHex: 0xe8faff, rimStrength: 0.44 });
  const bronze = createDemonSlayerCelMaterial({ tintHex: 0xaf7138, rimColorHex: 0xffda85, rimStrength: 0.32 });
  const iron = createDemonSlayerCelMaterial({ tintHex: 0x3a2628, rimColorHex: 0xa86158, rimStrength: 0.22 });
  const khanda = socket(right, 0.16, 0.88);
  const sword = (group: THREE.Group) => {
    group.add(
      shaft(iron, -0.18, 0.15, 0.037),
      blade(bronze, [[0.08, 0.114], [0.14, 0.129], [0.19, 0.073]]),
      blade(steel, [[0.16, 0.045], [0.36, 0.051], [0.76, 0.078], [0.86, 0.065], [0.88, 0.006]]),
      blade(bronze, [[0.18, 0.017], [0.39, 0.014], [0.63, 0.009], [0.70, 0.0]], 0, 0.022),
    );
  };
  sword(khanda.group);
  if (left) {
    khanda.offHand = socket(left, 0.16, 0.88).group;
    sword(khanda.offHand);
  }

  const trishula = socket(right, 0.79, 1.34);
  trishula.group.add(
    shaft(iron, -0.68, 0.93, 0.032),
    shaft(bronze, -0.68, -0.53, 0.041),
    shaft(bronze, 0.30, 0.39, 0.043),
    shaft(bronze, 0.75, 0.93, 0.057),
    blade(bronze, [[0.79, 0.036], [0.89, 0.15], [0.99, 0.172], [1.05, 0.056]]),
    blade(steel, [[0.93, 0.032], [1.15, 0.065], [1.25, 0.044], [1.34, 0]]),
    blade(steel, [[0.93, 0.048], [1.06, 0.042], [1.18, 0.03], [1.27, 0]], -0.151),
    blade(steel, [[0.93, 0.048], [1.06, 0.042], [1.18, 0.03], [1.27, 0]], 0.151),
  );
  return { khanda, trishula, materials: [steel, bronze, iron] };
}

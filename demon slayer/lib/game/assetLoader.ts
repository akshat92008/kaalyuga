import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import {
  attachSumiInkOutlines,
  createDemonSlayerCelMaterial,
  liftTextureToAnimeVibrancy,
} from './demonSlayerShader';

export type RudraClipKey =
  | 'idle'
  | 'run'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy'
  | 'cast'
  | 'block'
  | 'hurt'
  | 'dodge';

export type DundubhiClipKey =
  | 'idle'
  | 'run'
  | 'swipe'
  | 'punch'
  | 'slam'
  | 'roar'
  | 'stagger'
  | 'death';

export interface LoadedRudraRig {
  root: THREE.Group;
  modelGroup: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<RudraClipKey, THREE.AnimationAction>>;
  materials: THREE.MeshToonMaterial[];
  weaponAuraMat: THREE.ShaderMaterial;
  bladeBaseNode: THREE.Object3D;
  bladeTipNode: THREE.Object3D;
  shoulderPivotNode: THREE.Object3D;
  footBones: THREE.Object3D[];
  soleOffset: number;
}

export interface LoadedDundubhiRig {
  root: THREE.Group;
  modelGroup: THREE.Group;
  mixer: THREE.AnimationMixer;
  actions: Partial<Record<DundubhiClipKey, THREE.AnimationAction>>;
  materials: THREE.MeshToonMaterial[];
  weaponBaseNode: THREE.Object3D;
  weaponTipNode: THREE.Object3D;
  footBones: THREE.Object3D[];
  soleOffset: number;
}

/**
 * Spatial-grid vertex cluster decimation that preserves UVs and skinIndex/skinWeight attributes
 * so ~490k-840k-triangle Meshy meshes render crisply at high framerates on both GPUs and SwiftShader.
 */
export function simplifyGeometryPreserveSkin(
  src: THREE.BufferGeometry,
  gridRes = 56,
  minVerts = 22000
): THREE.BufferGeometry {
  const posAttr = src.attributes.position as THREE.BufferAttribute | undefined;
  if (!posAttr || posAttr.count <= minVerts) {
    if (!src.attributes.normal) src.computeVertexNormals();
    return src;
  }

  src.computeBoundingBox();
  const bb = src.boundingBox!;
  const sx = Math.max(1e-5, bb.max.x - bb.min.x);
  const sy = Math.max(1e-5, bb.max.y - bb.min.y);
  const sz = Math.max(1e-5, bb.max.z - bb.min.z);

  const uvAttr = src.attributes.uv as THREE.BufferAttribute | undefined;
  const skinIdxAttr = src.attributes.skinIndex as THREE.BufferAttribute | undefined;
  const skinWgtAttr = src.attributes.skinWeight as THREE.BufferAttribute | undefined;
  const normAttr = src.attributes.normal as THREE.BufferAttribute | undefined;

  const srcIdx = src.index ? src.index.array : null;
  const triCount = srcIdx ? Math.floor(srcIdx.length / 3) : Math.floor(posAttr.count / 3);

  const posArr = posAttr.array as Float32Array;
  const uvArr = uvAttr ? (uvAttr.array as Float32Array) : null;
  const normArr = normAttr ? (normAttr.array as Float32Array) : null;
  const siArr = skinIdxAttr ? skinIdxAttr.array : null;
  const swArr = skinWgtAttr ? (skinWgtAttr.array as Float32Array) : null;

  const cellToOutIdx = new Map<number, number>();
  const outPos: number[] = [];
  const outUv: number[] = [];
  const outNorm: number[] = [];
  const outSi: number[] = [];
  const outSw: number[] = [];
  const outIndices: number[] = [];

  const invX = gridRes / sx;
  const invY = gridRes / sy;
  const invZ = gridRes / sz;

  const mapVertex = (v: number): number => {
    const i3 = v * 3;
    const gx = Math.min(gridRes - 1, Math.max(0, ((posArr[i3] - bb.min.x) * invX) | 0));
    const gy = Math.min(gridRes - 1, Math.max(0, ((posArr[i3 + 1] - bb.min.y) * invY) | 0));
    const gz = Math.min(gridRes - 1, Math.max(0, ((posArr[i3 + 2] - bb.min.z) * invZ) | 0));
    const uvBucket = uvArr
      ? ((Math.floor(uvArr[v * 2] * 12) & 15) << 4) | (Math.floor(uvArr[v * 2 + 1] * 12) & 15)
      : 0;
    const cellKey =
      ((gx * 73856093) ^ (gy * 19349663) ^ (gz * 83492791) ^ (uvBucket * 2654435761)) >>> 0;

    const existing = cellToOutIdx.get(cellKey);
    if (existing !== undefined) return existing;

    const outV = outPos.length / 3;
    cellToOutIdx.set(cellKey, outV);

    outPos.push(posArr[i3], posArr[i3 + 1], posArr[i3 + 2]);
    if (uvArr) {
      outUv.push(uvArr[v * 2], uvArr[v * 2 + 1]);
    }
    if (normArr) {
      outNorm.push(normArr[i3], normArr[i3 + 1], normArr[i3 + 2]);
    }
    if (siArr && swArr) {
      const i4 = v * 4;
      outSi.push(siArr[i4], siArr[i4 + 1], siArr[i4 + 2], siArr[i4 + 3]);
      outSw.push(swArr[i4], swArr[i4 + 1], swArr[i4 + 2], swArr[i4 + 3]);
    }
    return outV;
  };

  for (let t = 0; t < triCount; t++) {
    const a = srcIdx ? srcIdx[t * 3] : t * 3;
    const b = srcIdx ? srcIdx[t * 3 + 1] : t * 3 + 1;
    const c = srcIdx ? srcIdx[t * 3 + 2] : t * 3 + 2;
    const oa = mapVertex(a);
    const ob = mapVertex(b);
    const oc = mapVertex(c);
    if (oa !== ob && ob !== oc && oc !== oa) {
      outIndices.push(oa, ob, oc);
    }
  }

  if (outIndices.length < 300) {
    if (!src.attributes.normal) src.computeVertexNormals();
    return src;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  if (outUv.length > 0) {
    out.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
  }
  if (outNorm.length > 0) {
    out.setAttribute('normal', new THREE.Float32BufferAttribute(outNorm, 3));
  }
  if (outSi.length > 0 && outSw.length > 0) {
    out.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(outSi, 4));
    out.setAttribute('skinWeight', new THREE.Float32BufferAttribute(outSw, 4));
  }
  out.setIndex(outIndices);
  out.computeVertexNormals();
  out.computeBoundingBox();
  out.computeBoundingSphere();
  return out;
}

function extractStandingHipY(idleFbx: THREE.Group, riggedGroup: THREE.Group): number {
  const idleClip = idleFbx.animations?.[0];
  if (idleClip) {
    const pTrack = idleClip.tracks.find((t) => /hips\.position$/i.test(t.name));
    if (pTrack && pTrack.values.length >= 2 && Math.abs(pTrack.values[1]) > 0.01) {
      return pTrack.values[1];
    }
  }
  let boneHipY = 0;
  riggedGroup.traverse((obj) => {
    if (!boneHipY && /hips$/i.test(obj.name)) {
      boneHipY = obj.position.y;
    }
  });
  return Math.abs(boneHipY) > 0.01 ? boneHipY : 100;
}

function buildStabilizedClip(
  clip: THREE.AnimationClip,
  targetRoot: THREE.Object3D,
  standingHipY: number,
  name: string,
  allowCollapse = false
): THREE.AnimationClip {
  const boneMap = new Map<string, string>();
  targetRoot.traverse((obj) => {
    const clean = obj.name.replace(/^mixamorig:?/i, '').toLowerCase();
    boneMap.set(clean, obj.name);
    boneMap.set(obj.name.toLowerCase(), obj.name);
  });

  const newTracks: THREE.KeyframeTrack[] = [];
  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    if (dotIdx < 0) continue;
    const rawNode = track.name.slice(0, dotIdx).replace(/^Armature\|/i, '');
    const prop = track.name.slice(dotIdx + 1);
    const cleanNode = rawNode.replace(/^mixamorig:?/i, '').toLowerCase();
    const mappedBone = boneMap.get(cleanNode) || boneMap.get(rawNode.toLowerCase());
    if (!mappedBone) continue;
    if (prop === 'scale') continue;

    if (prop === 'position') {
      if (cleanNode !== 'hips' && !cleanNode.endsWith('hips')) continue;
      const cloned = track.clone();
      cloned.name = `${mappedBone}.position`;
      const vals = cloned.values;
      const baseX = vals[0] || 0;
      const baseY = vals[1] || standingHipY;
      const baseZ = vals[2] || 0;
      const hipUnitRatio =
        Math.abs(baseY) > 10 && Math.abs(standingHipY) < 5
          ? standingHipY / Math.abs(baseY)
          : Math.abs(baseY) < 5 && Math.abs(standingHipY) > 10
            ? standingHipY / Math.max(0.1, Math.abs(baseY))
            : 1.0;
      const maxBounce = Math.max(0.04, 0.14 * Math.abs(standingHipY));
      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = (vals[i] - baseX) * hipUnitRatio * 0.04;
        const dy = (vals[i + 1] - baseY) * hipUnitRatio;
        const clampedDy = allowCollapse
          ? Math.max(-Math.abs(standingHipY) * 0.92, Math.min(maxBounce, dy * 0.95))
          : Math.max(-maxBounce, Math.min(maxBounce, dy * 0.52));
        vals[i + 1] = standingHipY + clampedDy;
        vals[i + 2] = (vals[i + 2] - baseZ) * hipUnitRatio * 0.04;
      }
      newTracks.push(cloned);
    } else if (prop === 'quaternion') {
      const cloned = track.clone();
      cloned.name = `${mappedBone}.quaternion`;
      newTracks.push(cloned);
    }
  }

  return new THREE.AnimationClip(name, clip.duration, newTracks);
}

const fbxLoader = new FBXLoader();
const texLoader = new THREE.TextureLoader();

function loadFbx(url: string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    fbxLoader.load(url, resolve, undefined, reject);
  });
}

function loadTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    texLoader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function findBone(root: THREE.Object3D, pattern: RegExp): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((obj) => {
    if (!found && pattern.test(obj.name)) {
      found = obj;
    }
  });
  return found;
}

function collectFootBones(root: THREE.Object3D): THREE.Object3D[] {
  const feet: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (/(left|right)(foot|toebase|toe_end)$/i.test(obj.name)) {
      feet.push(obj);
    }
  });
  return feet;
}

const _footProbe = new THREE.Vector3();

/**
 * Measures the minimum world-Y of foot/toe bones on a character rig.
 */
export function getMinFootWorldY(footBones: THREE.Object3D[]): number {
  let minY = Infinity;
  for (let i = 0; i < footBones.length; i++) {
    footBones[i].getWorldPosition(_footProbe);
    if (_footProbe.y < minY) minY = _footProbe.y;
  }
  return Number.isFinite(minY) ? minY : 0;
}

/**
 * Computes posed skinned world bounding box of a rigged character and aligns its lowest
 * point flush onto Y = 0, returning the calibrated foot-bone soleOffset.
 */
function scaleAndGroundPosedRig(
  modelGroup: THREE.Group,
  targetHeightMeters: number,
  footBones: THREE.Object3D[]
): number {
  modelGroup.updateMatrixWorld(true);
  const skinnedBox = new THREE.Box3().setFromObject(modelGroup);
  const rawHeight = Math.max(0.01, skinnedBox.max.y - skinnedBox.min.y);
  const scale = targetHeightMeters / rawHeight;
  modelGroup.scale.setScalar(scale);
  modelGroup.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(modelGroup);
  modelGroup.position.set(0, -scaledBox.min.y, 0);
  modelGroup.updateMatrixWorld(true);

  const groundedFootY = getMinFootWorldY(footBones);
  return Math.max(0.015, groundedFootY);
}

/**
 * Smooths looping clips (`idle`, `run`, `block`) by tapering the final keyframes seamlessly back to frame 0
 * so Mixamo/Meshy loops never visibly hitch at the loop boundary.
 */
function smoothLoopSeam(clip: THREE.AnimationClip): THREE.AnimationClip {
  const blendTail = 3;
  for (const track of clip.tracks) {
    const stride = track.getValueSize();
    const keyCount = Math.floor(track.values.length / stride);
    if (keyCount <= blendTail + 2) continue;

    if (stride === 4) {
      // Slerp final quaternion keys toward key 0
      const q0 = new THREE.Quaternion(
        track.values[0],
        track.values[1],
        track.values[2],
        track.values[3]
      ).normalize();
      const qt = new THREE.Quaternion();
      for (let step = 1; step <= blendTail; step++) {
        const k = keyCount - blendTail - 1 + step;
        const alpha = step / blendTail;
        const base = k * 4;
        qt.set(
          track.values[base],
          track.values[base + 1],
          track.values[base + 2],
          track.values[base + 3]
        ).normalize();
        qt.slerp(q0, alpha * alpha);
        track.values[base] = qt.x;
        track.values[base + 1] = qt.y;
        track.values[base + 2] = qt.z;
        track.values[base + 3] = qt.w;
      }
    } else {
      for (let step = 1; step <= blendTail; step++) {
        const k = keyCount - blendTail - 1 + step;
        const alpha = step / blendTail;
        const t = alpha * alpha;
        const base = k * stride;
        for (let c = 0; c < stride; c++) {
          track.values[base + c] =
            track.values[base + c] * (1 - t) + track.values[c] * t;
        }
      }
    }
  }
  return clip;
}

/**
 * Builds an animated cel-flame / Vajra lightning sheath wrapped directly around Parashu's crescent edge.
 */
function createParashuAuraMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.2 },
      uCoreColor: { value: new THREE.Color('#fff470') },
      uMidColor: { value: new THREE.Color('#ff4912') },
      uOuterColor: { value: new THREE.Color('#9e0b16') },
    },
    vertexShader: `
      varying vec2 vUv;
      uniform float uTime;
      uniform float uIntensity;
      void main() {
        vUv = uv;
        vec3 pos = position;
        float lick = sin(uv.x * 16.0 - uTime * 22.0) * 1.8 * uIntensity;
        pos.x += lick * uv.y;
        pos.z += cos(uv.x * 12.0 + uTime * 18.0) * 1.2 * uIntensity;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uCoreColor;
      uniform vec3 uMidColor;
      uniform vec3 uOuterColor;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
      }

      void main() {
        float flame = noise(vec2(vUv.x * 9.0, vUv.y * 4.0 - uTime * 11.0));
        float radial = 1.0 - smoothstep(0.15, 0.98, vUv.y + (flame - 0.5) * 0.42);
        float tipMask = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
        float alpha = radial * tipMask * clamp(uIntensity, 0.0, 1.0);
        if (alpha < 0.06) discard;
        vec3 col = mix(uOuterColor, uMidColor, smoothstep(0.15, 0.55, 1.0 - vUv.y));
        col = mix(col, uCoreColor * 1.15, smoothstep(0.55, 0.88, 1.0 - vUv.y));
        gl_FragColor = vec4(col, alpha * 0.92);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

/**
 * Trims a normalized Mixamo/Meshy clip to its actual combat strike sub-window so animations match fast responsiveness.
 */
function trimClipWindow(
  clip: THREE.AnimationClip,
  key: string,
  frameWindow?: [number, number]
): THREE.AnimationClip {
  if (!frameWindow) return clip;
  const totalFrames = Math.max(2, Math.floor(clip.duration * 30));
  const s = Math.max(0, Math.min(totalFrames - 4, frameWindow[0]));
  const e = Math.max(s + 4, Math.min(totalFrames, frameWindow[1]));
  const sub = THREE.AnimationUtils.subclip(clip, key, s, e, 30);
  sub.optimize();
  return sub;
}

export async function loadRudraChamberRig(
  onProgress?: (label: string) => void
): Promise<LoadedRudraRig> {
  onProgress?.('Awakening Rudra & Parashu...');

  const [
    riggedGroup,
    texturedGroup,
    parashuGroup,
    rawRudraTex,
    rawParashuTex,
    idleFbx,
    runFbx,
    atk1Fbx,
    atk2Fbx,
    atk3Fbx,
    heavyFbx,
    castFbx,
    blockFbx,
    hurtFbx,
    dodgeFbx,
  ] = await Promise.all([
    loadFbx('/kaalyuga/rudra/rigged.fbx'),
    loadFbx('/kaalyuga/rudra/textured.fbx'),
    loadFbx('/kaalyuga/parashu/weapon.fbx'),
    loadTexture('/kaalyuga/rudra/diffuse.png'),
    loadTexture('/kaalyuga/parashu/diffuse.png'),
    loadFbx('/kaalyuga/anims/rudra/idle.fbx'),
    loadFbx('/kaalyuga/anims/rudra/run.fbx'),
    loadFbx('/kaalyuga/anims/rudra/attack1.fbx'),
    loadFbx('/kaalyuga/anims/rudra/attack2.fbx'),
    loadFbx('/kaalyuga/anims/rudra/attack3.fbx'),
    loadFbx('/kaalyuga/anims/rudra/heavy.fbx'),
    loadFbx('/kaalyuga/anims/rudra/cast.fbx'),
    loadFbx('/kaalyuga/anims/rudra/block.fbx'),
    loadFbx('/kaalyuga/anims/rudra/hurt.fbx'),
    loadFbx('/kaalyuga/anims/rudra/dodge.fbx'),
  ]);

  const rudraTex = liftTextureToAnimeVibrancy(rawRudraTex, 1.18, 1.22);
  const parashuTex = liftTextureToAnimeVibrancy(rawParashuTex, 1.2, 1.22);

  const rudraMat = createDemonSlayerCelMaterial({
    map: rudraTex,
    tintHex: 0xfff8ef,
    emissiveHex: 0x3b2419,
    emissiveIntensity: 0.32,
    rimColorHex: 0xffa94d,
    rimStrength: 0.68,
    rimPower: 2.3,
  });
  const parashuMat = createDemonSlayerCelMaterial({
    map: parashuTex,
    tintHex: 0xffeede,
    emissiveHex: 0x482014,
    emissiveIntensity: 0.34,
    rimColorHex: 0xff8b24,
    rimStrength: 0.85,
    rimPower: 2.0,
  });

  // Path 1 exact UV transfer onto SkinnedMesh + clean optimization
  let texMesh: THREE.Mesh | null = null;
  texturedGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && !texMesh) texMesh = c as THREE.Mesh;
  });

  riggedGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = c as THREE.Mesh;
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = false;
      if (texMesh && texMesh.geometry.attributes.uv) {
        const tCount = texMesh.geometry.attributes.position.count;
        const rCount = m.geometry.attributes.position.count;
        if (tCount === rCount) {
          m.geometry.setAttribute('uv', texMesh.geometry.attributes.uv);
        }
      }
      m.geometry = simplifyGeometryPreserveSkin(m.geometry, 62, 26000);
      m.material = rudraMat;
    }
  });

  parashuGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = c as THREE.Mesh;
      m.frustumCulled = false;
      m.castShadow = true;
      m.geometry = simplifyGeometryPreserveSkin(m.geometry, 48, 8000);
      m.material = parashuMat;
    }
  });

  const root = new THREE.Group();
  root.add(riggedGroup);

  const standingHipY = extractStandingHipY(idleFbx, riggedGroup);
  const mixer = new THREE.AnimationMixer(riggedGroup);
  const actions: Partial<Record<RudraClipKey, THREE.AnimationAction>> = {};

  const animInputs: Array<[RudraClipKey, THREE.Group, boolean, [number, number]?]> = [
    ['idle', idleFbx, true],
    ['run', runFbx, true],
    ['block', blockFbx, true],
    ['attack1', atk1Fbx, false, [38, 70]],
    ['attack2', atk2Fbx, false, [54, 92]],
    ['attack3', atk3Fbx, false, [18, 48]],
    ['heavy', heavyFbx, false, [8, 42]],
    ['cast', castFbx, false, [14, 52]],
    ['hurt', hurtFbx, false, [2, 14]],
    ['dodge', dodgeFbx, false, [1, 36]],
  ];

  for (const [key, fbx, loop, windowFrames] of animInputs) {
    const clip = fbx.animations?.[0];
    if (!clip) continue;
    const clean = buildStabilizedClip(clip, riggedGroup, standingHipY, `rudra_${key}`);
    if (clean.tracks.length === 0) continue;
    const trimmed = trimClipWindow(clean, `rudra_${key}`, windowFrames);
    const finalClip = loop ? smoothLoopSeam(trimmed) : trimmed;
    const act = mixer.clipAction(finalClip);
    act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    act.clampWhenFinished = !loop;
    actions[key] = act;
  }

  // Pose into idle frame BEFORE computing world bounding box so Rudra isn't scaled from elevated T-pose
  if (actions.idle) {
    actions.idle.play();
    mixer.update(0.05);
  }
  const footBones = collectFootBones(riggedGroup);
  const soleOffset = scaleAndGroundPosedRig(riggedGroup, 1.46, footBones);

  // Attach Sumi-e black ink outlines synced cleanly with Rudra's bones
  attachSumiInkOutlines(riggedGroup, 0.0045, 0x090508);

  // Mount Parashu Battle-Axe on Rudra's RightHand with exact local blade base/tip inside Parashu geometry
  const bladeBaseNode = new THREE.Object3D();
  const bladeTipNode = new THREE.Object3D();
  const rightHand = findBone(riggedGroup, /righthand$/i);
  const shoulderPivotNode =
    findBone(riggedGroup, /rightarm$/i) || findBone(riggedGroup, /spine2$/i) || riggedGroup;

  const weaponAuraMat = createParashuAuraMaterial();

  if (rightHand) {
    const handWorldScale = new THREE.Vector3();
    rightHand.getWorldScale(handWorldScale);
    const handScale = Math.max(1e-5, handWorldScale.x);

    parashuGroup.updateMatrixWorld(true);
    const wepBox = new THREE.Box3().setFromObject(parashuGroup);
    const wepSize = new THREE.Vector3();
    wepBox.getSize(wepSize);
    const maxDim = Math.max(0.001, wepSize.y); // Y is the long 190u Parashu handle
    const desiredWorldLen = 0.98;
    const localWepScale = desiredWorldLen / (maxDim * handScale);

    const weaponSocket = new THREE.Group();
    parashuGroup.scale.setScalar(localWepScale);
    // Align handle forward along hand Z/X grip so crescent axe head points outward along strike arc
    parashuGroup.rotation.set(-Math.PI * 0.5, 0, -Math.PI * 0.5);
    parashuGroup.position.set(0.18 * maxDim * localWepScale, 0, 0);

    // Anchor bladeBase/bladeTip cleanly across the full crescent axe head (y=46..92, x=6..39)
    bladeBaseNode.position.set(6, 46, 0);
    bladeTipNode.position.set(39, 92, 0);
    parashuGroup.add(bladeBaseNode, bladeTipNode);

    // Live ignited Parashu elemental sheath enveloping the crescent axe head
    const auraGeo = new THREE.PlaneGeometry(54, 42, 10, 4);
    const auraMesh = new THREE.Mesh(auraGeo, weaponAuraMat);
    auraMesh.position.set(27, 68, 0);
    auraMesh.rotation.z = -0.15;
    auraMesh.frustumCulled = false;
    auraMesh.renderOrder = 17;
    const auraMeshCross = new THREE.Mesh(auraGeo, weaponAuraMat);
    auraMeshCross.position.set(27, 68, 0);
    auraMeshCross.rotation.set(Math.PI * 0.36, 0, -0.15);
    auraMeshCross.frustumCulled = false;
    auraMeshCross.renderOrder = 17;
    parashuGroup.add(auraMesh, auraMeshCross);

    weaponSocket.add(parashuGroup);
    attachSumiInkOutlines(parashuGroup, 0.0055, 0x090508);
    rightHand.add(weaponSocket);
  } else {
    bladeBaseNode.position.set(0.28, 0.78, 0.2);
    bladeTipNode.position.set(0.42, 1.05, 1.0);
    root.add(bladeBaseNode, bladeTipNode);
  }

  return {
    root,
    modelGroup: riggedGroup,
    mixer,
    actions,
    materials: [rudraMat, parashuMat],
    weaponAuraMat,
    bladeBaseNode,
    bladeTipNode,
    shoulderPivotNode,
    footBones,
    soleOffset,
  };
}

export async function loadDundubhiChamberRig(
  onProgress?: (label: string) => void
): Promise<LoadedDundubhiRig> {
  onProgress?.('Summoning Bellhorn Dundubhi...');

  const [
    riggedGroup,
    texturedGroup,
    rawBossTex,
    idleFbx,
    runFbx,
    swipeFbx,
    punchFbx,
    slamFbx,
    roarFbx,
    staggerFbx,
    deathFbx,
  ] = await Promise.all([
    loadFbx('/kaalyuga/bellhorn/rigged.fbx'),
    loadFbx('/kaalyuga/bellhorn/textured.fbx'),
    loadTexture('/kaalyuga/bellhorn/diffuse.png'),
    loadFbx('/kaalyuga/anims/bellhorn/idle.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/run.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/swipe.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/punch.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/slam.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/roar.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/stagger.fbx'),
    loadFbx('/kaalyuga/anims/bellhorn/death.fbx'),
  ]);

  const bossTex = liftTextureToAnimeVibrancy(rawBossTex, 1.18, 1.18);
  const bossMat = createDemonSlayerCelMaterial({
    map: bossTex,
    tintHex: 0xfff2e8,
    emissiveHex: 0x3b1612,
    emissiveIntensity: 0.3,
    rimColorHex: 0xff3b1f,
    rimStrength: 0.86,
    rimPower: 2.1,
  });

  // Path 1 exact 1:1 UV transfer (839,544 === 839,544 verts) + fast preserve-skin decimation
  let texMesh: THREE.Mesh | null = null;
  texturedGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh && !texMesh) texMesh = c as THREE.Mesh;
  });

  riggedGroup.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) {
      const m = c as THREE.Mesh;
      m.frustumCulled = false;
      m.castShadow = true;
      m.receiveShadow = false;
      if (texMesh && texMesh.geometry.attributes.uv) {
        const tCount = texMesh.geometry.attributes.position.count;
        const rCount = m.geometry.attributes.position.count;
        if (tCount === rCount) {
          m.geometry.setAttribute('uv', texMesh.geometry.attributes.uv);
        }
      }
      m.geometry = simplifyGeometryPreserveSkin(m.geometry, 58, 26000);
      m.material = bossMat;
    }
  });

  const root = new THREE.Group();
  root.add(riggedGroup);

  const standingHipY = extractStandingHipY(idleFbx, riggedGroup);
  const mixer = new THREE.AnimationMixer(riggedGroup);
  const actions: Partial<Record<DundubhiClipKey, THREE.AnimationAction>> = {};

  const clips: Array<[DundubhiClipKey, THREE.Group, boolean, [number, number]?, boolean?]> = [
    ['idle', idleFbx, true],
    ['run', runFbx, true],
    ['swipe', swipeFbx, false, [6, 54]],
    ['punch', punchFbx, false, [1, 26]],
    ['slam', slamFbx, false, [6, 62]],
    ['roar', roarFbx, false, [12, 70]],
    ['stagger', staggerFbx, false, [4, 74]],
    ['death', deathFbx, false, [0, 88], true],
  ];

  for (const [key, fbx, loop, windowFrames, allowCollapse] of clips) {
    const clip = fbx.animations?.[0];
    if (!clip) continue;
    const clean = buildStabilizedClip(
      clip,
      riggedGroup,
      standingHipY,
      `bellhorn_${key}`,
      Boolean(allowCollapse)
    );
    if (clean.tracks.length === 0) continue;
    const trimmed = trimClipWindow(clean, `bellhorn_${key}`, windowFrames);
    const finalClip = loop ? smoothLoopSeam(trimmed) : trimmed;
    const act = mixer.clipAction(finalClip);
    act.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    act.clampWhenFinished = !loop;
    actions[key] = act;
  }

  // Pose Bellhorn into idle BEFORE computing height & grounding soleOffset so hooves stand planted at Y=0
  if (actions.idle) {
    actions.idle.play();
    mixer.update(0.05);
  }
  const footBones = collectFootBones(riggedGroup);
  const soleOffset = scaleAndGroundPosedRig(riggedGroup, 2.18, footBones);

  attachSumiInkOutlines(riggedGroup, 0.0045, 0x0a0406);

  // Attach right-arm claw/axe weapon span nodes for clean crimson swing trails
  const weaponBaseNode = new THREE.Object3D();
  const weaponTipNode = new THREE.Object3D();
  const rightHand = findBone(riggedGroup, /righthand$/i);
  if (rightHand) {
    const hwScale = new THREE.Vector3();
    rightHand.getWorldScale(hwScale);
    const invS = 1 / Math.max(1e-5, hwScale.x);
    weaponBaseNode.position.set(0.08 * invS, 0, 0);
    weaponTipNode.position.set(0.62 * invS, 0.16 * invS, 0.08 * invS);
    rightHand.add(weaponBaseNode, weaponTipNode);
  } else {
    weaponBaseNode.position.set(0.55, 1.08, 0.24);
    weaponTipNode.position.set(1.0, 1.46, 1.25);
    root.add(weaponBaseNode, weaponTipNode);
  }

  return {
    root,
    modelGroup: riggedGroup,
    mixer,
    actions,
    materials: [bossMat],
    weaponBaseNode,
    weaponTipNode,
    footBones,
    soleOffset,
  };
}


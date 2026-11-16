import * as THREE from 'three';
import type { EnemyTrait } from './assets';
import { attachSumiInkOutlines, createDemonSlayerCelMaterial } from './demonSlayerShader';
import { RIBBON_PALETTES, SlashRibbonController, type AstraElement } from './slashRibbonVfx';

export type BloodDemonArtTier = 'grunt' | 'boss';

export interface BloodDemonArtProfile {
  tier: BloodDemonArtTier;
  primaryHex: number;
  secondaryHex: number;
  voidInkHex: number;
  rimHex: number;
  mandalaRadiusWorld: number;
  beamCount: number;
  ribbonCount: number;
  ribbonReachWorld: number;
  bounceStrength: number;
  mandalaAlpha: number;
  sealKind: 'curse_ring' | 'vajra_hex' | 'agni_soot' | 'frenzy_claw' | 'asura_yantra' | 'eclipse_lotus';
}

/**
 * Pure-logic differentiation between Tier 1 (Grunts & Small Enemies) and Tier 2 (Bosses)
 * Blood Demon Art (Kekkijutsu) so small mobs read menacing & Demon-Slayer-styled without
 * ever cluttering or overshadowing Upper-Rank Boss Domain Arts.
 */
export function resolveBloodDemonArtProfile(params: {
  actorType: string;
  trait?: EnemyTrait;
  phase?: number;
  aiState?: string;
}): BloodDemonArtProfile {
  const t = params.actorType;
  const isBoss =
    t === 'dundubhi' || t === 'vrikodara' || t === 'semi_boss_bloodforge';
  const phase = params.phase ?? 1;
  const isWindupOrAttack = params.aiState === 'windup' || params.aiState === 'attack';

  if (isBoss) {
    const isVrik = t === 'vrikodara';
    const isSemi = t === 'semi_boss_bloodforge';
    const enraged = phase >= 2;
    return {
      tier: 'boss',
      primaryHex: isVrik ? (enraged ? 0xff163a : 0xd91c3c) : isSemi ? 0xff3b22 : 0xff2244,
      secondaryHex: isVrik ? (enraged ? 0xb45309 : 0xfb7185) : 0xff9438,
      voidInkHex: 0x050102,
      rimHex: isVrik ? 0xffe4ea : 0xffecd6,
      mandalaRadiusWorld: isVrik ? (enraged ? 3.45 : 2.95) : isSemi ? 2.35 : enraged ? 3.25 : 2.75,
      beamCount: isSemi ? 6 : enraged ? 10 : 8,
      ribbonCount: enraged ? 4 : 3,
      ribbonReachWorld: isVrik ? 2.45 : 2.15,
      bounceStrength: enraged ? 0.78 : isWindupOrAttack ? 0.68 : 0.46,
      mandalaAlpha: enraged ? 0.94 : isWindupOrAttack ? 0.86 : 0.56,
      sealKind: isVrik ? 'eclipse_lotus' : 'asura_yantra',
    };
  }

  // Tier 1: Grunts & Small Enemies — compact, dark-blood + black ink veins, zero domain pillars
  if (params.trait === 'vajra_shield') {
    return {
      tier: 'grunt',
      primaryHex: 0xbe123c,
      secondaryHex: 0x6366f1,
      voidInkHex: 0x060208,
      rimHex: 0xfda4af,
      mandalaRadiusWorld: 0.78,
      beamCount: 0,
      ribbonCount: 1,
      ribbonReachWorld: 1.18,
      bounceStrength: isWindupOrAttack ? 0.28 : 0.12,
      mandalaAlpha: isWindupOrAttack ? 0.72 : 0.24,
      sealKind: 'vajra_hex',
    };
  }
  if (params.trait === 'agni_aura') {
    return {
      tier: 'grunt',
      primaryHex: 0xc2201c,
      secondaryHex: 0xf97316,
      voidInkHex: 0x080203,
      rimHex: 0xfed7aa,
      mandalaRadiusWorld: 0.84,
      beamCount: 0,
      ribbonCount: 1,
      ribbonReachWorld: 1.24,
      bounceStrength: isWindupOrAttack ? 0.30 : 0.14,
      mandalaAlpha: isWindupOrAttack ? 0.74 : 0.26,
      sealKind: 'agni_soot',
    };
  }
  if (params.trait === 'rakshasa_frenzy') {
    return {
      tier: 'grunt',
      primaryHex: 0xdc143c,
      secondaryHex: 0x881337,
      voidInkHex: 0x050102,
      rimHex: 0xffd6de,
      mandalaRadiusWorld: 0.74,
      beamCount: 0,
      ribbonCount: 2,
      ribbonReachWorld: 1.22,
      bounceStrength: isWindupOrAttack ? 0.30 : 0.12,
      mandalaAlpha: isWindupOrAttack ? 0.76 : 0.22,
      sealKind: 'frenzy_claw',
    };
  }

  const isBrute = t === 'bloodmaw_brute' || t === 'ironmaw_gladiator';
  return {
    tier: 'grunt',
    primaryHex: t === 'ashen_oracle' ? 0xb91c3c : 0x9e0b22,
    secondaryHex: t === 'ashen_oracle' ? 0xfb7185 : 0xdc2626,
    voidInkHex: 0x060204,
    rimHex: 0xfecdd3,
    mandalaRadiusWorld: isBrute ? 0.84 : 0.68,
    beamCount: 0,
    ribbonCount: 1,
    ribbonReachWorld: isBrute ? 1.32 : 1.06,
    bounceStrength: isWindupOrAttack ? 0.24 : 0.08,
    mandalaAlpha: isWindupOrAttack ? 0.68 : 0.0,
    sealKind: 'curse_ring',
  };
}

/**
 * Procedural GLSL Boss Domain Mandala (Akaza / Asura Yantra inspired):
 * Zero external textures -> never produces untextured colored squares!
 */
function createBossMandalaShaderMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPrimary: { value: new THREE.Color(0xff2244) },
      uSecondary: { value: new THREE.Color(0xff9438) },
      uVoidInk: { value: new THREE.Color(0x050102) },
      uSpokes: { value: 12.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uPrimary;
      uniform vec3 uSecondary;
      uniform vec3 uVoidInk;
      uniform float uSpokes;
      varying vec2 vUv;

      float sdSegment(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a, ba = b - a;
        float h = clamp(dot(pa, ba) / max(1e-5, dot(ba, ba)), 0.0, 1.0);
        return length(pa - ba * h);
      }

      void main() {
        float r = length(vUv);
        if (r > 0.99 || uOpacity < 0.01) discard;
        float ang = atan(vUv.y, vUv.x);

        // Rotating 6-point & 12-point Yantra sacred polygons
        float rot1 = ang + uTime * 0.42;
        float rot2 = ang - uTime * 0.65;
        float triA = abs(cos(rot1 * 3.0) * 0.22 + 0.56 - r);
        float triB = abs(cos(rot2 * 3.0) * 0.22 + 0.56 - r);
        float hexRing = 1.0 - smoothstep(0.012, 0.038, min(triA, triB));

        // Concentric crisp outer/inner rings + Sumi-e ink borders
        float outerRing = 1.0 - smoothstep(0.018, 0.055, abs(r - 0.88));
        float midRing = 1.0 - smoothstep(0.014, 0.042, abs(r - 0.62));
        float innerRing = 1.0 - smoothstep(0.012, 0.036, abs(r - 0.34));

        // Radial spokes + lotus petals
        float spokePhase = abs(fract((ang + uTime * 0.3) * uSpokes / 6.2831853) - 0.5);
        float spokes = (1.0 - smoothstep(0.025, 0.075, spokePhase)) * step(0.32, r) * step(r, 0.90);

        float petalWave = abs(r - (0.74 + 0.09 * sin(ang * 8.0 - uTime * 2.2)));
        float petals = 1.0 - smoothstep(0.012, 0.042, petalWave);

        float lineMask = clamp(outerRing + midRing * 0.9 + innerRing * 0.95 + hexRing * 0.92 + spokes * 0.72 + petals * 0.68, 0.0, 1.0);
        float inkRim = clamp(
          (1.0 - smoothstep(0.04, 0.09, abs(r - 0.88))) * (1.0 - outerRing) +
          (1.0 - smoothstep(0.03, 0.08, min(triA, triB))) * (1.0 - hexRing),
          0.0,
          1.0
        );

        float coreGlow = exp(-r * 2.6) * 0.32;
        float alpha = clamp((lineMask * 0.95 + inkRim * 0.78 + coreGlow) * uOpacity, 0.0, 0.96);
        if (alpha < 0.03) discard;

        vec3 col = mix(uVoidInk, uPrimary * 1.25, lineMask);
        col = mix(col, uSecondary * 1.35, clamp(innerRing + outerRing * 0.65, 0.0, 1.0));
        col += vec3(1.0, 0.92, 0.94) * (innerRing * 0.48 + hexRing * 0.25);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  });
}

function createVerticalBeamMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(0xff2a48) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;
      void main() {
        float edgeX = sin(vUv.x * 3.1415926);
        float fadeY = (1.0 - smoothstep(0.15, 1.0, vUv.y)) * smoothstep(0.0, 0.08, vUv.y);
        float shimmer = 0.78 + 0.22 * sin(vUv.y * 14.0 - uTime * 7.5 + vUv.x * 6.0);
        float alpha = edgeX * edgeX * fadeY * shimmer * uOpacity * 0.54;
        if (alpha < 0.02) discard;
        vec3 col = mix(uColor, vec3(1.0, 0.9, 0.92), fadeY * 0.42) * 1.25;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Tier 2 Boss Blood Demon Art Domain Renderer (Akaza/Nezuko/Gyutaro visual tier):
 * Rotating geometric floor yantra mandala + 10 rising vertical additive light columns +
 * crisscrossing dark-ink-cored crimson blood ribbons.
 */
export class BossBloodMandalaRenderer {
  public readonly group = new THREE.Group();
  private readonly mandalaMesh: THREE.Mesh;
  private readonly mandalaMat: THREE.ShaderMaterial;
  private readonly beams: THREE.Mesh[] = [];
  private readonly beamMats: THREE.ShaderMaterial[] = [];
  private readonly vortexRibbons: SlashRibbonController[] = [];

  constructor() {
    this.mandalaMat = createBossMandalaShaderMaterial();
    const planeGeo = new THREE.PlaneGeometry(2.0, 2.0);
    planeGeo.rotateX(-Math.PI * 0.5);
    this.mandalaMesh = new THREE.Mesh(planeGeo, this.mandalaMat);
    this.mandalaMesh.position.y = 0.036;
    this.mandalaMesh.renderOrder = 12;
    this.group.add(this.mandalaMesh);

    const beamGeo = new THREE.PlaneGeometry(0.42, 3.8);
    beamGeo.translate(0, 1.9, 0);
    for (let i = 0; i < 10; i++) {
      const bmMat = createVerticalBeamMaterial();
      const bm = new THREE.Mesh(beamGeo, bmMat);
      bm.renderOrder = 16;
      bm.visible = false;
      this.beams.push(bm);
      this.beamMats.push(bmMat);
      this.group.add(bm);
    }

    for (let i = 0; i < 4; i++) {
      const rib = new SlashRibbonController('boss');
      rib.mesh.renderOrder = 21 + i;
      this.vortexRibbons.push(rib);
      this.group.add(rib.mesh);
    }

    this.group.visible = false;
  }

  public get hasActive(): boolean {
    return this.group.visible;
  }

  public update(params: {
    active: boolean;
    elapsedSec: number;
    x: number;
    z: number;
    yaw: number;
    profile: BloodDemonArtProfile;
    isAttackOrWindup: boolean;
    attackProgress01: number;
    cameraPos?: THREE.Vector3;
  }) {
    if (!params.active || params.profile.mandalaAlpha <= 0.02) {
      this.group.visible = false;
      for (const r of this.vortexRibbons) r.clear();
      return;
    }
    this.group.visible = true;
    const p = params.profile;

    this.mandalaMesh.position.set(params.x, 0.036, params.z);
    this.mandalaMesh.scale.setScalar(p.mandalaRadiusWorld);
    this.mandalaMat.uniforms.uTime.value = params.elapsedSec;
    this.mandalaMat.uniforms.uOpacity.value = p.mandalaAlpha;
    this.mandalaMat.uniforms.uPrimary.value.setHex(p.primaryHex);
    this.mandalaMat.uniforms.uSecondary.value.setHex(p.secondaryHex);
    this.mandalaMat.uniforms.uVoidInk.value.setHex(p.voidInkHex);

    // Vertical light columns arrayed along the mandala perimeter
    const beamRadius = p.mandalaRadiusWorld * 0.84;
    for (let i = 0; i < this.beams.length; i++) {
      const bm = this.beams[i];
      if (i >= p.beamCount) {
        bm.visible = false;
        continue;
      }
      bm.visible = true;
      const ang = (i / p.beamCount) * Math.PI * 2 + params.elapsedSec * 0.42;
      const bx = params.x + Math.cos(ang) * beamRadius;
      const bz = params.z + Math.sin(ang) * beamRadius;
      bm.position.set(bx, 0.02, bz);
      if (params.cameraPos) {
        bm.lookAt(params.cameraPos.x, bm.position.y, params.cameraPos.z);
      }
      const heightPulse = 0.78 + 0.34 * Math.sin(params.elapsedSec * 4.5 + i * 1.1);
      bm.scale.set(1.0 + (p.mandalaRadiusWorld - 2.4) * 0.25, heightPulse, 1.0);
      this.beamMats[i].uniforms.uTime.value = params.elapsedSec + i * 0.35;
      this.beamMats[i].uniforms.uOpacity.value =
        p.mandalaAlpha * (params.isAttackOrWindup ? 0.92 : 0.48);
      this.beamMats[i].uniforms.uColor.value.setHex(i % 2 === 0 ? p.primaryHex : p.secondaryHex);
    }

    // Crisscrossed Nezuko/Gyutaro pure-black ink-void blood ribbons during windup/attack
    const ribActive = params.isAttackOrWindup || p.mandalaAlpha > 0.78;
    for (let i = 0; i < this.vortexRibbons.length; i++) {
      const ctrl = this.vortexRibbons[i];
      if (!ribActive || i >= p.ribbonCount) {
        ctrl.clear();
        continue;
      }
      ctrl.setTheme('boss');
      const spin = params.yaw + i * 1.57 + params.elapsedSec * (i % 2 === 0 ? 3.2 : -2.8);
      const prog = params.isAttackOrWindup
        ? Math.max(0.15, Math.min(0.95, params.attackProgress01))
        : (params.elapsedSec * 0.9 + i * 0.27) % 0.92;
      ctrl.updateParametricSwing(
        params.elapsedSec + i * 0.19,
        true,
        i % 2 === 0 ? 'attack3' : 'heavy',
        params.x,
        params.z,
        spin,
        prog,
        p.ribbonReachWorld - 1.3
      );
      ctrl.mesh.rotation.set(
        (i % 2 === 0 ? 0.28 : -0.34) * Math.cos(spin),
        0,
        (i % 2 === 0 ? -0.26 : 0.32) * Math.sin(spin)
      );
      ctrl.mesh.position.y = 0.28 + i * 0.14;
    }
  }

  public clear() {
    this.group.visible = false;
    for (const r of this.vortexRibbons) r.clear();
  }

  public dispose() {
    this.mandalaMesh.geometry.dispose();
    this.mandalaMat.dispose();
    if (this.beams[0]) this.beams[0].geometry.dispose();
    for (const m of this.beamMats) m.dispose();
    for (const r of this.vortexRibbons) r.dispose();
  }
}

function createGruntCurseRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uPrimary: { value: new THREE.Color(0x9e0b22) },
      uSecondary: { value: new THREE.Color(0xdc2626) },
      uInk: { value: new THREE.Color(0x060204) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uPrimary;
      uniform vec3 uSecondary;
      uniform vec3 uInk;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 0.99 || uOpacity < 0.02) discard;
        float ang = atan(vUv.y, vUv.x);
        float outerRing = 1.0 - smoothstep(0.025, 0.08, abs(r - 0.84));
        float innerRing = 1.0 - smoothstep(0.02, 0.07, abs(r - 0.52));
        float diamond = abs(cos((ang + uTime * 1.1) * 2.0) * 0.22 + 0.56 - r);
        float sigil = 1.0 - smoothstep(0.02, 0.065, diamond);
        float mask = clamp(outerRing + innerRing * 0.75 + sigil * 0.85, 0.0, 1.0);
        if (mask < 0.06) discard;
        vec3 col = mix(uInk, uPrimary * 1.15, mask);
        col = mix(col, uSecondary * 1.25, sigil * 0.55);
        gl_FragColor = vec4(col, mask * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Tier 1 Grunt / Small Enemy Blood Demon Art Pool:
 * Compact localized dark-crimson-and-ink curse sigils under attacking enemies + lean crimson-ink
 * slash crescents so every grunt displays Blood Demon Art without matching boss scale.
 */
export class GruntBloodArtPool {
  public readonly group = new THREE.Group();
  private readonly seals: Array<{
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    usedThisFrame: boolean;
  }> = [];
  private readonly slashRibbons: Array<{
    ctrl: SlashRibbonController;
    age: number;
    maxAge: number;
    x: number;
    z: number;
    yaw: number;
    reach: number;
    active: boolean;
  }> = [];

  constructor(sealPoolSize = 14, slashPoolSize = 8) {
    const planeGeo = new THREE.PlaneGeometry(2.0, 2.0);
    planeGeo.rotateX(-Math.PI * 0.5);
    for (let i = 0; i < sealPoolSize; i++) {
      const mat = createGruntCurseRingMaterial();
      const mesh = new THREE.Mesh(planeGeo, mat);
      mesh.renderOrder = 11;
      mesh.visible = false;
      this.group.add(mesh);
      this.seals.push({ mesh, mat, usedThisFrame: false });
    }
    for (let i = 0; i < slashPoolSize; i++) {
      const ctrl = new SlashRibbonController('boss');
      ctrl.mesh.renderOrder = 20;
      this.group.add(ctrl.mesh);
      this.slashRibbons.push({
        ctrl,
        age: 0,
        maxAge: 0.24,
        x: 0,
        z: 0,
        yaw: 0,
        reach: 0,
        active: false,
      });
    }
  }

  public get hasActive(): boolean {
    return (
      this.seals.some((s) => s.mesh.visible) ||
      this.slashRibbons.some((s) => s.active)
    );
  }

  public beginFrame() {
    for (const s of this.seals) {
      s.usedThisFrame = false;
      s.mesh.visible = false;
    }
  }

  public applyGruntSeal(
    index: number,
    elapsedSec: number,
    x: number,
    z: number,
    profile: BloodDemonArtProfile
  ) {
    if (profile.mandalaAlpha <= 0.02 || index < 0 || index >= this.seals.length) return;
    const s = this.seals[index];
    s.usedThisFrame = true;
    s.mesh.visible = true;
    s.mesh.position.set(x, 0.03, z);
    s.mesh.scale.setScalar(profile.mandalaRadiusWorld);
    s.mat.uniforms.uTime.value = elapsedSec;
    s.mat.uniforms.uOpacity.value = profile.mandalaAlpha;
    s.mat.uniforms.uPrimary.value.setHex(profile.primaryHex);
    s.mat.uniforms.uSecondary.value.setHex(profile.secondaryHex);
    s.mat.uniforms.uInk.value.setHex(profile.voidInkHex);
  }

  public triggerGruntBloodSlash(
    x: number,
    z: number,
    yaw: number,
    profile: BloodDemonArtProfile
  ) {
    const count = Math.min(2, profile.ribbonCount);
    for (let c = 0; c < count; c++) {
      const slot = this.slashRibbons.find((s) => !s.active) || this.slashRibbons[0];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 0.22;
      slot.x = x;
      slot.z = z;
      slot.yaw = yaw + (c === 1 ? 0.38 : 0);
      slot.reach = profile.ribbonReachWorld - 1.32;
      slot.ctrl.setTheme('boss');
    }
  }

  public update(dt: number, elapsedSec: number) {
    for (const s of this.seals) {
      if (!s.usedThisFrame) s.mesh.visible = false;
    }
    for (const sl of this.slashRibbons) {
      if (!sl.active) continue;
      sl.age += dt;
      if (sl.age >= sl.maxAge) {
        sl.active = false;
        sl.ctrl.clear();
        continue;
      }
      const prog = Math.max(0.05, Math.min(0.96, sl.age / sl.maxAge));
      sl.ctrl.updateParametricSwing(
        elapsedSec,
        true,
        sl.reach > -0.1 ? 'attack3' : 'attack1',
        sl.x,
        sl.z,
        sl.yaw,
        prog,
        sl.reach
      );
      sl.ctrl.mesh.scale.setScalar(0.84);
    }
  }

  public clear() {
    for (const s of this.seals) s.mesh.visible = false;
    for (const sl of this.slashRibbons) {
      sl.active = false;
      sl.ctrl.clear();
    }
  }

  public dispose() {
    if (this.seals[0]) this.seals[0].mesh.geometry.dispose();
    for (const s of this.seals) s.mat.dispose();
    for (const sl of this.slashRibbons) sl.ctrl.dispose();
  }
}

function createSumiInkRingMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uProgress: { value: 0 },
      uAccent: { value: new THREE.Color(0x060208) },
      uRimColor: { value: new THREE.Color(0x38bdf8) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      uniform vec3 uAccent;
      uniform vec3 uRimColor;
      varying vec2 vUv;
      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 41.3);
        return fract(p.x * p.y);
      }
      void main() {
        float r = length(vUv);
        if (r > 1.0) discard;
        float ang = atan(vUv.y, vUv.x);
        float brushNoise = sin(ang * 9.0) * 0.045 + cos(ang * 17.0) * 0.03;
        float targetR = 0.56 + uProgress * 0.24;
        float ringDist = abs(r - (targetR + brushNoise));
        float ringThick = mix(0.11, 0.04, uProgress);
        float ring = 1.0 - smoothstep(ringThick * 0.65, ringThick, ringDist);

        // Radial calligraphic ink droplets bursting outward
        float rayCell = floor((ang + 3.14159) * 3.8);
        float dropRand = hash21(vec2(rayCell, 7.0));
        float dropletR = 0.52 + uProgress * (0.25 + dropRand * 0.24);
        float rayAng = abs(fract((ang + 3.14159) * 3.8) - 0.5);
        float droplet = (1.0 - smoothstep(0.06, 0.16, rayAng)) *
                        (1.0 - smoothstep(0.04, 0.11, abs(r - dropletR)));

        float inkAlpha = clamp((ring + droplet * 0.92) * (1.0 - smoothstep(0.55, 1.0, uProgress)), 0.0, 0.95);
        if (inkAlpha < 0.08) discard;
        float rimGlow = smoothstep(ringThick * 0.5, ringThick * 0.9, ringDist) * ring * 0.45;
        vec3 col = mix(uAccent, uRimColor, rimGlow);
        gl_FragColor = vec4(col, inkAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Demon Slayer Pure-Black Sumi-e Ink Splatter Ring Pool (Tanjiro Water Breathing kill aesthetic):
 * Draws crisp black calligraphic brush rings & droplets behind heavy hits, parries, finishers, and kills.
 */
export class SumiInkSplashPool {
  public readonly group = new THREE.Group();
  private readonly items: Array<{
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    age: number;
    maxAge: number;
    sizeStart: number;
    sizeEnd: number;
    active: boolean;
  }> = [];

  constructor(poolSize = 10) {
    const geo = new THREE.PlaneGeometry(2.0, 2.0);
    for (let i = 0; i < poolSize; i++) {
      const mat = createSumiInkRingMaterial();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 24;
      mesh.visible = false;
      this.group.add(mesh);
      this.items.push({
        mesh,
        mat,
        age: 0,
        maxAge: 0.34,
        sizeStart: 1.1,
        sizeEnd: 2.3,
        active: false,
      });
    }
  }

  public get hasActive(): boolean {
    return this.items.some((i) => i.active);
  }

  public spawn(
    x: number,
    y: number,
    z: number,
    rimColorHex = 0x38bdf8,
    scale = 1.65,
    cameraPos?: THREE.Vector3
  ) {
    const slot = this.items.find((i) => !i.active) || this.items[0];
    slot.active = true;
    slot.age = 0;
    slot.maxAge = 0.34;
    slot.sizeStart = scale * 0.65;
    slot.sizeEnd = scale * 1.35;
    slot.mat.uniforms.uProgress.value = 0;
    slot.mat.uniforms.uRimColor.value.setHex(rimColorHex);
    slot.mesh.position.set(x, Math.max(0.55, y), z);
    if (cameraPos) {
      slot.mesh.lookAt(cameraPos);
    }
    slot.mesh.rotateZ(Math.random() * Math.PI * 2);
    slot.mesh.scale.setScalar(slot.sizeStart);
    slot.mesh.visible = true;
  }

  public update(dt: number, cameraPos?: THREE.Vector3) {
    for (const item of this.items) {
      if (!item.active) continue;
      item.age += dt;
      if (item.age >= item.maxAge) {
        item.active = false;
        item.mesh.visible = false;
        continue;
      }
      const p = item.age / item.maxAge;
      item.mat.uniforms.uProgress.value = p;
      item.mesh.scale.setScalar(item.sizeStart + (item.sizeEnd - item.sizeStart) * Math.sqrt(p));
      if (cameraPos) {
        item.mesh.lookAt(cameraPos);
      }
    }
  }

  public clear() {
    for (const item of this.items) {
      item.active = false;
      item.mesh.visible = false;
    }
  }

  public dispose() {
    if (this.items[0]) this.items[0].mesh.geometry.dispose();
    for (const item of this.items) item.mat.dispose();
  }
}

function createFissureCrackMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 1 },
      uCoreColor: { value: new THREE.Color(0xfff4c2) },
      uGlowColor: { value: new THREE.Color(0xff5a1f) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform vec3 uCoreColor;
      uniform vec3 uGlowColor;
      varying vec2 vUv;
      void main() {
        float r = length(vUv);
        if (r > 0.99 || uOpacity < 0.02) discard;
        float ang = atan(vUv.y, vUv.x);
        float branchAngle = abs(fract((ang + 3.14159) * 1.114 + sin(r * 14.0) * 0.14) - 0.5);
        float mainCrack = 1.0 - smoothstep(0.025, 0.085, branchAngle);
        float fork = 1.0 - smoothstep(0.015, 0.055, abs(fract((ang + 1.2) * 2.23 + cos(r * 18.0) * 0.12) - 0.5));
        float radialFade = (1.0 - smoothstep(0.55, 0.98, r)) * smoothstep(0.04, 0.14, r);
        float crack = clamp((mainCrack + fork * 0.72) * radialFade, 0.0, 1.0);
        if (crack < 0.06) discard;
        float inkHalo = (1.0 - smoothstep(0.07, 0.15, branchAngle)) * radialFade * (1.0 - crack);
        vec3 col = mix(vec3(0.04, 0.01, 0.02), uGlowColor * 1.25, crack);
        col = mix(col, uCoreColor * 1.45, smoothstep(0.55, 0.95, crack));
        gl_FragColor = vec4(col, clamp((crack + inkHalo * 0.8) * uOpacity, 0.0, 0.95));
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * 3D Molten / Electric Ground Fissures + Cel-Shaded Flying Boulder Shards:
 * Replaces tiny flat confetti dots on Heavy Slams, Vajra Thunderclap, and Pillar Shatters!
 */
export class GroundFractureAndBouldersPool {
  public readonly group = new THREE.Group();
  private readonly fissures: Array<{
    mesh: THREE.Mesh;
    mat: THREE.ShaderMaterial;
    age: number;
    maxAge: number;
    active: boolean;
  }> = [];
  private readonly boulders: Array<{
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    rotX: number;
    rotY: number;
    age: number;
    maxAge: number;
    baseScale: number;
    active: boolean;
  }> = [];

  constructor(fissureCount = 6, boulderCount = 24) {
    const fGeo = new THREE.PlaneGeometry(2.0, 2.0);
    fGeo.rotateX(-Math.PI * 0.5);
    for (let i = 0; i < fissureCount; i++) {
      const mat = createFissureCrackMaterial();
      const mesh = new THREE.Mesh(fGeo, mat);
      mesh.renderOrder = 10;
      mesh.visible = false;
      this.group.add(mesh);
      this.fissures.push({ mesh, mat, age: 0, maxAge: 1.5, active: false });
    }

    const stoneGeo = new THREE.DodecahedronGeometry(0.16, 0);
    const stoneMat = createDemonSlayerCelMaterial({
      map: null,
      tintHex: 0x5c524a,
      emissiveHex: 0x1a120d,
      emissiveIntensity: 0.14,
      rimColorHex: 0xffb347,
      rimStrength: 0.45,
    });
    for (let i = 0; i < boulderCount; i++) {
      const mesh = new THREE.Mesh(stoneGeo, stoneMat);
      attachSumiInkOutlines(mesh, 0.06, 0x070409);
      mesh.visible = false;
      mesh.renderOrder = 18;
      this.group.add(mesh);
      this.boulders.push({
        mesh,
        vx: 0,
        vy: 0,
        vz: 0,
        rotX: 0,
        rotY: 0,
        age: 0,
        maxAge: 0.72,
        baseScale: 1,
        active: false,
      });
    }
  }

  public get hasActive(): boolean {
    return this.fissures.some((f) => f.active) || this.boulders.some((b) => b.active);
  }

  public triggerImpact(
    x: number,
    z: number,
    element: AstraElement | 'boss',
    radiusWorld = 2.0,
    boulderBurstCount = 8
  ) {
    const pal = RIBBON_PALETTES[element];
    const fSlot = this.fissures.find((f) => !f.active) || this.fissures[0];
    fSlot.active = true;
    fSlot.age = 0;
    fSlot.maxAge = 1.45;
    fSlot.mat.uniforms.uOpacity.value = 0.95;
    fSlot.mat.uniforms.uCoreColor.value.copy(pal.coreColor);
    fSlot.mat.uniforms.uGlowColor.value.copy(pal.midColor);
    fSlot.mesh.position.set(x, 0.025, z);
    fSlot.mesh.rotation.y = Math.random() * Math.PI * 2;
    fSlot.mesh.scale.setScalar(radiusWorld);
    fSlot.mesh.visible = true;

    let spawned = 0;
    for (let i = 0; i < this.boulders.length && spawned < boulderBurstCount; i++) {
      const b = this.boulders[i];
      if (b.active) continue;
      b.active = true;
      b.age = 0;
      b.maxAge = 0.56 + Math.random() * 0.24;
      const ang = (spawned / Math.max(1, boulderBurstCount)) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 2.8 + Math.random() * 4.2;
      b.vx = Math.cos(ang) * spd;
      b.vy = 4.2 + Math.random() * 3.8;
      b.vz = Math.sin(ang) * spd;
      b.rotX = (Math.random() - 0.5) * 10;
      b.rotY = (Math.random() - 0.5) * 10;
      b.baseScale = 0.72 + Math.random() * 0.85;
      b.mesh.position.set(x + Math.cos(ang) * 0.35, 0.14, z + Math.sin(ang) * 0.35);
      b.mesh.scale.set(b.baseScale, b.baseScale * 0.82, b.baseScale * 1.15);
      b.mesh.visible = true;
      spawned++;
    }
  }

  public update(dt: number) {
    for (const f of this.fissures) {
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.active = false;
        f.mesh.visible = false;
        continue;
      }
      const p = f.age / f.maxAge;
      f.mat.uniforms.uOpacity.value = p > 0.65 ? (1 - (p - 0.65) / 0.35) * 0.94 : 0.94;
    }

    for (const b of this.boulders) {
      if (!b.active) continue;
      b.age += dt;
      if (b.age >= b.maxAge) {
        b.active = false;
        b.mesh.visible = false;
        continue;
      }
      b.vy -= 17.5 * dt;
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.y += b.vy * dt;
      b.mesh.position.z += b.vz * dt;
      if (b.mesh.position.y < 0.09) {
        b.mesh.position.y = 0.09;
        b.vy = Math.abs(b.vy) * 0.38;
        b.vx *= 0.72;
        b.vz *= 0.72;
      }
      b.mesh.rotation.x += b.rotX * dt;
      b.mesh.rotation.y += b.rotY * dt;
      const life = 1 - b.age / b.maxAge;
      const sc = b.baseScale * (life < 0.3 ? life / 0.3 : 1);
      b.mesh.scale.set(sc, sc * 0.82, sc * 1.15);
    }
  }

  public clear() {
    for (const f of this.fissures) {
      f.active = false;
      f.mesh.visible = false;
    }
    for (const b of this.boulders) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  public dispose() {
    if (this.fissures[0]) this.fissures[0].mesh.geometry.dispose();
    for (const f of this.fissures) f.mat.dispose();
    for (const b of this.boulders) {
      b.mesh.geometry.dispose();
      (b.mesh.material as THREE.Material).dispose();
    }
  }
}

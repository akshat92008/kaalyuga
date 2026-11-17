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
 * Procedural GLSL Boss Domain Mandala (Akaza Compass Needle / 12-Point Vedic Asura Yantra Lattice):
 * Razor-thin white-hot core + neon crimson/amber sacred geometric snowflake filigree,
 * 12 radial compass needles, outer hexagonal snowflake gates, and deep Sumi-e void-ink contrast.
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

      void main() {
        float r = length(vUv);
        if (r > 0.99 || uOpacity < 0.01) discard;
        float ang = atan(vUv.y, vUv.x) + uTime * 0.18;

        // 12-fold Akaza Compass Needle / Sacred Snowflake symmetry
        float sector = 6.2831853 / 12.0;
        float localAng = mod(ang + sector * 0.5, sector) - sector * 0.5;
        float symX = r * cos(localAng);
        float symY = abs(r * sin(localAng));

        // 1. Primary radial compass needle beams with branched snowflake barbs
        float mainSpoke = (1.0 - smoothstep(0.006, 0.017, symY)) * step(0.18, symX) * step(symX, 0.95);
        float barb1 = (1.0 - smoothstep(0.005, 0.015, abs(symY - (symX - 0.38) * 0.58))) * step(0.38, symX) * step(symX, 0.68);
        float barb2 = (1.0 - smoothstep(0.005, 0.015, abs(symY - (0.82 - symX) * 0.52))) * step(0.54, symX) * step(symX, 0.84);
        float hexGate = (1.0 - smoothstep(0.006, 0.016, abs(symX - 0.80))) * step(symY, 0.14);

        // 2. Interlocking 12-point star polygon chords & razor-thin inner/outer compass rings
        float starR1 = 0.54 / max(0.35, cos(mod(ang * 3.0, 1.0471975) - 0.5235987));
        float starPoly1 = 1.0 - smoothstep(0.006, 0.018, abs(r - starR1 * 0.62));
        float starR2 = 0.54 / max(0.35, cos(mod((ang + 0.5235987) * 3.0, 1.0471975) - 0.5235987));
        float starPoly2 = 1.0 - smoothstep(0.006, 0.018, abs(r - starR2 * 0.62));

        float innerHub = 1.0 - smoothstep(0.006, 0.016, abs(r - 0.20));
        float midCompass = 1.0 - smoothstep(0.005, 0.014, abs(r - 0.46));
        float outerCompass = 1.0 - smoothstep(0.006, 0.016, abs(r - 0.88));

        // 3. Fine Vedic degree ticks along the compass rim
        float tickPhase = abs(fract(ang * 36.0 / 6.2831853) - 0.5);
        float ticks = (1.0 - smoothstep(0.06, 0.16, tickPhase)) * step(0.83, r) * step(r, 0.88);

        float filigree = clamp(
          mainSpoke + barb1 * 0.92 + barb2 * 0.92 + hexGate * 0.95 +
          max(starPoly1, starPoly2) * 0.88 + innerHub + midCompass * 0.85 + outerCompass * 0.90 + ticks * 0.75,
          0.0,
          1.0
        );

        // Dark Sumi-e void-ink recessed framing around the glowing lattice bars (never a solid red disk!)
        float inkOutline = clamp(
          (1.0 - smoothstep(0.016, 0.042, symY)) * step(0.18, symX) * step(symX, 0.95) +
          (1.0 - smoothstep(0.016, 0.042, abs(r - 0.88))),
          0.0,
          1.0
        ) * (1.0 - filigree);

        float pulse = 0.84 + 0.16 * sin(r * 18.0 - uTime * 5.5);
        float alpha = clamp((filigree * 0.96 + inkOutline * 0.72) * pulse * uOpacity, 0.0, 0.96);
        if (alpha < 0.04) discard;

        vec3 glowCol = mix(uPrimary * 1.35, uSecondary * 1.45, clamp(symY * 3.5 + (1.0 - r) * 0.45, 0.0, 1.0));
        // White-hot anime core inside the razor filigree lines
        vec3 whiteHot = vec3(1.0, 0.96, 0.95) * smoothstep(0.55, 0.95, filigree) * 0.72;
        vec3 col = mix(uVoidInk, glowCol + whiteHot, filigree);
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
        float edgeX = pow(sin(vUv.x * 3.1415926), 1.6);
        float fadeY = (1.0 - smoothstep(0.12, 1.0, vUv.y)) * smoothstep(0.0, 0.06, vUv.y);
        float shimmer = 0.82 + 0.18 * sin(vUv.y * 16.0 - uTime * 8.5 + vUv.x * 6.0);
        float alpha = edgeX * fadeY * shimmer * uOpacity * 0.62;
        if (alpha < 0.02) discard;
        vec3 col = mix(uColor, vec3(1.0, 0.94, 0.95), edgeX * fadeY * 0.58) * 1.35;
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
 * Rotating 12-point sacred geometric floor compass lattice + rising vertical light columns at vertices +
 * crisscrossing dark-ink-cored crimson blood ribbons strictly during active windups & attacks.
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
    const planeGeo = new THREE.PlaneGeometry(2.2, 2.2);
    planeGeo.rotateX(-Math.PI * 0.5);
    this.mandalaMesh = new THREE.Mesh(planeGeo, this.mandalaMat);
    this.mandalaMesh.position.y = 0.036;
    this.mandalaMesh.renderOrder = 12;
    this.group.add(this.mandalaMesh);

    const beamGeo = new THREE.PlaneGeometry(0.32, 3.4);
    beamGeo.translate(0, 1.7, 0);
    for (let i = 0; i < 12; i++) {
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

    // Vertical light columns arrayed along the 12 compass vertices
    const beamRadius = p.mandalaRadiusWorld * 0.82;
    for (let i = 0; i < this.beams.length; i++) {
      const bm = this.beams[i];
      if (i >= p.beamCount) {
        bm.visible = false;
        continue;
      }
      bm.visible = true;
      const ang = (i / p.beamCount) * Math.PI * 2 - params.elapsedSec * 0.18;
      const bx = params.x + Math.cos(ang) * beamRadius;
      const bz = params.z + Math.sin(ang) * beamRadius;
      bm.position.set(bx, 0.02, bz);
      if (params.cameraPos) {
        bm.lookAt(params.cameraPos.x, bm.position.y, params.cameraPos.z);
      }
      const heightPulse = 0.72 + 0.38 * Math.sin(params.elapsedSec * 5.0 + i * 1.1);
      bm.scale.set(0.85, heightPulse, 1.0);
      this.beamMats[i].uniforms.uTime.value = params.elapsedSec + i * 0.35;
      this.beamMats[i].uniforms.uOpacity.value =
        p.mandalaAlpha * (params.isAttackOrWindup ? 0.88 : 0.36);
      this.beamMats[i].uniforms.uColor.value.setHex(i % 2 === 0 ? p.primaryHex : p.secondaryHex);
    }

    // Single clean ground-skimming crimson-and-black ink shock-crescent ONLY at the peak of an active boss attack swing
    const ribActive = params.isAttackOrWindup && params.attackProgress01 > 0.25 && params.attackProgress01 < 0.88;
    for (let i = 0; i < this.vortexRibbons.length; i++) {
      const ctrl = this.vortexRibbons[i];
      if (!ribActive || i > 0) {
        ctrl.clear();
        continue;
      }
      ctrl.setTheme('boss');
      ctrl.updateParametricSwing(
        params.elapsedSec,
        true,
        'attack3',
        params.x,
        params.z,
        params.yaw,
        params.attackProgress01,
        p.ribbonReachWorld - 1.25
      );
      ctrl.mesh.rotation.set(0, 0, 0);
      ctrl.mesh.position.y = 0.24;
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
        float ang = atan(vUv.y, vUv.x) + uTime * 0.85;
        float hexSym = abs(cos(ang * 3.0)) * 0.24 + 0.58;
        float starLine = 1.0 - smoothstep(0.010, 0.032, abs(r - hexSym));
        float outerRing = 1.0 - smoothstep(0.010, 0.030, abs(r - 0.86));
        float spoke = (1.0 - smoothstep(0.015, 0.048, abs(fract(ang * 6.0 / 6.2831853) - 0.5))) * step(0.32, r) * step(r, 0.86);
        float mask = clamp(outerRing + starLine * 0.95 + spoke * 0.80, 0.0, 1.0);
        if (mask < 0.06) discard;
        vec3 col = mix(uInk, uPrimary * 1.35, mask);
        col = mix(col, uSecondary * 1.45, starLine * 0.65);
        gl_FragColor = vec4(col, mask * uOpacity * 0.92);
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

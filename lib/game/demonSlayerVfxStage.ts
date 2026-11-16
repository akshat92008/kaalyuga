import * as THREE from 'three';
import {
  AstraCycloneVfx,
  type AstraElement,
  DundubhiBloodDemonArtVfx,
  DashEchoPool,
  HeavyWaveVfx,
  PooledSparkSystem,
  type RibbonTheme,
  SlashRibbonController,
  type SwingKind,
} from './slashRibbonVfx';
import { getSharedStudioWebGLRenderer } from './hadesSpriteBaker';

export const ARENA_THREE_SCALE_PX = 54;
export const ARENA_ISO_Y_RATIO = 0.62;

const CAMERA_DIST = 26;
const SIN_PITCH = ARENA_ISO_Y_RATIO;
const COS_PITCH = Math.sqrt(1 - SIN_PITCH * SIN_PITCH);

export interface ArenaWorldPoint {
  x: number;
  z: number;
}

export interface OrthoStageCameraSpec {
  targetX: number;
  targetZ: number;
  camPosX: number;
  camPosY: number;
  camPosZ: number;
  halfW: number;
  halfH: number;
  effectiveZoom: number;
  worldRect: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export function stanceToAstraElement(stance: string): AstraElement {
  if (stance === 'pillar') return 'vayu';
  if (stance === 'thrust') return 'vajra';
  return 'agni';
}

export function arenaToThreeWorld(arenaX: number, arenaY: number): ArenaWorldPoint {
  return {
    x: arenaX / ARENA_THREE_SCALE_PX,
    z: arenaY / (ARENA_THREE_SCALE_PX * ARENA_ISO_Y_RATIO),
  };
}

export function arenaAngleToThreeYaw(angleRad: number): number {
  return Math.PI * 0.5 - angleRad;
}

export function computeOrthoStageCameraSpec(
  camX: number,
  camY: number,
  viewportW: number,
  viewportH: number,
  cameraZoom = 1
): OrthoStageCameraSpec {
  const safeW = Math.max(1, viewportW);
  const safeH = Math.max(1, viewportH);
  // Slightly widen coverage so dynamic zoom-out and trauma shake never clip edges
  const effectiveZoom = Math.max(0.55, Math.min(0.9, (cameraZoom || 1) * 0.92));
  const worldW = safeW / effectiveZoom;
  const worldH = safeH / effectiveZoom;
  const centerArenaX = camX + safeW * 0.5;
  const centerArenaY = camY + safeH * 0.5;
  const target = arenaToThreeWorld(centerArenaX, centerArenaY);

  return {
    targetX: target.x,
    targetZ: target.z,
    camPosX: target.x,
    camPosY: CAMERA_DIST * SIN_PITCH,
    camPosZ: target.z + CAMERA_DIST * COS_PITCH,
    halfW: worldW / (2 * ARENA_THREE_SCALE_PX),
    halfH: worldH / (2 * ARENA_THREE_SCALE_PX),
    effectiveZoom,
    worldRect: {
      x: centerArenaX - worldW * 0.5,
      y: centerArenaY - worldH * 0.5,
      w: worldW,
      h: worldH,
    },
  };
}

export interface RudraStageFrameState {
  x: number;
  y: number;
  angleRad: number;
  stance: string;
  isAttacking: boolean;
  isHeavyAttack: boolean;
  isCasting: boolean;
  swingKind: SwingKind;
  attackProgress: number;
  castProgress: number;
  castElement: AstraElement;
  reachBonus?: number;
}

export interface BossStageFrameState {
  active: boolean;
  x: number;
  y: number;
  angleRad: number;
  enraged: boolean;
  isWindingUp: boolean;
  isCharging: boolean;
  isDead: boolean;
  isSwinging: boolean;
  swingKind?: SwingKind;
  swingProgress?: number;
  showAura?: boolean;
}

/**
 * Live 3D Demon Slayer Anime VFX Overlay Stage:
 * Synchronizes a transparent Three.js Orthographic scene 1:1 with Kaalyuga's 2.5D arena camera
 * and renders genuine 3-pass elemental slash ribbons, Astra cyclone mandalas, triple heavy crescent waves,
 * dash echoes, X-flare parry clashes, and Dundubhi's Blood Demon Art flipbook suite.
 */
export class DemonSlayerVfxStage {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.OrthographicCamera;
  private readonly vfxCanvas: HTMLCanvasElement | null;
  private readonly vfxCtx: CanvasRenderingContext2D | null;
  private readonly rudraRibbon: SlashRibbonController;
  private readonly bossRibbon: SlashRibbonController;
  private readonly cycloneVfx: AstraCycloneVfx;
  private readonly heavyWaves: HeavyWaveVfx;
  private readonly dashEchoes: DashEchoPool;
  private readonly sparks: PooledSparkSystem;
  private readonly bloodArt: DundubhiBloodDemonArtVfx;
  private readonly scratchCamPos = new THREE.Vector3(0, CAMERA_DIST * SIN_PITCH, CAMERA_DIST * COS_PITCH);
  private elapsedSec = 0;
  private disposed = false;

  // Brief burst-swing tracker for instant one-shot swings if caller uses trigger
  private rudraSwingTimer = 0;
  private rudraSwingDuration = 0.24;
  private rudraSwingKind: SwingKind = 'attack1';
  private rudraSwingOrigin = { x: 0, z: 0, yaw: 0, reach: 0 };

  constructor() {
    this.camera = new THREE.OrthographicCamera(-12, 12, 8, -8, 0.1, 120);
    this.rudraRibbon = new SlashRibbonController('agni');
    this.bossRibbon = new SlashRibbonController('boss');
    this.cycloneVfx = new AstraCycloneVfx();
    this.heavyWaves = new HeavyWaveVfx();
    this.dashEchoes = new DashEchoPool();
    this.sparks = new PooledSparkSystem(56);
    this.bloodArt = new DundubhiBloodDemonArtVfx();

    this.scene.add(
      this.rudraRibbon.mesh,
      this.bossRibbon.mesh,
      this.cycloneVfx.group,
      this.heavyWaves.group,
      this.dashEchoes.group,
      this.sparks.group,
      this.bloodArt.group
    );

    if (typeof document !== 'undefined') {
      this.vfxCanvas = document.createElement('canvas');
      this.vfxCanvas.width = 960;
      this.vfxCanvas.height = 540;
      this.vfxCtx = this.vfxCanvas.getContext('2d');
    } else {
      this.vfxCanvas = null;
      this.vfxCtx = null;
    }
  }

  public triggerRudraSwing(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    stance: string,
    kind: SwingKind = 'attack1',
    durationSec = 0.24,
    reachBonus = 0
  ) {
    this.rudraRibbon.setTheme(stanceToAstraElement(stance));
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.rudraSwingOrigin = {
      x: w.x,
      z: w.z,
      yaw: arenaAngleToThreeYaw(angleRad),
      reach: reachBonus,
    };
    this.rudraSwingKind = kind;
    this.rudraSwingDuration = Math.max(0.14, durationSec);
    this.rudraSwingTimer = this.rudraSwingDuration;
  }

  public triggerHeavyWave(
    arenaX: number,
    arenaY: number,
    angleRad: number,
    element: AstraElement,
    speed = 11.5
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.heavyWaves.triggerTripleWave(w.x, w.z, arenaAngleToThreeYaw(angleRad), element, speed);
  }

  public spawnDashEcho(arenaX: number, arenaY: number, angleRad: number, stance: string) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.dashEchoes.spawn(w.x, w.z, arenaAngleToThreeYaw(angleRad), stanceToAstraElement(stance));
  }

  public triggerParryClash(arenaX: number, arenaY: number, colorHex = 0xffe484) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.sparks.triggerClashFlare(w.x, 1.05, w.z, colorHex, this.scratchCamPos);
  }

  public triggerHitSparks(arenaX: number, arenaY: number, colorHex = 0xff9e3d, count = 14) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.sparks.spawnBurst(w.x, 0.95, w.z, colorHex, count, 6.2);
  }

  public triggerBossSickles(arenaX: number, arenaY: number, angleRad: number, count = 2, enraged = false) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.bloodArt.spawnFlyingBloodSickles(w.x, w.z, arenaAngleToThreeYaw(angleRad), count, enraged);
  }

  public triggerBossSpikeBurst(arenaX: number, arenaY: number, radiusPx = 120, enraged = false) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.bloodArt.spawnBloodSpikeBurst(w.x, w.z, Math.max(1.2, radiusPx / ARENA_THREE_SCALE_PX), enraged);
  }

  public triggerBossShockwave(
    arenaX: number,
    arenaY: number,
    radiusPx: number,
    kind: 'slam' | 'roar' | 'pillar_break',
    enraged = false
  ) {
    const w = arenaToThreeWorld(arenaX, arenaY);
    this.bloodArt.spawnShockwaveImpact(
      w.x,
      w.z,
      Math.max(1.4, radiusPx / ARENA_THREE_SCALE_PX),
      kind,
      enraged
    );
  }

  public clearAll() {
    this.rudraSwingTimer = 0;
    this.rudraRibbon.clear();
    this.bossRibbon.clear();
    this.cycloneVfx.update(this.elapsedSec, false, 0, 0, 0, 0, 0);
    this.heavyWaves.clear();
    this.dashEchoes.clear();
    this.sparks.clear();
    this.bloodArt.clearAll();
  }

  public updateAndComposite(
    ctx: CanvasRenderingContext2D,
    dt: number,
    camX: number,
    camY: number,
    viewportW: number,
    viewportH: number,
    cameraZoom: number,
    rudra: RudraStageFrameState,
    boss?: BossStageFrameState | null
  ) {
    if (this.disposed || !this.vfxCanvas || !this.vfxCtx) return;
    const stepDt = Math.max(0.001, Math.min(0.05, dt));
    this.elapsedSec += stepDt;

    // 1. Sync OrthographicCamera with arena world camera
    const spec = computeOrthoStageCameraSpec(camX, camY, viewportW, viewportH, cameraZoom);
    this.camera.left = -spec.halfW;
    this.camera.right = spec.halfW;
    this.camera.top = spec.halfH;
    this.camera.bottom = -spec.halfH;
    this.camera.position.set(spec.camPosX, spec.camPosY, spec.camPosZ);
    this.camera.lookAt(spec.targetX, 0, spec.targetZ);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld(true);
    this.scratchCamPos.set(spec.camPosX, spec.camPosY, spec.camPosZ);

    // 2. Rudra slash ribbon (live attack progress or recent swing burst)
    const rWorld = arenaToThreeWorld(rudra.x, rudra.y);
    const rYaw = arenaAngleToThreeYaw(rudra.angleRad);
    const elem = stanceToAstraElement(rudra.stance);
    this.rudraRibbon.setTheme(elem);

    if (rudra.isAttacking || rudra.isHeavyAttack) {
      this.rudraSwingTimer = 0;
      this.rudraRibbon.updateParametricSwing(
        this.elapsedSec,
        true,
        rudra.swingKind,
        rWorld.x,
        rWorld.z,
        rYaw,
        Math.max(0.04, Math.min(0.98, rudra.attackProgress)),
        rudra.reachBonus ?? (elem === 'vayu' ? 0.45 : 0)
      );
    } else if (this.rudraSwingTimer > 0) {
      this.rudraSwingTimer = Math.max(0, this.rudraSwingTimer - stepDt);
      const prog = 1 - this.rudraSwingTimer / Math.max(0.05, this.rudraSwingDuration);
      this.rudraRibbon.updateParametricSwing(
        this.elapsedSec,
        this.rudraSwingTimer > 0,
        this.rudraSwingKind,
        rWorld.x,
        rWorld.z,
        this.rudraSwingOrigin.yaw,
        prog,
        this.rudraSwingOrigin.reach
      );
    } else {
      this.rudraRibbon.clear();
    }

    // 3. Astra Cyclone VFX ([Q] Agneyastra / [E] Vayavyastra / [R] Vajrastra)
    this.cycloneVfx.setTheme(rudra.castElement as RibbonTheme);
    this.cycloneVfx.update(
      this.elapsedSec,
      rudra.isCasting,
      rWorld.x,
      rWorld.z,
      rYaw,
      Math.max(0, Math.min(1, rudra.castProgress)),
      rudra.castElement === 'vayu' ? 0.55 : 0.25
    );

    // 4. Pooled waves, dash echoes, parry flare & sparks
    this.heavyWaves.update(stepDt);
    this.dashEchoes.update(stepDt);
    this.sparks.update(stepDt, this.scratchCamPos);

    // 5. Boss / Dundubhi Blood Demon Art + Crimson Boss Ribbon
    if (boss && boss.active) {
      const bWorld = arenaToThreeWorld(boss.x, boss.y);
      const bYaw = arenaAngleToThreeYaw(boss.angleRad);
      if (boss.isSwinging && !boss.isDead) {
        this.bossRibbon.setTheme('boss');
        this.bossRibbon.updateParametricSwing(
          this.elapsedSec,
          true,
          boss.swingKind ?? 'attack3',
          bWorld.x,
          bWorld.z,
          bYaw,
          Math.max(0.05, Math.min(0.96, boss.swingProgress ?? 0.5)),
          0.95
        );
      } else {
        this.bossRibbon.clear();
      }
      this.bloodArt.update(
        stepDt,
        this.elapsedSec,
        bWorld.x,
        bWorld.z,
        bYaw,
        boss.enraged,
        boss.isWindingUp,
        boss.isCharging,
        boss.isDead,
        boss.showAura !== false,
        this.scratchCamPos
      );
    } else {
      this.bossRibbon.clear();
      this.bloodArt.update(stepDt, this.elapsedSec, 0, 0, 0, false, false, false, true, false, this.scratchCamPos);
    }

    // 6. Early skip when scene has zero active VFX
    const hasAnyActive =
      this.rudraRibbon.hasActive ||
      this.bossRibbon.hasActive ||
      this.cycloneVfx.hasActive ||
      this.heavyWaves.hasActive ||
      this.dashEchoes.hasActive ||
      this.sparks.hasActive ||
      this.bloodArt.hasActive;
    if (!hasAnyActive) return;

    // Cap render buffer cleanly at <= 960x540 (matches viewport aspect without GPU bloat)
    const targetW = Math.max(320, Math.min(960, Math.round(viewportW)));
    const targetH = Math.max(180, Math.min(540, Math.round((targetW * viewportH) / Math.max(1, viewportW))));
    const renderer = getSharedStudioWebGLRenderer(targetW);
    if (!renderer) return;

    const sizeVec = new THREE.Vector2();
    renderer.getSize(sizeVec);
    if (sizeVec.x !== targetW || sizeVec.y !== targetH) {
      renderer.setSize(targetW, targetH, false);
    }
    renderer.clear();
    renderer.render(this.scene, this.camera);

    if (this.vfxCanvas.width !== targetW || this.vfxCanvas.height !== targetH) {
      this.vfxCanvas.width = targetW;
      this.vfxCanvas.height = targetH;
    }
    this.vfxCtx.clearRect(0, 0, targetW, targetH);
    this.vfxCtx.drawImage(renderer.domElement, 0, 0, targetW, targetH);

    // Restore studio square size cleanly if needed next frame (shared renderer resizes dynamically)
    ctx.drawImage(
      this.vfxCanvas,
      spec.worldRect.x,
      spec.worldRect.y,
      spec.worldRect.w,
      spec.worldRect.h
    );
  }

  public dispose() {
    this.disposed = true;
    this.rudraRibbon.dispose();
    this.bossRibbon.dispose();
    this.cycloneVfx.dispose();
    this.heavyWaves.dispose();
    this.dashEchoes.dispose();
    this.sparks.dispose();
    this.bloodArt.dispose();
  }
}

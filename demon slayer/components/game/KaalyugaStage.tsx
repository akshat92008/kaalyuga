'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildBronzeDrumArena,
  type ArenaSceneHandles,
} from '@/lib/game/arenaBuilder';
import {
  getMinFootWorldY,
  loadDundubhiChamberRig,
  loadRudraChamberRig,
  type DundubhiClipKey,
  type LoadedDundubhiRig,
  type LoadedRudraRig,
  type RudraClipKey,
} from '@/lib/game/assetLoader';
import { setCelHitFlash, setCelRimStyle } from '@/lib/game/demonSlayerShader';
import {
  angleDiff,
  createInitialChamberState,
  stepChamberSimulation,
  type AstraElement,
  type ChamberSimState,
  type PlayerInputFrame,
} from '@/lib/game/rules';
import {
  AstraCycloneVfx,
  DashEchoPool,
  DundubhiBloodDemonArtVfx,
  HeavyWaveVfx,
  PooledSparkSystem,
  RIBBON_PALETTES,
  SlashRibbonController,
} from '@/lib/game/slashRibbonVfx';
import { ChamberSoundEngine } from '@/lib/game/soundEngine';
import GameHud, { type HudStateView } from './GameHud';
import TitleOverlay from './TitleOverlay';

const _vecBase = new THREE.Vector3();
const _vecTip = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _pointerNdc = new THREE.Vector2();
const _raycaster = new THREE.Raycaster();

// Locked perspective matching public/kaalyuga/arena/dundubhi_chamber.mp4 (~34° pitch isometric stone courtyard)
const VIDEO_ASPECT = 16 / 9;
const BASE_VERTICAL_FOV = 30.0;
const MATCHED_CAM_POS = new THREE.Vector3(15.0, 14.3, 15.0);
const MATCHED_CAM_TARGET = new THREE.Vector3(0, 0.82, 0);

function computeCoverMatchedFov(viewportAspect: number, impactZoomDelta = 0): number {
  const halfFovRad = THREE.MathUtils.degToRad((BASE_VERTICAL_FOV - impactZoomDelta) * 0.5);
  if (viewportAspect <= VIDEO_ASPECT) {
    return THREE.MathUtils.radToDeg(halfFovRad * 2);
  }
  // When wider than 16:9, object-cover scales by width, so preserve horizontal FOV identically
  const hFovTan = Math.tan(halfFovRad) * VIDEO_ASPECT;
  const matchedV = 2 * Math.atan(hFovTan / viewportAspect);
  return THREE.MathUtils.radToDeg(matchedV);
}

function detectSoftwareWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return true;
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
  const gpu = String(gl.getParameter(param) || '');
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
}

function mapBodyDatasetState(phase: ChamberSimState['phase']): string {
  if (phase === 'victory' || phase === 'defeat') return 'gameover';
  return phase;
}

export default function KaalyugaStage() {
  const shakeWrapperRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const soundRef = useRef<ChamberSoundEngine | null>(null);
  const simRef = useRef<ChamberSimState>(createInitialChamberState(false));
  const assetsReadyRef = useRef(false);
  const loadingLabelRef = useRef('Preparing Bronze Drum Sanctuary...');
  const lastHudSyncRef = useRef(0);

  const inputRef = useRef<{
    keys: Set<string>;
    attackPressed: boolean;
    heavyPressed: boolean;
    castPressed: boolean;
    dodgePressed: boolean;
    blockHeld: boolean;
    blockJustPressed: boolean;
    elementSwitch: AstraElement | null;
    aimWorldX: number | null;
    aimWorldZ: number | null;
  }>({
    keys: new Set<string>(),
    attackPressed: false,
    heavyPressed: false,
    castPressed: false,
    dodgePressed: false,
    blockHeld: false,
    blockJustPressed: false,
    elementSwitch: null,
    aimWorldX: null,
    aimWorldZ: null,
  });

  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  const [hud, setHud] = useState<HudStateView>(() => ({
    phase: 'title',
    assetsReady: false,
    loadingLabel: 'Awakening Bronze Drum Sanctuary...',
    hp: 100,
    maxHp: 100,
    trailHp: 100,
    stamina: 100,
    maxStamina: 100,
    astra: 'agni',
    specialCooldown: 0,
    specialMaxCooldown: 4.5,
    comboCount: 0,
    bossHp: 900,
    bossMaxHp: 900,
    bossTrailHp: 900,
    bossPoise: 0,
    bossMaxPoise: 100,
    bossPhase: 1,
    bossStaggered: false,
    elapsedSec: 0,
    snapshot: null,
    callouts: [],
    impactFlashOpacity: 0,
    speedLinesOpacity: 0,
  }));

  const syncBodyAndHudNow = useCallback((camera?: THREE.PerspectiveCamera) => {
    const s = simRef.current;
    document.body.dataset.state = mapBodyDatasetState(s.phase);

    const w = window.innerWidth || 1440;
    const h = window.innerHeight || 900;
    const projectedCallouts: HudStateView['callouts'] = [];

    if (camera) {
      for (const c of s.callouts) {
        _projVec.set(c.x, c.y, c.z).project(camera);
        if (_projVec.z >= -1 && _projVec.z <= 1) {
          projectedCallouts.push({
            id: c.id,
            screenX: (_projVec.x * 0.5 + 0.5) * w,
            screenY: (-_projVec.y * 0.5 + 0.5) * h,
            text: c.text,
            tone: c.tone,
            opacity: Math.max(0, 1 - c.age / c.duration),
          });
        }
      }
    }

    const impactRatio =
      s.impactFrame.duration > 0 ? s.impactFrame.timer / s.impactFrame.duration : 0;
    const speedBurst =
      s.phase === 'playing' &&
      (s.rudra.action === 'cast' ||
        s.rudra.action === 'heavy' ||
        s.rudra.action === 'dodge' ||
        s.boss.attackKind === 'charge')
        ? 0.36
        : 0;

    setHud({
      phase: s.phase,
      assetsReady: assetsReadyRef.current,
      loadingLabel: loadingLabelRef.current,
      hp: s.rudra.hp,
      maxHp: s.rudra.maxHp,
      trailHp: s.rudra.displayDamageTrailHp,
      stamina: s.rudra.stamina,
      maxStamina: s.rudra.maxStamina,
      astra: s.rudra.astra,
      specialCooldown: s.rudra.specialCooldown,
      specialMaxCooldown: s.rudra.specialMaxCooldown,
      comboCount: s.rudra.comboCount,
      bossHp: s.boss.hp,
      bossMaxHp: s.boss.maxHp,
      bossTrailHp: s.boss.displayDamageTrailHp,
      bossPoise: s.boss.poise,
      bossMaxPoise: s.boss.maxPoise,
      bossPhase: s.boss.phase,
      bossStaggered: s.boss.aiState === 'stagger',
      elapsedSec: s.elapsedSec,
      snapshot: s.snapshot,
      callouts: projectedCallouts,
      impactFlashOpacity: impactRatio,
      speedLinesOpacity: Math.max(impactRatio * 0.72, speedBurst),
    });
  }, []);

  const clearInputs = useCallback(() => {
    const inp = inputRef.current;
    inp.keys.clear();
    inp.attackPressed = false;
    inp.heavyPressed = false;
    inp.castPressed = false;
    inp.dodgePressed = false;
    inp.blockHeld = false;
    inp.blockJustPressed = false;
    inp.elementSwitch = null;
  }, []);

  const startGame = useCallback(() => {
    const fresh = createInitialChamberState(true);
    simRef.current = fresh;
    clearInputs();
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    soundRef.current?.setPaused(false);
    soundRef.current?.unlockAndStartBgm();
    syncBodyAndHudNow();
  }, [clearInputs, syncBodyAndHudNow]);

  const togglePause = useCallback(() => {
    const s = simRef.current;
    if (s.phase === 'playing') {
      s.phase = 'paused';
      clearInputs();
      soundRef.current?.setPaused(true);
      syncBodyAndHudNow();
    } else if (s.phase === 'paused') {
      s.phase = 'playing';
      clearInputs();
      soundRef.current?.setPaused(false);
      syncBodyAndHudNow();
    }
  }, [clearInputs, syncBodyAndHudNow]);

  const returnToTitle = useCallback(() => {
    simRef.current = createInitialChamberState(false);
    clearInputs();
    soundRef.current?.setPaused(true);
    syncBodyAndHudNow();
  }, [clearInputs, syncBodyAndHudNow]);

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    soundRef.current?.setMuted(next);
  }, []);

  const selectElement = useCallback(
    (el: AstraElement) => {
      simRef.current.rudra.astra = el;
      inputRef.current.elementSwitch = el;
      syncBodyAndHudNow();
    },
    [syncBodyAndHudNow]
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const autostart =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('autostart') === '1';

    if (autostart) {
      simRef.current = createInitialChamberState(true);
    } else {
      simRef.current = createInitialChamberState(false);
    }
    document.body.dataset.state = mapBodyDatasetState(simRef.current.phase);

    const sound = new ChamberSoundEngine();
    sound.init();
    soundRef.current = sound;

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      premultipliedAlpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const width = container.clientWidth || window.innerWidth || 1440;
    const height = container.clientHeight || window.innerHeight || 900;
    const aspect = width / Math.max(1, height);
    const camera = new THREE.PerspectiveCamera(
      computeCoverMatchedFov(aspect, 0),
      aspect,
      0.2,
      120
    );
    camera.position.copy(MATCHED_CAM_POS);
    camera.lookAt(MATCHED_CAM_TARGET);

    // Three-point warm/cool anime key/rim/hemisphere lighting rig matched to temple firelight
    const hemiLight = new THREE.HemisphereLight(0xa3b8ff, 0x3b2218, 1.25);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffe1b8, 2.35);
    keyLight.position.set(10, 18, 8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 42;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff722c, 1.35);
    rimLight.position.set(-10, 8, -11);
    scene.add(rimLight);

    const arena: ArenaSceneHandles = buildBronzeDrumArena(
      scene,
      renderer,
      simRef.current.pillars
    );

    // 3D Ufotable Demon Slayer multi-layer slash ribbons + 3-ring Cyclone + Heavy Waves + Blood Demon Art + Sparks
    const rudraRibbon = new SlashRibbonController('agni');
    const astraCyclone = new AstraCycloneVfx();
    const heavyWaveVfx = new HeavyWaveVfx();
    const bossRibbon = new SlashRibbonController('boss');
    const dundubhiBloodVfx = new DundubhiBloodDemonArtVfx();
    const dashEchoes = new DashEchoPool();
    const sparkSystem = new PooledSparkSystem();
    scene.add(
      rudraRibbon.mesh,
      astraCyclone.group,
      heavyWaveVfx.group,
      bossRibbon.mesh,
      dundubhiBloodVfx.group,
      dashEchoes.group,
      sparkSystem.mesh,
      sparkSystem.clashGroup,
      sparkSystem.fxGroup
    );

    let disposed = false;
    let rudraRig: LoadedRudraRig | null = null;
    let bossRig: LoadedDundubhiRig | null = null;
    let currentRudraClip: RudraClipKey = 'idle';
    let currentBossClip: DundubhiClipKey = 'idle';
    let bossAttackMoveToken = '';
    let dashEchoCooldown = 0;
    let waveFiredForAction = false;
    let bloodSicklesFiredThisAttack = false;

    // Smoothed rendered actor transforms so movements, turns & foot grounding glide smoothly
    let visRudraX = simRef.current.rudra.x;
    let visRudraZ = simRef.current.rudra.z;
    let visRudraYaw = simRef.current.rudra.yaw;
    let visRudraYOffset = 0;
    let visBossX = simRef.current.boss.x;
    let visBossZ = simRef.current.boss.z;
    let visBossYaw = simRef.current.boss.yaw;
    let visBossYOffset = 0;
    let rudraPoolPulse = 0;
    let bossPoolPulse = 0;

    Promise.all([
      loadRudraChamberRig((msg) => {
        loadingLabelRef.current = msg;
      }).then((rig) => {
        if (disposed) return null;
        rudraRig = rig;
        rig.root.position.set(simRef.current.rudra.x, 0, simRef.current.rudra.z);
        rig.root.rotation.y = simRef.current.rudra.yaw;
        scene.add(rig.root);
        return rig;
      }),
      loadDundubhiChamberRig((msg) => {
        loadingLabelRef.current = msg;
      }).then((rig) => {
        if (disposed) return null;
        bossRig = rig;
        rig.root.position.set(simRef.current.boss.x, 0, simRef.current.boss.z);
        rig.root.rotation.y = simRef.current.boss.yaw;
        scene.add(rig.root);
        return rig;
      }),
    ])
      .then(() => {
        if (disposed) return;
        assetsReadyRef.current = true;
        loadingLabelRef.current = 'Sanctuary Ready';
        if (!isSoftwareGl) {
          renderer.compile(scene, camera);
        }
        syncBodyAndHudNow(camera);
      })
      .catch((err) => {
        console.warn('3D model load warning:', err);
        loadingLabelRef.current = 'Asset Load Warning';
      });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const asp = w / Math.max(1, h);
      camera.aspect = asp;
      camera.fov = computeCoverMatchedFov(asp, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObs = new ResizeObserver(handleResize);
    resizeObs.observe(container);
    window.addEventListener('resize', handleResize);

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      const s = simRef.current;

      if (s.phase === 'title' || s.phase === 'victory' || s.phase === 'defeat') {
        if (code === 'Enter' || code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (code === 'Escape' || code === 'KeyP') {
        if (s.phase === 'playing' || s.phase === 'paused') {
          e.preventDefault();
          togglePause();
        }
        return;
      }

      if (code === 'KeyM') {
        toggleMute();
        return;
      }

      if (code === 'KeyR') {
        startGame();
        return;
      }

      if (s.phase !== 'playing') return;

      const inp = inputRef.current;
      inp.keys.add(code);

      if (e.repeat) return;

      if (code === 'KeyJ') inp.attackPressed = true;
      if (code === 'KeyK') inp.heavyPressed = true;
      if (code === 'KeyQ' || code === 'KeyE') inp.castPressed = true;
      if (code === 'Space') {
        e.preventDefault();
        inp.dodgePressed = true;
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyL') {
        inp.blockHeld = true;
        inp.blockJustPressed = true;
      }
      if (code === 'Digit1') inp.elementSwitch = 'agni';
      if (code === 'Digit2') inp.elementSwitch = 'vajra';
      if (code === 'Digit3') inp.elementSwitch = 'vayu';
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const inp = inputRef.current;
      inp.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyL') {
        inp.blockHeld = false;
      }
    };

    const updateAimFromPointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      _pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      _pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      _raycaster.setFromCamera(_pointerNdc, camera);
      const hit = _raycaster.ray.intersectPlane(_groundPlane, _rayOrigin);
      if (hit) {
        inputRef.current.aimWorldX = hit.x;
        inputRef.current.aimWorldZ = hit.z;
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (simRef.current.phase !== 'playing') return;
      sound.unlockAndStartBgm();
      updateAimFromPointer(e.clientX, e.clientY);
      if (e.button === 2) {
        inputRef.current.heavyPressed = true;
      } else if (e.button === 0) {
        inputRef.current.attackPressed = true;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (simRef.current.phase !== 'playing') return;
      updateAimFromPointer(e.clientX, e.clientY);
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();
    const onWindowBlur = () => clearInputs();
    const onVisibility = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibility);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    let frameId = 0;
    let lastTs = performance.now();
    let totalRenderTime = 0;
    let drumPulse = 0;

    const switchRudraAnim = (next: RudraClipKey, fadeDur = 0.14, forceRestart = false) => {
      if (!rudraRig) return;
      const nextAct = rudraRig.actions[next] || rudraRig.actions.idle;
      if (!nextAct) return;
      if (!forceRestart && currentRudraClip === next && nextAct.isRunning()) return;
      for (const [k, act] of Object.entries(rudraRig.actions)) {
        if (act && k !== next) {
          act.fadeOut(fadeDur);
        }
      }
      nextAct.enabled = true;
      if (forceRestart || !nextAct.isRunning() || currentRudraClip !== next) {
        nextAct.reset();
      }
      nextAct.setEffectiveWeight(1);
      nextAct.fadeIn(fadeDur);
      nextAct.play();
      currentRudraClip = next;
    };

    const switchBossAnim = (next: DundubhiClipKey, fadeDur = 0.16, forceRestart = false) => {
      if (!bossRig) return;
      const nextAct = bossRig.actions[next] || bossRig.actions.idle;
      if (!nextAct) return;
      if (!forceRestart && currentBossClip === next && nextAct.isRunning()) return;
      for (const [k, act] of Object.entries(bossRig.actions)) {
        if (act && k !== next) {
          act.fadeOut(fadeDur);
        }
      }
      nextAct.enabled = true;
      if (forceRestart || !nextAct.isRunning() || currentBossClip !== next) {
        nextAct.reset();
      }
      nextAct.setEffectiveWeight(1);
      nextAct.fadeIn(fadeDur);
      nextAct.play();
      currentBossClip = next;
    };

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;

      const now = performance.now();
      const rawDt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      totalRenderTime += rawDt;

      const s = simRef.current;
      const inp = inputRef.current;

      const moveX =
        (inp.keys.has('KeyD') || inp.keys.has('ArrowRight') ? 1 : 0) -
        (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft') ? 1 : 0);
      const moveY =
        (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) -
        (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0);

      const frameInput: PlayerInputFrame = {
        moveScreenX: moveX,
        moveScreenY: moveY,
        attackPressed: inp.attackPressed,
        heavyPressed: inp.heavyPressed,
        castPressed: inp.castPressed,
        dodgePressed: inp.dodgePressed,
        blockHeld: inp.blockHeld,
        blockJustPressed: inp.blockJustPressed,
        elementSwitch: inp.elementSwitch,
        aimWorldX: inp.aimWorldX,
        aimWorldZ: inp.aimWorldZ,
      };

      inp.attackPressed = false;
      inp.heavyPressed = false;
      inp.castPressed = false;
      inp.dodgePressed = false;
      inp.blockJustPressed = false;
      inp.elementSwitch = null;

      const prevRudraAction = s.rudra.action;
      const prevBossState = s.boss.aiState;
      const prevBossKind = s.boss.attackKind;
      stepChamberSimulation(s, rawDt, frameInput);

      // Snap visual anchors cleanly on abrupt restart/title resets
      if (s.elapsedSec < 0.06 || s.phase === 'title') {
        visRudraX = s.rudra.x;
        visRudraZ = s.rudra.z;
        visRudraYaw = s.rudra.yaw;
        visBossX = s.boss.x;
        visBossZ = s.boss.z;
        visBossYaw = s.boss.yaw;
        dundubhiBloodVfx.clearAll();
      } else {
        visRudraX = THREE.MathUtils.damp(visRudraX, s.rudra.x, 30, rawDt);
        visRudraZ = THREE.MathUtils.damp(visRudraZ, s.rudra.z, 30, rawDt);
        visRudraYaw += angleDiff(s.rudra.yaw, visRudraYaw) * (1 - Math.exp(-24 * rawDt));
        visBossX = THREE.MathUtils.damp(visBossX, s.boss.x, 24, rawDt);
        visBossZ = THREE.MathUtils.damp(visBossZ, s.boss.z, 24, rawDt);
        visBossYaw += angleDiff(s.boss.yaw, visBossYaw) * (1 - Math.exp(-18 * rawDt));
      }

      for (const evt of s.pendingSfx) {
        sound.playEvent(evt, s.rudra.astra);
        if (evt === 'hit' || evt === 'crit') {
          sparkSystem.emitBurst(
            s.boss.x,
            1.1,
            s.boss.z,
            evt === 'crit' ? 28 : 16,
            s.rudra.astra,
            11.5
          );
          rudraPoolPulse = Math.max(rudraPoolPulse, evt === 'crit' ? 1.0 : 0.65);
          if (evt === 'crit') {
            sparkSystem.triggerClashFlare(
              (s.rudra.x + s.boss.x) * 0.5,
              1.12,
              (s.rudra.z + s.boss.z) * 0.5,
              RIBBON_PALETTES[s.rudra.astra].coreColor.getHex()
            );
          }
        } else if (evt === 'parry') {
          sparkSystem.emitBurst(s.rudra.x, 1.05, s.rudra.z, 30, 'parry', 12.5);
          sparkSystem.triggerClashFlare(
            (s.rudra.x + s.boss.x) * 0.5,
            1.1,
            (s.rudra.z + s.boss.z) * 0.5,
            0xfff4a8
          );
          rudraPoolPulse = 1.0;
        } else if (evt === 'boss_slam' || evt === 'boss_roar') {
          drumPulse = 1.0;
          bossPoolPulse = 1.0;
          sparkSystem.emitBurst(s.boss.x, 0.45, s.boss.z, 28, 'boss', 11.2);
          const impactRadius = evt === 'boss_roar' ? 4.4 : 2.9;
          dundubhiBloodVfx.spawnBloodSpikeBurst(
            s.boss.x,
            s.boss.z,
            impactRadius,
            s.boss.phase === 2
          );
          dundubhiBloodVfx.spawnShockwaveImpact(
            s.boss.x,
            s.boss.z,
            impactRadius,
            evt === 'boss_roar' ? 'roar' : 'slam',
            s.boss.phase === 2
          );
        } else if (evt === 'pillar_break') {
          bossPoolPulse = 1.0;
          sparkSystem.emitBurst(s.boss.x, 1.25, s.boss.z, 32, 'agni', 13.0);
          sparkSystem.triggerClashFlare(s.boss.x, 1.6, s.boss.z, 0xffaa38);
          dundubhiBloodVfx.spawnBloodSpikeBurst(s.boss.x, s.boss.z, 2.8, s.boss.phase === 2);
          dundubhiBloodVfx.spawnShockwaveImpact(
            s.boss.x,
            s.boss.z,
            3.1,
            'pillar_break',
            s.boss.phase === 2
          );
        }
      }
      drumPulse = Math.max(0, drumPulse - rawDt * 2.4);
      rudraPoolPulse = Math.max(0, rudraPoolPulse - rawDt * 2.6);
      bossPoolPulse = Math.max(0, bossPoolPulse - rawDt * 2.2);

      const dtFactor = s.hitstopTimer > 0 ? 0.05 : 1.0;
      rudraRibbon.setTheme(s.rudra.astra);
      astraCyclone.setTheme(s.rudra.astra);

      const rNorm = s.rudra.actionDuration > 0 ? s.rudra.actionTimer / s.rudra.actionDuration : 0;
      const rudraSwingKind =
        s.rudra.action === 'attack1' ||
        s.rudra.action === 'attack2' ||
        s.rudra.action === 'attack3' ||
        s.rudra.action === 'heavy' ||
        s.rudra.action === 'cast'
          ? s.rudra.action
          : null;

      const elementRimHex =
        s.rudra.astra === 'agni' ? 0xff9838 : s.rudra.astra === 'vajra' ? 0x38bdf8 : 0x34d399;

      // Update Rudra 3D Rig + Ignited Parashu + Smooth Non-Warped Crossfades + Blade Ribbon
      if (rudraRig) {
        rudraRig.root.position.set(visRudraX, 0, visRudraZ);
        rudraRig.root.rotation.y = visRudraYaw;

        const desiredClip: RudraClipKey =
          s.rudra.action === 'dead' ? 'hurt' : s.rudra.action;

        const restartedCombo =
          prevRudraAction !== s.rudra.action && rudraSwingKind !== null;

        if (desiredClip !== currentRudraClip || restartedCombo) {
          const isLocomotion =
            (desiredClip === 'idle' || desiredClip === 'run' || desiredClip === 'block') &&
            (currentRudraClip === 'idle' || currentRudraClip === 'run' || currentRudraClip === 'block');
          const fadeDur = isLocomotion ? 0.18 : rudraSwingKind !== null ? 0.10 : 0.14;
          switchRudraAnim(desiredClip, fadeDur, restartedCombo);
          if (restartedCombo) {
            rudraRibbon.clear();
            waveFiredForAction = false;
            if (s.rudra.action === 'cast') {
              sparkSystem.emitBurst(visRudraX, 1.15, visRudraZ, 26, s.rudra.astra, 10.5);
              rudraPoolPulse = 1.0;
            }
          }
        }
        if (s.rudra.action !== 'heavy' && s.rudra.action !== 'attack3') {
          waveFiredForAction = false;
        }
        if (
          s.phase === 'playing' &&
          !waveFiredForAction &&
          ((s.rudra.action === 'heavy' && rNorm >= 0.36) ||
            (s.rudra.action === 'attack3' && rNorm >= 0.34))
        ) {
          waveFiredForAction = true;
          heavyWaveVfx.triggerTripleWave(
            visRudraX,
            visRudraZ,
            visRudraYaw,
            s.rudra.astra,
            s.rudra.action === 'heavy' ? 12.2 : 10.0
          );
          sparkSystem.emitBurst(
            visRudraX + Math.sin(visRudraYaw) * 1.1,
            1.1,
            visRudraZ + Math.cos(visRudraYaw) * 1.1,
            16,
            s.rudra.astra,
            10.0
          );
          rudraPoolPulse = Math.max(rudraPoolPulse, 0.85);
        }

        const activeAct = rudraRig.actions[currentRudraClip];
        const animDt = s.phase === 'paused' ? 0 : rawDt * dtFactor;

        if (activeAct && rudraSwingKind !== null) {
          const clipDur = Math.max(0.25, activeAct.getClip().duration);
          const timeToFit = clipDur / Math.max(0.25, s.rudra.actionDuration);
          // Smooth C1 bell velocity curve so swing starts coiled, whips through center, and eases out
          const smoothCurve = 0.78 + 0.34 * Math.sin(Math.max(0, Math.min(1, rNorm)) * Math.PI);
          activeAct.setEffectiveTimeScale(timeToFit * smoothCurve);
        } else if (activeAct && currentRudraClip === 'dodge') {
          const clipDur = Math.max(0.25, activeAct.getClip().duration);
          activeAct.setEffectiveTimeScale(clipDur / Math.max(0.25, s.rudra.actionDuration));
        } else if (activeAct) {
          activeAct.setEffectiveTimeScale(1.0);
        }

        const isRudraBladeEmitting =
          s.phase === 'playing' &&
          rudraSwingKind !== null &&
          rNorm >= 0.16 &&
          rNorm <= 0.78;

        rudraRibbon.ageSamples(animDt);

        if (animDt > 0) {
          const substeps = isRudraBladeEmitting ? 6 : 1;
          const subDt = animDt / substeps;
          for (let step = 0; step < substeps; step++) {
            rudraRig.mixer.update(subDt);
            rudraRig.root.updateMatrixWorld(true);
            const minFootY = getMinFootWorldY(rudraRig.footBones);
            const targetAdj = rudraRig.soleOffset - minFootY;
            // Smooth upward foot damping while clamping downward sinking immediately
            if (targetAdj > 0) {
              visRudraYOffset = targetAdj;
            } else {
              visRudraYOffset = THREE.MathUtils.damp(visRudraYOffset, targetAdj, 18, subDt);
            }
            rudraRig.modelGroup.position.y += visRudraYOffset;
            visRudraYOffset = 0;
            rudraRig.root.updateMatrixWorld(true);

            if (isRudraBladeEmitting) {
              rudraRig.bladeBaseNode.getWorldPosition(_vecBase);
              rudraRig.bladeTipNode.getWorldPosition(_vecTip);
              const ageOffset = (substeps - 1 - step) * subDt * 0.4;
              rudraRibbon.pushSample(_vecBase, _vecTip, ageOffset);
            }
          }
        } else {
          rudraRig.root.updateMatrixWorld(true);
        }

        rudraRibbon.commit(totalRenderTime, isRudraBladeEmitting, 1.12);

        // Multi-ring Demon Slayer cyclone for [Q] Astra Cast AND attack3 combo finisher!
        const showCyclone =
          s.phase === 'playing' &&
          ((s.rudra.action === 'cast' && rNorm >= 0.08 && rNorm <= 0.92) ||
            (s.rudra.action === 'attack3' && rNorm >= 0.25 && rNorm <= 0.78));
        astraCyclone.update(
          totalRenderTime,
          showCyclone,
          visRudraX,
          visRudraZ,
          visRudraYaw,
          rNorm,
          s.rudra.astra === 'vayu' ? 0.35 : 0
        );

        // Ignited Parashu Axe Aura & Fresnel Rim glow reactive to active breathing element
        const pal = RIBBON_PALETTES[s.rudra.astra];
        rudraRig.weaponAuraMat.uniforms.uTime.value = totalRenderTime;
        rudraRig.weaponAuraMat.uniforms.uCoreColor.value.copy(pal.coreColor);
        rudraRig.weaponAuraMat.uniforms.uMidColor.value.copy(pal.midColor);
        rudraRig.weaponAuraMat.uniforms.uOuterColor.value.copy(pal.outerColor);
        const auraTarget =
          s.rudra.action === 'cast' || s.rudra.action === 'heavy'
            ? 0.96
            : rudraSwingKind !== null
              ? 0.78
              : 0.28;
        rudraRig.weaponAuraMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
          rudraRig.weaponAuraMat.uniforms.uIntensity.value,
          auraTarget,
          16,
          rawDt
        );

        setCelRimStyle(
          rudraRig.materials,
          elementRimHex,
          rudraSwingKind !== null || s.rudra.action === 'dodge' ? 0.95 : 0.65
        );
        setCelHitFlash(
          rudraRig.materials,
          s.rudra.hitFlashTimer > 0,
          0x3b2419,
          0.32,
          0xff4433
        );
      } else {
        rudraRibbon.clear();
        astraCyclone.update(totalRenderTime, false, 0, 0, 0, 0, 0);
      }

      // Dash Afterimage Echoes + Sparks
      if (s.phase === 'playing' && s.rudra.action === 'dodge') {
        dashEchoCooldown -= rawDt;
        if (dashEchoCooldown <= 0) {
          dashEchoCooldown = 0.048;
          dashEchoes.spawn(visRudraX, visRudraZ, visRudraYaw, s.rudra.astra);
          sparkSystem.emitBurst(visRudraX, 0.85, visRudraZ, 6, s.rudra.astra, 5.5);
        }
      }
      dashEchoes.update(rawDt);

      // Update Bellhorn Dundubhi 3D Rig + Smooth Non-Warped Crossfades + C1 Swing Curves
      const isBossMeleeAttacking =
        s.phase === 'playing' &&
        s.boss.aiState === 'attack' &&
        (s.boss.attackKind === 'swipe' || s.boss.attackKind === 'punch');

      if (bossRig) {
        let jumpArcY = 0;
        if (s.boss.aiState === 'attack' && s.boss.attackKind === 'slam' && s.boss.stateDuration > 0) {
          const leapT = Math.min(1, s.boss.stateTimer / (s.boss.stateDuration * 0.56));
          if (leapT < 1) {
            jumpArcY = Math.sin(leapT * Math.PI) * 0.85;
          }
        }
        bossRig.root.position.set(visBossX, jumpArcY, visBossZ);
        bossRig.root.rotation.y = visBossYaw;

        let desiredBossClip: DundubhiClipKey = 'idle';
        let nextAttackToken = '';
        if (s.boss.aiState === 'dead') {
          desiredBossClip = 'death';
        } else if (s.boss.aiState === 'stagger') {
          desiredBossClip = 'stagger';
        } else if (s.boss.aiState === 'chase') {
          desiredBossClip = 'run';
        } else if (s.boss.aiState === 'windup' || s.boss.aiState === 'attack') {
          desiredBossClip = s.boss.attackKind === 'charge' ? 'run' : s.boss.attackKind;
          nextAttackToken =
            s.boss.attackKind === 'charge'
              ? ''
              : `${s.boss.attackKind}_${s.boss.comboChainLeft}`;
        }

        const enteredNewWindup =
          nextAttackToken !== '' &&
          (bossAttackMoveToken !== nextAttackToken ||
            (prevBossState !== 'windup' && s.boss.aiState === 'windup') ||
            (prevBossKind !== s.boss.attackKind && s.boss.aiState === 'windup'));

        if (desiredBossClip !== currentBossClip || enteredNewWindup) {
          const isBossLoco =
            (desiredBossClip === 'idle' || desiredBossClip === 'run') &&
            (currentBossClip === 'idle' || currentBossClip === 'run');
          const fadeDur = isBossLoco ? 0.22 : 0.14;
          switchBossAnim(desiredBossClip, fadeDur, enteredNewWindup);
          if (enteredNewWindup) bossRibbon.clear();
        }
        bossAttackMoveToken = nextAttackToken;

        const activeBossAct = bossRig.actions[currentBossClip];
        const bossAnimDt = s.phase === 'paused' ? 0 : rawDt * dtFactor;
        if (activeBossAct) {
          const bossPhaseMult = s.boss.phase === 2 ? 1.15 : 1.0;
          if (s.boss.aiState === 'attack' && s.boss.attackKind === 'charge') {
            activeBossAct.setEffectiveTimeScale(1.75);
          } else if (
            (s.boss.aiState === 'windup' || s.boss.aiState === 'attack') &&
            s.boss.attackKind !== 'charge'
          ) {
            const clipDur = Math.max(0.3, activeBossAct.getClip().duration);
            const windupDur =
              (s.boss.attackKind === 'punch'
                ? 0.34
                : s.boss.attackKind === 'slam'
                  ? 0.62
                  : s.boss.attackKind === 'roar'
                    ? 0.54
                    : 0.48) / bossPhaseMult;
            const attackDur =
              s.boss.attackKind === 'slam'
                ? 0.68
                : s.boss.attackKind === 'punch'
                  ? 0.34
                  : s.boss.attackKind === 'roar'
                    ? 0.52
                    : 0.46;
            const expectedTotalDur = windupDur + attackDur;
            const elapsedInMove =
              s.boss.aiState === 'windup' ? s.boss.stateTimer : windupDur + s.boss.stateTimer;
            const bNorm = Math.max(0, Math.min(1, elapsedInMove / Math.max(0.3, expectedTotalDur)));
            const bossCurve = 0.74 + 0.40 * Math.sin(bNorm * Math.PI);
            activeBossAct.setEffectiveTimeScale((clipDur / Math.max(0.3, expectedTotalDur)) * bossCurve);
          } else {
            activeBossAct.setEffectiveTimeScale(1.04 * bossPhaseMult);
          }
        }

        bossRibbon.ageSamples(bossAnimDt);
        if (bossAnimDt > 0) {
          const bossSubsteps = isBossMeleeAttacking ? 4 : 1;
          const subDt = bossAnimDt / bossSubsteps;
          for (let step = 0; step < bossSubsteps; step++) {
            bossRig.mixer.update(subDt);
            bossRig.root.updateMatrixWorld(true);
            const minBossFootY = getMinFootWorldY(bossRig.footBones);
            if (s.boss.aiState === 'dead' || s.boss.aiState === 'stagger') {
              if (minBossFootY < 0.02) {
                bossRig.modelGroup.position.y += 0.02 - minBossFootY;
              }
            } else {
              const targetBossAdj = bossRig.soleOffset + jumpArcY - minBossFootY;
              if (targetBossAdj > 0) {
                visBossYOffset = targetBossAdj;
              } else {
                visBossYOffset = THREE.MathUtils.damp(visBossYOffset, targetBossAdj, 16, subDt);
              }
              bossRig.modelGroup.position.y += visBossYOffset;
              visBossYOffset = 0;
            }
            bossRig.root.updateMatrixWorld(true);

            if (isBossMeleeAttacking) {
              bossRig.weaponBaseNode.getWorldPosition(_vecBase);
              bossRig.weaponTipNode.getWorldPosition(_vecTip);
              bossRibbon.pushSample(_vecBase, _vecTip, (bossSubsteps - 1 - step) * subDt * 0.4);
            }
          }
        } else {
          bossRig.root.updateMatrixWorld(true);
        }

        bossRibbon.commit(totalRenderTime, isBossMeleeAttacking, 1.18);

        setCelRimStyle(
          bossRig.materials,
          s.boss.phase === 2 ? 0xff1f14 : 0xff451f,
          s.boss.phase === 2 ? 1.12 : 0.84
        );
        setCelHitFlash(
          bossRig.materials,
          s.boss.hitFlashTimer > 0,
          s.boss.phase === 2 ? 0x621614 : 0x3b1612,
          s.boss.phase === 2 ? 0.56 : 0.3,
          0xfff6d6
        );

        // Blood Demon Art: Flying Blood Sickles on swipe/punch + Aura Halo + Horn Wake Ribbons
        if (s.boss.aiState !== 'attack') {
          bloodSicklesFiredThisAttack = false;
        } else if (
          s.phase === 'playing' &&
          !bloodSicklesFiredThisAttack &&
          (s.boss.attackKind === 'swipe' || s.boss.attackKind === 'punch') &&
          s.boss.stateTimer >= s.boss.stateDuration * 0.28
        ) {
          bloodSicklesFiredThisAttack = true;
          dundubhiBloodVfx.spawnFlyingBloodSickles(
            visBossX,
            visBossZ,
            visBossYaw,
            s.boss.phase === 2 ? 3 : 2,
            s.boss.phase === 2
          );
          sparkSystem.emitBurst(
            visBossX + Math.sin(visBossYaw) * 1.1,
            1.35,
            visBossZ + Math.cos(visBossYaw) * 1.1,
            14,
            'boss',
            9.5
          );
          bossPoolPulse = Math.max(bossPoolPulse, 0.75);
        }

        const jumpScale = Math.max(0.65, 1 - jumpArcY * 0.25);
        arena.bossShadow.scale.setScalar(jumpScale);
      } else {
        bossRibbon.clear();
      }

      dundubhiBloodVfx.update(
        rawDt,
        totalRenderTime,
        visBossX,
        visBossZ,
        visBossYaw,
        s.boss.phase === 2,
        s.boss.aiState === 'windup',
        s.boss.aiState === 'attack' && s.boss.attackKind === 'charge',
        s.boss.aiState === 'dead'
      );
      heavyWaveVfx.update(rawDt);

      // Arena contact shadows, elemental light pools, multi-shape telegraphs & vertical shock-walls
      arena.rudraShadow.position.set(visRudraX, 0.012, visRudraZ);
      arena.bossShadow.position.set(visBossX, 0.013, visBossZ);

      const rudraGlowLevel = Math.max(
        rudraPoolPulse,
        s.phase === 'playing' && s.rudra.action === 'cast'
          ? 0.95
          : s.phase === 'playing' && rudraSwingKind !== null
            ? 0.55
            : 0
      );
      const bossGlowLevel = Math.max(
        bossPoolPulse,
        s.phase === 'playing' && s.boss.phase === 2 ? 0.38 : 0
      );
      arena.updateLightPools(
        visRudraX,
        visRudraZ,
        rudraGlowLevel,
        elementRimHex,
        visBossX,
        visBossZ,
        bossGlowLevel,
        s.boss.phase === 2 ? 0xff1a3c : 0xff3b28
      );

      const windupProgress =
        s.boss.aiState === 'windup' && s.boss.stateDuration > 0
          ? s.boss.stateTimer / s.boss.stateDuration
          : 0;
      arena.updateTelegraph(
        s.boss.aiState === 'windup',
        s.boss.attackKind,
        visBossX,
        visBossZ,
        visBossYaw,
        s.boss.targetX,
        s.boss.targetZ,
        windupProgress,
        totalRenderTime
      );

      for (let i = 0; i < arena.shockwaveMeshes.length; i++) {
        const swMesh = arena.shockwaveMeshes[i];
        const sw = s.shockwaves[i];
        if (!sw) {
          swMesh.visible = false;
        } else {
          const p = Math.min(1, sw.age / sw.duration);
          const rad = 0.6 + p * sw.maxRadius;
          swMesh.visible = true;
          swMesh.position.set(sw.x, 0.036, sw.z);
          swMesh.scale.setScalar(rad);
          const mat = swMesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(sw.colorHex);
          mat.opacity = (1 - p) * 0.36;
        }
      }

      sparkSystem.update(rawDt);
      arena.updateDecor(totalRenderTime, s.boss.phase === 2, s.pillars, drumPulse);

      // Keep Three.js perspective camera 100% locked to dundubhi_chamber.mp4 ground perspective + anime impact zoom!
      const viewportAspect =
        (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight);
      const impactDelta =
        s.impactFrame.timer > 0 ? 2.6 : s.rudra.action === 'cast' ? 1.5 : 0;
      const targetFov = computeCoverMatchedFov(viewportAspect, impactDelta);
      if (Math.abs(camera.fov - targetFov) > 0.04) {
        camera.fov += (targetFov - camera.fov) * Math.min(1, rawDt * 24);
        camera.updateProjectionMatrix();
      }
      camera.position.copy(MATCHED_CAM_POS);
      camera.lookAt(MATCHED_CAM_TARGET);

      // Apply shared CSS trauma shake to wrapper so MP4 arena AND 3D actors shake in unison without desync!
      if (shakeWrapperRef.current) {
        const shakePx = s.cameraTrauma * s.cameraTrauma * 14;
        if (shakePx > 0.25) {
          const sx = ((Math.random() - 0.5) * 2 * shakePx).toFixed(1);
          const sy = ((Math.random() - 0.5) * 2 * shakePx).toFixed(1);
          shakeWrapperRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0) scale(1.018)`;
        } else {
          shakeWrapperRef.current.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
        }
      }

      renderer.render(scene, camera);

      if (now - lastHudSyncRef.current >= 82 || s.phase !== 'playing') {
        lastHudSyncRef.current = now;
        syncBodyAndHudNow(camera);
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      frameId = window.setTimeout(tick, 16);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObs.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      rudraRibbon.dispose();
      astraCyclone.dispose();
      heavyWaveVfx.dispose();
      bossRibbon.dispose();
      dundubhiBloodVfx.dispose();
      dashEchoes.dispose();
      sparkSystem.dispose();
      arena.dispose();
      sound.dispose();
      renderer.dispose();
    };
  }, [clearInputs, startGame, syncBodyAndHudNow, toggleMute, togglePause]);

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#08070a]"
      data-ready={hud.assetsReady ? 'true' : 'false'}
      data-astra={hud.astra}
    >
      {/* Shared perspective-locked arena stage (MP4 sanctuary + alpha WebGL overlay) */}
      <div
        ref={shakeWrapperRef}
        className="fixed inset-0 w-full h-full overflow-hidden"
        style={{ willChange: 'transform' }}
      >
        <video
          src="/kaalyuga/arena/dundubhi_chamber.mp4"
          poster="/kaalyuga/arena/dundubhi_mandapa.png"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />

        {/* Subtle edge vignette blending brazier light into screen borders */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 56%, rgba(6,4,8,0.52) 100%)',
          }}
        />

        {/* Transparent WebGL stage */}
        <div
          ref={mountRef}
          data-testid="kaalyuga-canvas-mount"
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <TitleOverlay
        visible={hud.phase === 'title'}
        assetsReady={hud.assetsReady}
        loadingLabel={hud.loadingLabel}
        onStart={startGame}
      />

      <GameHud
        hud={hud}
        muted={muted}
        onToggleMute={toggleMute}
        onTogglePause={togglePause}
        onRestart={startGame}
        onReturnToTitle={returnToTitle}
        onSelectElement={selectElement}
      />
    </main>
  );
}


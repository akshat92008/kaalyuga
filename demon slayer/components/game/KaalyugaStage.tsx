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
import { setCelHitFlash } from '@/lib/game/demonSlayerShader';
import {
  createInitialChamberState,
  stepChamberSimulation,
  type AstraElement,
  type ChamberSimState,
  type PlayerInputFrame,
} from '@/lib/game/rules';
import {
  PooledSparkSystem,
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

// Locked perspective matching public/kaalyuga/arena/dundubhi_chamber.mp4 (16:9 static isometric stone courtyard)
const VIDEO_ASPECT = 16 / 9;
const BASE_VERTICAL_FOV = 30.0;
const MATCHED_CAM_POS = new THREE.Vector3(15.7, 11.5, 15.7);
const MATCHED_CAM_TARGET = new THREE.Vector3(0, 0.25, 0);

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
      impactFlashOpacity:
        s.impactFrame.duration > 0 ? s.impactFrame.timer / s.impactFrame.duration : 0,
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

    // 3D Demon Slayer blade-accurate slash trails + Q Astra halo + Pooled Sparks
    const rudraRibbon = new SlashRibbonController('agni');
    const astraHaloRibbon = new SlashRibbonController('agni');
    const bossRibbon = new SlashRibbonController('boss');
    const sparkSystem = new PooledSparkSystem();
    scene.add(rudraRibbon.mesh, astraHaloRibbon.mesh, bossRibbon.mesh, sparkSystem.mesh);

    let disposed = false;
    let rudraRig: LoadedRudraRig | null = null;
    let bossRig: LoadedDundubhiRig | null = null;
    let currentRudraClip: RudraClipKey = 'idle';
    let currentBossClip: DundubhiClipKey = 'idle';
    let bossAttackAnimKey = '';
    let dashSparkCooldown = 0;

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

      if (s.phase === 'title') {
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

    const switchRudraAnim = (next: RudraClipKey, fadeDur = 0.09, forceRestart = false) => {
      if (!rudraRig) return;
      if (!forceRestart && currentRudraClip === next) return;
      const nextAct = rudraRig.actions[next] || rudraRig.actions.idle;
      const prevAct = rudraRig.actions[currentRudraClip];
      if (!nextAct) return;
      nextAct.enabled = true;
      nextAct.reset();
      nextAct.setEffectiveTimeScale(1.0);
      nextAct.play();
      if (prevAct && prevAct !== nextAct) {
        prevAct.crossFadeTo(nextAct, fadeDur, true);
      }
      currentRudraClip = next;
    };

    const switchBossAnim = (next: DundubhiClipKey, fadeDur = 0.12, forceRestart = false) => {
      if (!bossRig) return;
      if (!forceRestart && currentBossClip === next) return;
      const nextAct = bossRig.actions[next] || bossRig.actions.idle;
      const prevAct = bossRig.actions[currentBossClip];
      if (!nextAct) return;
      nextAct.enabled = true;
      nextAct.reset();
      nextAct.setEffectiveTimeScale(1.0);
      nextAct.play();
      if (prevAct && prevAct !== nextAct) {
        prevAct.crossFadeTo(nextAct, fadeDur, true);
      }
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
      stepChamberSimulation(s, rawDt, frameInput);

      for (const evt of s.pendingSfx) {
        sound.playEvent(evt, s.rudra.astra);
        if (evt === 'hit' || evt === 'crit') {
          sparkSystem.emitBurst(
            s.boss.x,
            1.4,
            s.boss.z,
            evt === 'crit' ? 24 : 14,
            s.rudra.astra,
            10.5
          );
        } else if (evt === 'parry') {
          sparkSystem.emitBurst(s.rudra.x, 1.3, s.rudra.z, 26, 'parry', 11.5);
        } else if (evt === 'boss_slam' || evt === 'boss_roar') {
          drumPulse = 1.0;
          sparkSystem.emitBurst(s.boss.x, 0.4, s.boss.z, 22, 'boss', 9.5);
        } else if (evt === 'pillar_break') {
          sparkSystem.emitBurst(s.boss.x, 1.2, s.boss.z, 28, 'agni', 12.5);
        }
      }
      drumPulse = Math.max(0, drumPulse - rawDt * 2.4);

      const dtFactor = s.hitstopTimer > 0 ? 0.05 : 1.0;
      rudraRibbon.setTheme(s.rudra.astra);
      astraHaloRibbon.setTheme(s.rudra.astra);

      const rNorm = s.rudra.actionDuration > 0 ? s.rudra.actionTimer / s.rudra.actionDuration : 0;
      const rudraSwingKind =
        s.rudra.action === 'attack1' ||
        s.rudra.action === 'attack2' ||
        s.rudra.action === 'attack3' ||
        s.rudra.action === 'heavy' ||
        s.rudra.action === 'cast'
          ? s.rudra.action
          : null;

      // Update Rudra 3D Rig + Blade-Accurate Multi-Substep Trail + Per-Frame Foot Grounding
      if (rudraRig) {
        rudraRig.root.position.set(s.rudra.x, 0, s.rudra.z);
        rudraRig.root.rotation.y = s.rudra.yaw;

        const desiredClip: RudraClipKey =
          s.rudra.action === 'dead' ? 'hurt' : s.rudra.action;

        const restartedCombo =
          prevRudraAction !== s.rudra.action && rudraSwingKind !== null;

        if (desiredClip !== currentRudraClip || restartedCombo) {
          switchRudraAnim(
            desiredClip,
            desiredClip === 'dodge' || rudraSwingKind !== null ? 0.07 : 0.11,
            restartedCombo
          );
          if (restartedCombo) {
            rudraRibbon.clear();
          }
        }

        const activeAct = rudraRig.actions[currentRudraClip];
        const animDt = s.phase === 'paused' ? 0 : rawDt * dtFactor;

        if (activeAct && rudraSwingKind !== null) {
          // Scale subclip playback dynamically to finish cleanly inside actionDuration
          const clipDur = Math.max(0.25, activeAct.getClip().duration);
          const timeToFit = clipDur / Math.max(0.25, s.rudra.actionDuration);
          const curve = rNorm < 0.2 ? 0.85 : rNorm < 0.68 ? 1.28 : 0.92;
          activeAct.setEffectiveTimeScale(timeToFit * curve);
        } else if (activeAct) {
          activeAct.setEffectiveTimeScale(1.0);
        }

        const isRudraBladeEmitting =
          s.phase === 'playing' &&
          rudraSwingKind !== null &&
          rNorm >= 0.08 &&
          rNorm <= 0.84;

        rudraRibbon.ageSamples(animDt);

        if (animDt > 0) {
          const substeps = isRudraBladeEmitting ? 4 : 1;
          const subDt = animDt / substeps;
          for (let step = 0; step < substeps; step++) {
            rudraRig.mixer.update(subDt);
            // Snap foot bones flush onto y = 0 at every substep so blade world positions match planted height!
            rudraRig.root.updateMatrixWorld(true);
            const minFootY = getMinFootWorldY(rudraRig.footBones);
            rudraRig.modelGroup.position.y += rudraRig.soleOffset - minFootY;
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

        rudraRibbon.commit(totalRenderTime, isRudraBladeEmitting, 1.14);

        if (s.phase === 'playing' && s.rudra.action === 'cast' && rNorm >= 0.08 && rNorm <= 0.94) {
          astraHaloRibbon.updateParametricSwing(
            totalRenderTime,
            true,
            'cast',
            s.rudra.x,
            s.rudra.z,
            s.rudra.yaw,
            rNorm,
            s.rudra.astra === 'vayu' ? 0.35 : 0
          );
        } else {
          astraHaloRibbon.clear();
        }

        setCelHitFlash(
          rudraRig.materials,
          s.rudra.hitFlashTimer > 0,
          0x42281c,
          0.4,
          0xff4433
        );
      } else {
        rudraRibbon.clear();
        astraHaloRibbon.clear();
      }

      // Dash ember trail
      if (s.rudra.action === 'dodge') {
        dashSparkCooldown -= rawDt;
        if (dashSparkCooldown <= 0) {
          dashSparkCooldown = 0.045;
          sparkSystem.emitBurst(s.rudra.x, 0.9, s.rudra.z, 5, s.rudra.astra, 4.5);
        }
      }

      // Update Bellhorn Dundubhi 3D Rig + Aggressive Animation Sync + Foot Grounding
      const isBossMeleeAttacking =
        s.phase === 'playing' &&
        s.boss.aiState === 'attack' &&
        (s.boss.attackKind === 'swipe' || s.boss.attackKind === 'punch');

      if (bossRig) {
        let jumpArcY = 0;
        if (s.boss.aiState === 'attack' && s.boss.attackKind === 'slam' && s.boss.stateDuration > 0) {
          const leapT = Math.min(1, s.boss.stateTimer / (s.boss.stateDuration * 0.56));
          if (leapT < 1) {
            jumpArcY = Math.sin(leapT * Math.PI) * 1.1;
          }
        }
        bossRig.root.position.set(s.boss.x, jumpArcY, s.boss.z);
        bossRig.root.rotation.y = s.boss.yaw;

        let desiredBossClip: DundubhiClipKey = 'idle';
        let nextAttackKey = '';
        if (s.boss.aiState === 'dead') {
          desiredBossClip = 'death';
        } else if (s.boss.aiState === 'stagger') {
          desiredBossClip = 'stagger';
        } else if (s.boss.aiState === 'chase') {
          desiredBossClip = 'run';
        } else if (s.boss.aiState === 'windup' || s.boss.aiState === 'attack') {
          desiredBossClip = s.boss.attackKind === 'charge' ? 'run' : s.boss.attackKind;
          nextAttackKey = s.boss.attackKind === 'charge' ? '' : s.boss.attackKind;
        }

        const isNewAttackMove =
          nextAttackKey !== '' && bossAttackAnimKey !== nextAttackKey;
        if (desiredBossClip !== currentBossClip || isNewAttackMove) {
          switchBossAnim(desiredBossClip, 0.11, isNewAttackMove);
        }
        bossAttackAnimKey = nextAttackKey;

        const activeBossAct = bossRig.actions[currentBossClip];
        const bossAnimDt = s.phase === 'paused' ? 0 : rawDt * dtFactor;
        if (activeBossAct) {
          const bossPhaseMult = s.boss.phase === 2 ? 1.18 : 1.0;
          const speedScale =
            s.boss.aiState === 'attack' && s.boss.attackKind === 'charge'
              ? 1.75
              : s.boss.aiState === 'windup'
                ? 0.85 * bossPhaseMult
                : 1.08 * bossPhaseMult;
          activeBossAct.setEffectiveTimeScale(speedScale);
        }

        bossRibbon.ageSamples(bossAnimDt);
        if (bossAnimDt > 0) {
          const bossSubsteps = isBossMeleeAttacking ? 3 : 1;
          const subDt = bossAnimDt / bossSubsteps;
          for (let step = 0; step < bossSubsteps; step++) {
            bossRig.mixer.update(subDt);
            bossRig.root.updateMatrixWorld(true);
            const minBossFootY = getMinFootWorldY(bossRig.footBones);
            if (s.boss.aiState === 'dead' || s.boss.aiState === 'stagger') {
              // Allow body collapse without sinking hooves/knees below ground Y = 0
              if (minBossFootY < 0.02) {
                bossRig.modelGroup.position.y += 0.02 - minBossFootY;
              }
            } else {
              bossRig.modelGroup.position.y += bossRig.soleOffset + jumpArcY - minBossFootY;
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

        bossRibbon.commit(totalRenderTime, isBossMeleeAttacking, 1.12);

        setCelHitFlash(
          bossRig.materials,
          s.boss.hitFlashTimer > 0,
          s.boss.phase === 2 ? 0x621614 : 0x451a14,
          s.boss.phase === 2 ? 0.58 : 0.38,
          0xfff6d6
        );
      } else {
        bossRibbon.clear();
      }

      // Arena contact shadows, multi-shape telegraphs & expanding shockwaves
      arena.rudraShadow.position.set(s.rudra.x, 0.012, s.rudra.z);
      arena.bossShadow.position.set(s.boss.x, 0.013, s.boss.z);

      const windupProgress =
        s.boss.aiState === 'windup' && s.boss.stateDuration > 0
          ? s.boss.stateTimer / s.boss.stateDuration
          : 0;
      arena.updateTelegraph(
        s.boss.aiState === 'windup',
        s.boss.attackKind,
        s.boss.x,
        s.boss.z,
        s.boss.yaw,
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
          swMesh.visible = true;
          swMesh.position.set(sw.x, 0.04, sw.z);
          swMesh.scale.setScalar(0.6 + p * sw.maxRadius);
          const mat = swMesh.material as THREE.MeshBasicMaterial;
          mat.color.setHex(sw.colorHex);
          mat.opacity = (1 - p) * 0.9;
        }
      }

      sparkSystem.update(rawDt);
      arena.updateDecor(totalRenderTime, s.boss.phase === 2, s.pillars, drumPulse);

      // Keep Three.js perspective camera 100% locked to dundubhi_chamber.mp4 ground perspective!
      const viewportAspect =
        (container.clientWidth || window.innerWidth) /
        Math.max(1, container.clientHeight || window.innerHeight);
      const impactDelta = s.impactFrame.timer > 0 ? 1.8 : 0;
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
      astraHaloRibbon.dispose();
      bossRibbon.dispose();
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


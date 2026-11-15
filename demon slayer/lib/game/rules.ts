export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'defeat';

export type AstraElement = 'agni' | 'vajra' | 'vayu';

export type RudraActionState =
  | 'idle'
  | 'run'
  | 'dodge'
  | 'block'
  | 'attack1'
  | 'attack2'
  | 'attack3'
  | 'heavy'
  | 'cast'
  | 'hurt'
  | 'dead';

export type DundubhiAiState =
  | 'idle'
  | 'chase'
  | 'windup'
  | 'attack'
  | 'recover'
  | 'stagger'
  | 'dead';

export type DundubhiAttackKind = 'punch' | 'swipe' | 'slam' | 'charge' | 'roar';

export interface Vec2 {
  x: number;
  z: number;
}

export interface PillarState {
  id: number;
  x: number;
  z: number;
  radius: number;
  hp: number;
  intact: boolean;
}

export interface FloatingCallout {
  id: number;
  x: number;
  y: number;
  z: number;
  text: string;
  tone: 'agni' | 'vajra' | 'vayu' | 'crit' | 'parry' | 'hurt';
  age: number;
  duration: number;
}

export interface ShockwaveEvent {
  x: number;
  z: number;
  maxRadius: number;
  colorHex: number;
  age: number;
  duration: number;
}

export interface ImpactFlashState {
  timer: number;
  duration: number;
  intensity: number;
}

export interface RudraState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  displayDamageTrailHp: number;
  stamina: number;
  maxStamina: number;
  astra: AstraElement;
  specialCooldown: number;
  specialMaxCooldown: number;
  action: RudraActionState;
  actionTimer: number;
  actionDuration: number;
  hitAppliedThisSwing: boolean;
  bufferedAction: 'attack' | 'heavy' | 'dodge' | 'cast' | null;
  invulnTimer: number;
  parryWindowTimer: number;
  hitFlashTimer: number;
  comboCount: number;
  comboResetTimer: number;
  perfectParries: number;
  totalDamageDealt: number;
  damageTaken: number;
}

export interface DundubhiState {
  x: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  displayDamageTrailHp: number;
  poise: number;
  maxPoise: number;
  phase: 1 | 2;
  enrageTriggered: boolean;
  aiState: DundubhiAiState;
  attackKind: DundubhiAttackKind;
  stateTimer: number;
  stateDuration: number;
  cooldownTimer: number;
  attackHitApplied: boolean;
  hitFlashTimer: number;
  targetX: number;
  targetZ: number;
  comboChainLeft: number;
}

export interface CombatSnapshot {
  elapsedSec: number;
  damageTaken: number;
  perfectParries: number;
  maxCombo: number;
  bossHpRemaining: number;
  bossMaxHp: number;
  pillarsShattered: number;
}

export interface ChamberSimState {
  phase: GamePhase;
  elapsedSec: number;
  hitstopTimer: number;
  cameraTrauma: number;
  impactFrame: ImpactFlashState;
  rudra: RudraState;
  boss: DundubhiState;
  pillars: PillarState[];
  shockwaves: ShockwaveEvent[];
  callouts: FloatingCallout[];
  nextCalloutId: number;
  maxCombo: number;
  snapshot: CombatSnapshot | null;
  pendingSfx: Array<
    'slash_light' | 'slash_heavy' | 'slash_cast' | 'hit' | 'crit' | 'parry' | 'dash' | 'boss_roar' | 'boss_slam' | 'pillar_break' | 'hurt' | 'victory' | 'defeat'
  >;
}

export interface PlayerInputFrame {
  moveScreenX: number; // -1 (left) .. +1 (right)
  moveScreenY: number; // -1 (down) .. +1 (up)
  attackPressed: boolean;
  heavyPressed: boolean;
  castPressed: boolean;
  dodgePressed: boolean;
  blockHeld: boolean;
  blockJustPressed: boolean;
  elementSwitch: AstraElement | null;
  aimWorldX: number | null;
  aimWorldZ: number | null;
}

export const ARENA_BOUND = 6.5;

export const ELEMENT_SPECS: Record<
  AstraElement,
  {
    name: string;
    sanskrit: string;
    role: string;
    speedMult: number;
    damageMult: number;
    poiseMult: number;
    reachBonus: number;
    dashSpeed: number;
    primaryHex: string;
  }
> = {
  agni: {
    name: 'Agni',
    sanskrit: 'Hinokami Flame',
    role: 'Heavy Burn',
    speedMult: 1.0,
    damageMult: 1.18,
    poiseMult: 1.05,
    reachBonus: 0,
    dashSpeed: 12.6,
    primaryHex: '#ff6b1a',
  },
  vajra: {
    name: 'Vajra',
    sanskrit: 'Thunder Flash',
    role: 'Rapid Poise Break',
    speedMult: 1.24,
    damageMult: 0.96,
    poiseMult: 1.38,
    reachBonus: 0.15,
    dashSpeed: 14.4,
    primaryHex: '#38bdf8',
  },
  vayu: {
    name: 'Vayu',
    sanskrit: 'Tempest Gale',
    role: 'Wide Cleave',
    speedMult: 1.1,
    damageMult: 1.04,
    poiseMult: 1.0,
    reachBonus: 0.72,
    dashSpeed: 13.6,
    primaryHex: '#34d399',
  },
};

/**
 * Maps screen-space horizontal (A=-1, D=+1) and vertical (S=-1, W=+1) input
 * into world XZ for the fixed 45-degree dimetric camera at (+X, +Y, +Z) -> (0,0,0).
 */
export function isoScreenInputToWorldMove(screenX: number, screenY: number): Vec2 {
  const s = Math.SQRT1_2;
  // Camera forward on XZ is (-s, -s); camera right on XZ is (+s, -s).
  const wx = screenX * s - screenY * s;
  const wz = -screenX * s - screenY * s;
  const len = Math.hypot(wx, wz);
  if (len < 1e-5) return { x: 0, z: 0 };
  return { x: wx / len, z: wz / len };
}

export function normalizeAngle(a: number): number {
  let res = a;
  while (res > Math.PI) res -= Math.PI * 2;
  while (res < -Math.PI) res += Math.PI * 2;
  return res;
}

export function angleDiff(a: number, b: number): number {
  return normalizeAngle(a - b);
}

export function yawTowards(fromX: number, fromZ: number, toX: number, toZ: number): number {
  return Math.atan2(toX - fromX, toZ - fromZ);
}

export function isPointInCone(
  originX: number,
  originZ: number,
  facingYaw: number,
  targetX: number,
  targetZ: number,
  maxDist: number,
  halfAngleRad: number
): boolean {
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  const dist = Math.hypot(dx, dz);
  if (dist > maxDist) return false;
  if (dist < 0.35) return true;
  const targetYaw = Math.atan2(dx, dz);
  return Math.abs(angleDiff(targetYaw, facingYaw)) <= halfAngleRad;
}

export function clampToArena(x: number, z: number, margin = 0.65): Vec2 {
  const limit = Math.max(1.0, ARENA_BOUND - margin);
  let cx = Math.max(-limit, Math.min(limit, x));
  let cz = Math.max(-limit, Math.min(limit, z));
  // Octagonal bevel matching the stone courtyard walls of Mandapa of the War-Drum
  const diagLimit = limit * 1.44;
  const manhattan = Math.abs(cx) + Math.abs(cz);
  if (manhattan > diagLimit) {
    const excess = (manhattan - diagLimit) * 0.5;
    cx -= Math.sign(cx) * excess;
    cz -= Math.sign(cz) * excess;
  }
  return { x: cx, z: cz };
}

export function resolvePillarCollisions(
  x: number,
  z: number,
  actorRadius: number,
  pillars: PillarState[]
): Vec2 {
  let outX = x;
  let outZ = z;
  for (const p of pillars) {
    if (!p.intact) continue;
    const dx = outX - p.x;
    const dz = outZ - p.z;
    const dist = Math.hypot(dx, dz);
    const minDist = p.radius + actorRadius;
    if (dist < minDist) {
      if (dist < 1e-4) {
        outX = p.x + minDist;
      } else {
        const push = minDist - dist;
        outX += (dx / dist) * push;
        outZ += (dz / dist) * push;
      }
    }
  }
  return clampToArena(outX, outZ, actorRadius * 0.65);
}

export function createInitialChamberState(startPlaying = false): ChamberSimState {
  const bossSpawnX = 2.35;
  const bossSpawnZ = -1.95;
  const rudraSpawnX = -2.85;
  const rudraSpawnZ = 2.25;

  return {
    phase: startPlaying ? 'playing' : 'title',
    elapsedSec: 0,
    hitstopTimer: 0,
    cameraTrauma: 0,
    impactFrame: { timer: 0, duration: 0.08, intensity: 0 },
    rudra: {
      x: rudraSpawnX,
      z: rudraSpawnZ,
      vx: 0,
      vz: 0,
      yaw: yawTowards(rudraSpawnX, rudraSpawnZ, bossSpawnX, bossSpawnZ),
      hp: 100,
      maxHp: 100,
      displayDamageTrailHp: 100,
      stamina: 100,
      maxStamina: 100,
      astra: 'agni',
      specialCooldown: 0,
      specialMaxCooldown: 4.5,
      action: 'idle',
      actionTimer: 0,
      actionDuration: 0.4,
      hitAppliedThisSwing: false,
      bufferedAction: null,
      invulnTimer: 0,
      parryWindowTimer: 0,
      hitFlashTimer: 0,
      comboCount: 0,
      comboResetTimer: 0,
      perfectParries: 0,
      totalDamageDealt: 0,
      damageTaken: 0,
    },
    boss: {
      x: bossSpawnX,
      z: bossSpawnZ,
      vx: 0,
      vz: 0,
      yaw: yawTowards(bossSpawnX, bossSpawnZ, rudraSpawnX, rudraSpawnZ),
      hp: 900,
      maxHp: 900,
      displayDamageTrailHp: 900,
      poise: 0,
      maxPoise: 100,
      phase: 1,
      enrageTriggered: false,
      aiState: 'idle',
      attackKind: 'swipe',
      stateTimer: 0,
      stateDuration: 0.9,
      cooldownTimer: 0.42,
      attackHitApplied: false,
      hitFlashTimer: 0,
      targetX: rudraSpawnX,
      targetZ: rudraSpawnZ,
      comboChainLeft: 0,
    },
    pillars: [
      { id: 1, x: -3.25, z: -2.25, radius: 0.76, hp: 100, intact: true },
      { id: 2, x: 3.25, z: 2.25, radius: 0.76, hp: 100, intact: true },
    ],
    shockwaves: [],
    callouts: [],
    nextCalloutId: 1,
    maxCombo: 0,
    snapshot: null,
    pendingSfx: [],
  };
}

function addCallout(
  sim: ChamberSimState,
  x: number,
  y: number,
  z: number,
  text: string,
  tone: FloatingCallout['tone']
) {
  sim.callouts.push({
    id: sim.nextCalloutId++,
    x,
    y,
    z,
    text,
    tone,
    age: 0,
    duration: 0.72,
  });
  if (sim.callouts.length > 14) {
    sim.callouts.shift();
  }
}

function buildSwingDurations(action: RudraActionState, speedMult: number): number {
  switch (action) {
    case 'attack1':
      return 0.42 / speedMult;
    case 'attack2':
      return 0.44 / speedMult;
    case 'attack3':
      return 0.56 / speedMult;
    case 'heavy':
      return 0.64 / speedMult;
    case 'cast':
      return 0.58;
    case 'dodge':
      return 0.34;
    case 'hurt':
      return 0.3;
    default:
      return 0.35;
  }
}

function startRudraAction(
  sim: ChamberSimState,
  action: RudraActionState,
  aimX: number,
  aimZ: number
) {
  const r = sim.rudra;
  const spec = ELEMENT_SPECS[r.astra];
  r.action = action;
  r.actionTimer = 0;
  r.actionDuration = buildSwingDurations(action, spec.speedMult);
  r.hitAppliedThisSwing = false;
  r.bufferedAction = null;
  r.yaw = yawTowards(r.x, r.z, aimX, aimZ);

  if (action === 'attack1' || action === 'attack2' || action === 'attack3') {
    sim.pendingSfx.push('slash_light');
  } else if (action === 'heavy') {
    sim.pendingSfx.push('slash_heavy');
  } else if (action === 'cast') {
    r.specialCooldown = r.specialMaxCooldown;
    r.invulnTimer = Math.max(r.invulnTimer, 0.36);
    sim.pendingSfx.push('slash_cast');
  } else if (action === 'dodge') {
    r.stamina = Math.max(0, r.stamina - 24);
    r.invulnTimer = 0.28;
    sim.pendingSfx.push('dash');
  }
}

export function stepChamberSimulation(
  sim: ChamberSimState,
  rawDt: number,
  input: PlayerInputFrame
): void {
  const dt = Math.min(rawDt, 0.05);
  sim.pendingSfx.length = 0;

  // Always fade visual juice timers even on victory/defeat beat
  sim.cameraTrauma = Math.max(0, sim.cameraTrauma - dt * 1.9);
  if (sim.impactFrame.timer > 0) {
    sim.impactFrame.timer = Math.max(0, sim.impactFrame.timer - dt);
  }
  sim.rudra.hitFlashTimer = Math.max(0, sim.rudra.hitFlashTimer - dt);
  sim.boss.hitFlashTimer = Math.max(0, sim.boss.hitFlashTimer - dt);

  for (let i = sim.shockwaves.length - 1; i >= 0; i--) {
    sim.shockwaves[i].age += dt;
    if (sim.shockwaves[i].age >= sim.shockwaves[i].duration) {
      sim.shockwaves.splice(i, 1);
    }
  }
  for (let i = sim.callouts.length - 1; i >= 0; i--) {
    sim.callouts[i].age += dt;
    sim.callouts[i].y += dt * 1.15;
    if (sim.callouts[i].age >= sim.callouts[i].duration) {
      sim.callouts.splice(i, 1);
    }
  }

  // Smooth damage-trail HP bars
  sim.rudra.displayDamageTrailHp +=
    (sim.rudra.hp - sim.rudra.displayDamageTrailHp) * Math.min(1, dt * 6);
  sim.boss.displayDamageTrailHp +=
    (sim.boss.hp - sim.boss.displayDamageTrailHp) * Math.min(1, dt * 5);

  if (sim.phase !== 'playing') {
    return;
  }

  // Hitstop freeze pauses simulation physics while visual juice decays
  if (sim.hitstopTimer > 0) {
    sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
    return;
  }

  sim.elapsedSec += dt;

  const r = sim.rudra;
  const b = sim.boss;
  const spec = ELEMENT_SPECS[r.astra];

  if (input.elementSwitch) {
    r.astra = input.elementSwitch;
  }

  r.specialCooldown = Math.max(0, r.specialCooldown - dt);
  r.invulnTimer = Math.max(0, r.invulnTimer - dt);
  r.parryWindowTimer = Math.max(0, r.parryWindowTimer - dt);
  if (r.comboResetTimer > 0) {
    r.comboResetTimer -= dt;
    if (r.comboResetTimer <= 0) r.comboCount = 0;
  }

  if (r.action !== 'dodge' && r.action !== 'block') {
    r.stamina = Math.min(r.maxStamina, r.stamina + dt * 22);
  }

  // Aim target defaults to Dundubhi if cursor aim isn't overriding
  const aimX = input.aimWorldX ?? b.x;
  const aimZ = input.aimWorldZ ?? b.z;
  const worldMove = isoScreenInputToWorldMove(input.moveScreenX, input.moveScreenY);
  const hasMove = Math.abs(worldMove.x) > 0.01 || Math.abs(worldMove.z) > 0.01;

  // Input buffering during attack swings
  const isAttacking =
    r.action === 'attack1' ||
    r.action === 'attack2' ||
    r.action === 'attack3' ||
    r.action === 'heavy' ||
    r.action === 'cast';

  if (isAttacking && r.actionTimer > r.actionDuration * 0.35) {
    if (input.dodgePressed && r.stamina >= 20) r.bufferedAction = 'dodge';
    else if (input.castPressed && r.specialCooldown <= 0) r.bufferedAction = 'cast';
    else if (input.heavyPressed) r.bufferedAction = 'heavy';
    else if (input.attackPressed) r.bufferedAction = 'attack';
  }

  // Player state transitions
  const canCancelToDodge =
    (isAttacking || r.action === 'idle' || r.action === 'run' || r.action === 'block') &&
    r.action !== 'dodge' &&
    r.action !== 'hurt';

  if (input.dodgePressed && canCancelToDodge && r.stamina >= 20) {
    const dx = hasMove ? r.x + worldMove.x * 3 : aimX;
    const dz = hasMove ? r.z + worldMove.z * 3 : aimZ;
    startRudraAction(sim, 'dodge', dx, dz);
  } else if (input.blockJustPressed && (r.action === 'idle' || r.action === 'run')) {
    r.action = 'block';
    r.actionTimer = 0;
    r.actionDuration = 0.5;
    r.parryWindowTimer = 0.26;
    r.yaw = yawTowards(r.x, r.z, aimX, aimZ);
  } else if (r.action === 'idle' || r.action === 'run' || r.action === 'block') {
    if (input.castPressed && r.specialCooldown <= 0) {
      startRudraAction(sim, 'cast', aimX, aimZ);
    } else if (input.heavyPressed) {
      startRudraAction(sim, 'heavy', aimX, aimZ);
    } else if (input.attackPressed) {
      startRudraAction(sim, 'attack1', aimX, aimZ);
    } else if (input.blockHeld) {
      r.action = 'block';
      r.yaw = yawTowards(r.x, r.z, aimX, aimZ);
    } else if (r.action === 'block' && !input.blockHeld) {
      r.action = hasMove ? 'run' : 'idle';
    }
  }

  // Advance Rudra action
  r.actionTimer += dt;
  const normP = r.actionDuration > 0 ? Math.min(1, r.actionTimer / r.actionDuration) : 1;

  if (r.action === 'idle' || r.action === 'run') {
    if (hasMove) {
      r.action = 'run';
      const moveSpeed = 6.35;
      r.vx = worldMove.x * moveSpeed;
      r.vz = worldMove.z * moveSpeed;
      const targetYaw = Math.atan2(worldMove.x, worldMove.z);
      const diff = angleDiff(targetYaw, r.yaw);
      r.yaw = normalizeAngle(r.yaw + diff * Math.min(1, dt * 16));
    } else {
      r.action = 'idle';
      r.vx = 0;
      r.vz = 0;
    }
  } else if (r.action === 'block') {
    r.vx = hasMove ? worldMove.x * 2.1 : 0;
    r.vz = hasMove ? worldMove.z * 2.1 : 0;
  } else if (r.action === 'dodge') {
    const dashMult = normP < 0.72 ? spec.dashSpeed : spec.dashSpeed * 0.35;
    r.vx = Math.sin(r.yaw) * dashMult;
    r.vz = Math.cos(r.yaw) * dashMult;
    if (normP >= 1) {
      r.action = hasMove ? 'run' : 'idle';
      r.actionTimer = 0;
    }
  } else if (r.action === 'hurt') {
    r.vx *= Math.exp(-8 * dt);
    r.vz *= Math.exp(-8 * dt);
    if (normP >= 1) {
      r.action = hasMove ? 'run' : 'idle';
      r.actionTimer = 0;
    }
  } else if (isAttacking) {
    // Micro lunge forward during active swing window
    const fwdX = Math.sin(r.yaw);
    const fwdZ = Math.cos(r.yaw);
    const lunge = normP >= 0.18 && normP <= 0.45 ? (r.action === 'heavy' ? 6.5 : 4.2) : 0;
    r.vx = fwdX * lunge;
    r.vz = fwdZ * lunge;

    // Hit evaluation at impact apex
    const strikeWindow =
      r.action === 'cast'
        ? normP >= 0.32 && normP <= 0.65
        : r.action === 'heavy'
          ? normP >= 0.42 && normP <= 0.62
          : normP >= 0.34 && normP <= 0.56;

    if (strikeWindow && !r.hitAppliedThisSwing && b.aiState !== 'dead') {
      const reach =
        (r.action === 'cast' ? 4.2 : r.action === 'heavy' ? 3.55 : 3.2) + spec.reachBonus;
      const halfCone =
        r.action === 'cast' ? Math.PI : r.action === 'heavy' ? 1.1 : 1.25;

      if (isPointInCone(r.x, r.z, r.yaw, b.x, b.z, reach, halfCone)) {
        r.hitAppliedThisSwing = true;
        const baseDmg =
          r.action === 'cast'
            ? 88
            : r.action === 'heavy'
              ? 68
              : r.action === 'attack3'
                ? 54
                : r.action === 'attack2'
                  ? 38
                  : 32;
        const staggerBonus = b.aiState === 'stagger' ? 1.65 : 1.0;
        const dmg = Math.round(baseDmg * spec.damageMult * staggerBonus);
        const poiseDmg =
          (r.action === 'heavy' ? 24 : r.action === 'cast' ? 30 : 12) * spec.poiseMult;

        b.hp = Math.max(0, b.hp - dmg);
        b.hitFlashTimer = 0.08;
        r.totalDamageDealt += dmg;
        r.comboCount += 1;
        r.comboResetTimer = 2.8;
        sim.maxCombo = Math.max(sim.maxCombo, r.comboCount);

        const isHeavyOrCrit = b.aiState === 'stagger' || r.action === 'heavy' || r.action === 'cast' || r.action === 'attack3';
        sim.hitstopTimer = isHeavyOrCrit ? 0.058 : 0.032;
        sim.cameraTrauma = Math.min(1, sim.cameraTrauma + (isHeavyOrCrit ? 0.42 : 0.2));
        if (isHeavyOrCrit) {
          sim.impactFrame = { timer: 0.055, duration: 0.055, intensity: 1.0 };
        }
        sim.pendingSfx.push(isHeavyOrCrit ? 'crit' : 'hit');
        addCallout(
          sim,
          b.x,
          2.2,
          b.z,
          `${dmg}${b.aiState === 'stagger' ? '!' : ''}`,
          b.aiState === 'stagger' ? 'crit' : r.astra
        );

        if (b.aiState !== 'stagger') {
          b.poise += poiseDmg;
          if (b.poise >= b.maxPoise) {
            b.poise = 0;
            b.aiState = 'stagger';
            b.stateTimer = 0;
            b.stateDuration = 2.6;
            sim.hitstopTimer = 0.075;
            sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.6);
            sim.impactFrame = { timer: 0.08, duration: 0.08, intensity: 1.0 };
            addCallout(sim, b.x, 2.75, b.z, 'POISE BROKEN', 'parry');
          }
        }
      }
    }

    if (normP >= 1) {
      if (r.bufferedAction === 'dodge' && r.stamina >= 20) {
        const dx = hasMove ? r.x + worldMove.x * 3 : aimX;
        const dz = hasMove ? r.z + worldMove.z * 3 : aimZ;
        startRudraAction(sim, 'dodge', dx, dz);
      } else if (r.bufferedAction === 'cast' && r.specialCooldown <= 0) {
        startRudraAction(sim, 'cast', aimX, aimZ);
      } else if (r.bufferedAction === 'heavy') {
        startRudraAction(sim, 'heavy', aimX, aimZ);
      } else if (r.bufferedAction === 'attack') {
        const nextCombo: RudraActionState =
          r.action === 'attack1' ? 'attack2' : r.action === 'attack2' ? 'attack3' : 'attack1';
        startRudraAction(sim, nextCombo, aimX, aimZ);
      } else {
        r.action = hasMove ? 'run' : 'idle';
        r.actionTimer = 0;
      }
    }
  }

  // Integrate Rudra movement + resolve collisions
  const nextRPos = resolvePillarCollisions(
    r.x + r.vx * dt,
    r.z + r.vz * dt,
    0.55,
    sim.pillars
  );
  r.x = nextRPos.x;
  r.z = nextRPos.z;

  // Trigger Dundubhi Phase 2 enrage at <= 55% HP
  if (b.hp > 0 && !b.enrageTriggered && b.hp <= b.maxHp * 0.55) {
    b.enrageTriggered = true;
    b.phase = 2;
    b.aiState = 'windup';
    b.attackKind = 'roar';
    b.stateTimer = 0;
    b.stateDuration = 0.65;
    b.attackHitApplied = false;
    sim.pendingSfx.push('boss_roar');
    addCallout(sim, b.x, 2.8, b.z, 'WAR DRUM AWAKENED', 'hurt');
  }

  // Check Dundubhi defeat -> dramatic death collapse beat before victory screen
  if (b.hp <= 0 && b.aiState !== 'dead') {
    b.aiState = 'dead';
    b.vx = 0;
    b.vz = 0;
    b.stateTimer = 0;
    b.stateDuration = 1.1;
    sim.hitstopTimer = 0.085;
    sim.cameraTrauma = 0.85;
    sim.impactFrame = { timer: 0.11, duration: 0.11, intensity: 1.0 };
    sim.pendingSfx.push('victory');
    return;
  }

  if (b.aiState === 'dead') {
    b.stateTimer += dt;
    if (b.stateTimer >= b.stateDuration && sim.phase === 'playing') {
      sim.phase = 'victory';
      sim.snapshot = {
        elapsedSec: sim.elapsedSec,
        damageTaken: r.damageTaken,
        perfectParries: r.perfectParries,
        maxCombo: sim.maxCombo,
        bossHpRemaining: 0,
        bossMaxHp: b.maxHp,
        pillarsShattered: sim.pillars.filter((p) => !p.intact).length,
      };
    }
    return;
  }

  // Step Dundubhi AI (aggressive multi-move boss kit synced to Creature Pack 4 animations)
  const bossDist = Math.hypot(r.x - b.x, r.z - b.z);
  const phaseSpeed = b.phase === 2 ? 1.24 : 1.0;
  b.stateTimer += dt;
  b.cooldownTimer = Math.max(0, b.cooldownTimer - dt * phaseSpeed);

  if (b.aiState === 'stagger') {
    b.vx = 0;
    b.vz = 0;
    b.comboChainLeft = 0;
    if (b.stateTimer >= b.stateDuration) {
      b.aiState = 'idle';
      b.stateTimer = 0;
      b.cooldownTimer = 0.25;
    }
  } else if (b.aiState === 'idle' || b.aiState === 'chase') {
    const dirX = bossDist > 1e-4 ? (r.x - b.x) / bossDist : 0;
    const dirZ = bossDist > 1e-4 ? (r.z - b.z) / bossDist : 1;
    const desiredYaw = Math.atan2(dirX, dirZ);
    b.yaw = normalizeAngle(b.yaw + angleDiff(desiredYaw, b.yaw) * Math.min(1, dt * 8.5));

    if (bossDist <= 3.55 && b.cooldownTimer <= 0) {
      b.aiState = 'windup';
      const roll = Math.random();
      if (b.phase === 2 && bossDist <= 2.75 && roll < 0.22) {
        b.attackKind = 'roar';
        b.comboChainLeft = 0;
      } else if (roll < 0.48) {
        b.attackKind = 'punch';
        b.comboChainLeft = 1; // Chains directly into swipe/slam follow-up
      } else if (roll < 0.82) {
        b.attackKind = 'swipe';
        b.comboChainLeft = b.phase === 2 && Math.random() < 0.55 ? 1 : 0;
      } else {
        b.attackKind = 'slam';
        b.comboChainLeft = 0;
      }
      b.stateTimer = 0;
      const baseWindup =
        b.attackKind === 'punch'
          ? 0.34
          : b.attackKind === 'slam'
            ? 0.62
            : b.attackKind === 'roar'
              ? 0.54
              : 0.48;
      b.stateDuration = baseWindup / (b.phase === 2 ? 1.15 : 1.0);
      b.attackHitApplied = false;
      b.targetX = r.x;
      b.targetZ = r.z;
    } else if (bossDist > 4.25 && b.cooldownTimer <= 0) {
      b.aiState = 'windup';
      b.attackKind = Math.random() < 0.56 ? 'charge' : 'slam';
      b.comboChainLeft = 0;
      b.stateTimer = 0;
      b.stateDuration = (b.attackKind === 'charge' ? 0.56 : 0.64) / (b.phase === 2 ? 1.15 : 1.0);
      b.attackHitApplied = false;
      // Target beyond player during horn charge so pillars can be baited in the path
      const overshoot = b.attackKind === 'charge' ? 2.4 : 0;
      const clampedTgt = clampToArena(
        r.x + dirX * overshoot,
        r.z + dirZ * overshoot,
        0.9
      );
      b.targetX = clampedTgt.x;
      b.targetZ = clampedTgt.z;
    } else {
      b.aiState = 'chase';
      const spd = b.phase === 2 ? 5.25 : 4.45;
      b.vx = dirX * spd;
      b.vz = dirZ * spd;
      const nextBPos = resolvePillarCollisions(
        b.x + b.vx * dt,
        b.z + b.vz * dt,
        0.92,
        sim.pillars
      );
      b.x = nextBPos.x;
      b.z = nextBPos.z;
    }
  } else if (b.aiState === 'windup') {
    const aimToTargetYaw = yawTowards(b.x, b.z, b.targetX, b.targetZ);
    b.yaw = normalizeAngle(b.yaw + angleDiff(aimToTargetYaw, b.yaw) * Math.min(1, dt * 11));
    b.vx = 0;
    b.vz = 0;
    if (b.stateTimer >= b.stateDuration) {
      b.aiState = 'attack';
      b.stateTimer = 0;
      b.stateDuration =
        b.attackKind === 'charge'
          ? 0.62
          : b.attackKind === 'slam'
            ? 0.68
            : b.attackKind === 'roar'
              ? 0.52
              : b.attackKind === 'punch'
                ? 0.34
                : 0.46;
      if (b.attackKind === 'roar') sim.pendingSfx.push('boss_roar');
    }
  } else if (b.aiState === 'attack') {
    if (b.attackKind === 'charge') {
      const chargeSpeed = b.phase === 2 ? 11.4 : 9.8;
      const fwdX = Math.sin(b.yaw);
      const fwdZ = Math.cos(b.yaw);
      b.vx = fwdX * chargeSpeed;
      b.vz = fwdZ * chargeSpeed;
      const nextPos = clampToArena(b.x + b.vx * dt, b.z + b.vz * dt, 0.9);
      b.x = nextPos.x;
      b.z = nextPos.z;

      // Did Dundubhi crash straight into a Kurukshetra Pillar?! Massive armor-crack & stagger!
      let crashedPillar = false;
      for (const pil of sim.pillars) {
        if (!pil.intact) continue;
        if (Math.hypot(b.x - pil.x, b.z - pil.z) <= pil.radius + 0.95) {
          pil.intact = false;
          pil.hp = 0;
          b.hp = Math.max(0, b.hp - 120);
          b.poise = 0;
          b.hitFlashTimer = 0.16;
          b.aiState = 'stagger';
          b.stateTimer = 0;
          b.stateDuration = 2.6;
          b.vx = 0;
          b.vz = 0;
          sim.pendingSfx.push('pillar_break');
          sim.hitstopTimer = 0.085;
          sim.cameraTrauma = 0.72;
          sim.impactFrame = { timer: 0.09, duration: 0.09, intensity: 1.0 };
          sim.shockwaves.push({
            x: pil.x,
            z: pil.z,
            maxRadius: 3.6,
            colorHex: 0xff6b1a,
            age: 0,
            duration: 0.4,
          });
          addCallout(sim, pil.x, 2.5, pil.z, 'ARMOR CRACKED -120', 'crit');
          crashedPillar = true;
          break;
        }
      }

      if (!crashedPillar && !b.attackHitApplied && Math.hypot(r.x - b.x, r.z - b.z) <= 1.75) {
        b.attackHitApplied = true;
        applyBossHitToRudra(sim, 24, true);
      }
    } else if (b.attackKind === 'slam') {
      const p = Math.min(1, b.stateTimer / b.stateDuration);
      if (p < 0.55) {
        const dx = b.targetX - b.x;
        const dz = b.targetZ - b.z;
        const nextBPos = clampToArena(b.x + dx * dt * 5.2, b.z + dz * dt * 5.2, 0.9);
        b.x = nextBPos.x;
        b.z = nextBPos.z;
      }
      if (p >= 0.56 && !b.attackHitApplied) {
        b.attackHitApplied = true;
        sim.pendingSfx.push('boss_slam');
        sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.58);
        sim.shockwaves.push({
          x: b.x,
          z: b.z,
          maxRadius: 4.1,
          colorHex: b.phase === 2 ? 0xff3b24 : 0xf59e0b,
          age: 0,
          duration: 0.42,
        });

        for (const pil of sim.pillars) {
          if (!pil.intact) continue;
          if (Math.hypot(b.x - pil.x, b.z - pil.z) <= 2.35) {
            pil.intact = false;
            pil.hp = 0;
            b.hp = Math.max(0, b.hp - 110);
            b.poise = Math.min(b.maxPoise, b.poise + 58);
            b.hitFlashTimer = 0.14;
            sim.pendingSfx.push('pillar_break');
            sim.hitstopTimer = 0.068;
            sim.impactFrame = { timer: 0.075, duration: 0.075, intensity: 1.0 };
            addCallout(sim, pil.x, 2.4, pil.z, 'PILLAR CRUSHED -110', 'crit');
          }
        }

        if (Math.hypot(r.x - b.x, r.z - b.z) <= 3.6) {
          applyBossHitToRudra(sim, 26, true);
        }
      }
    } else if (b.attackKind === 'roar') {
      if (b.stateTimer >= 0.14 && !b.attackHitApplied) {
        b.attackHitApplied = true;
        sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.48);
        sim.shockwaves.push({
          x: b.x,
          z: b.z,
          maxRadius: 6.2,
          colorHex: 0xff2a3c,
          age: 0,
          duration: 0.5,
        });
        if (Math.hypot(r.x - b.x, r.z - b.z) <= 5.4) {
          applyBossHitToRudra(sim, 18, false);
        }
      }
    } else if (b.attackKind === 'punch') {
      const p = Math.min(1, b.stateTimer / b.stateDuration);
      if (p < 0.4) {
        const nextB = clampToArena(
          b.x + Math.sin(b.yaw) * dt * 3.8,
          b.z + Math.cos(b.yaw) * dt * 3.8,
          0.9
        );
        b.x = nextB.x;
        b.z = nextB.z;
      }
      if (p >= 0.35 && !b.attackHitApplied) {
        b.attackHitApplied = true;
        if (isPointInCone(b.x, b.z, b.yaw, r.x, r.z, 3.25, 1.05)) {
          applyBossHitToRudra(sim, 18, true);
        }
      }
    } else {
      // Wide swipe cleave
      const p = Math.min(1, b.stateTimer / b.stateDuration);
      if (p >= 0.38 && !b.attackHitApplied) {
        b.attackHitApplied = true;
        if (isPointInCone(b.x, b.z, b.yaw, r.x, r.z, 3.7, 1.35)) {
          applyBossHitToRudra(sim, 22, true);
        }
      }
    }

    if (b.aiState === 'attack' && b.stateTimer >= b.stateDuration) {
      if (b.comboChainLeft > 0 && bossDist <= 4.6) {
        b.comboChainLeft -= 1;
        b.aiState = 'windup';
        b.attackKind = b.attackKind === 'punch' ? 'swipe' : 'slam';
        b.stateTimer = 0;
        b.stateDuration = (b.attackKind === 'slam' ? 0.54 : 0.38) / (b.phase === 2 ? 1.15 : 1.0);
        b.attackHitApplied = false;
        b.targetX = r.x;
        b.targetZ = r.z;
      } else {
        b.aiState = 'recover';
        b.stateTimer = 0;
        b.stateDuration = b.attackKind === 'slam' || b.attackKind === 'charge' ? 0.44 : 0.28;
      }
    }
  } else if (b.aiState === 'recover') {
    b.vx = 0;
    b.vz = 0;
    if (b.stateTimer >= b.stateDuration) {
      b.aiState = 'idle';
      b.stateTimer = 0;
      b.cooldownTimer = b.phase === 2 ? 0.16 : 0.28;
    }
  }

  // Soft actor separation so Rudra & Dundubhi never clip inside each other
  const sepDx = r.x - b.x;
  const sepDz = r.z - b.z;
  const sepDist = Math.hypot(sepDx, sepDz);
  if (sepDist < 1.38 && sepDist > 1e-4) {
    const push = (1.38 - sepDist) * 0.65;
    const pushedR = clampToArena(r.x + (sepDx / sepDist) * push, r.z + (sepDz / sepDist) * push, 0.55);
    r.x = pushedR.x;
    r.z = pushedR.z;
  }
}

function applyBossHitToRudra(sim: ChamberSimState, rawDamage: number, parryable: boolean) {
  const r = sim.rudra;
  const b = sim.boss;

  if (r.invulnTimer > 0) {
    addCallout(sim, r.x, 2.0, r.z, 'EVADED', 'vayu');
    return;
  }

  // Perfect Deflect during initial parry window!
  if (parryable && r.action === 'block' && r.parryWindowTimer > 0) {
    r.perfectParries += 1;
    r.stamina = Math.min(r.maxStamina, r.stamina + 25);
    b.poise += 46;
    b.hitFlashTimer = 0.09;
    sim.hitstopTimer = 0.072;
    sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.5);
    sim.impactFrame = { timer: 0.075, duration: 0.075, intensity: 1.0 };
    sim.pendingSfx.push('parry');
    addCallout(sim, r.x, 2.35, r.z, 'DEFLECT!', 'parry');

    if (b.poise >= b.maxPoise) {
      b.poise = 0;
      b.aiState = 'stagger';
      b.stateTimer = 0;
      b.stateDuration = 2.6;
      addCallout(sim, b.x, 2.8, b.z, 'POSTURE BROKEN', 'parry');
    }
    return;
  }

  // Standard block absorbs 65%
  if (r.action === 'block' && r.stamina >= 15) {
    const chip = Math.max(3, Math.round(rawDamage * 0.35));
    r.stamina = Math.max(0, r.stamina - 22);
    r.hp = Math.max(0, r.hp - chip);
    r.damageTaken += chip;
    sim.hitstopTimer = 0.032;
    sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.22);
    sim.pendingSfx.push('parry');
    addCallout(sim, r.x, 2.1, r.z, `BLOCKED -${chip}`, 'vajra');
  } else {
    r.hp = Math.max(0, r.hp - rawDamage);
    r.damageTaken += rawDamage;
    r.hitFlashTimer = 0.12;
    r.invulnTimer = 0.42;
    r.action = 'hurt';
    r.actionTimer = 0;
    r.actionDuration = 0.28;
    const dx = r.x - b.x;
    const dz = r.z - b.z;
    const len = Math.max(0.01, Math.hypot(dx, dz));
    r.vx = (dx / len) * 6.2;
    r.vz = (dz / len) * 6.2;
    sim.hitstopTimer = 0.048;
    sim.cameraTrauma = Math.min(1, sim.cameraTrauma + 0.46);
    sim.pendingSfx.push('hurt');
    addCallout(sim, r.x, 2.1, r.z, `-${rawDamage}`, 'hurt');
  }

  if (r.hp <= 0) {
    r.action = 'dead';
    sim.phase = 'defeat';
    sim.pendingSfx.push('defeat');
    sim.snapshot = {
      elapsedSec: sim.elapsedSec,
      damageTaken: r.damageTaken,
      perfectParries: r.perfectParries,
      maxCombo: sim.maxCombo,
      bossHpRemaining: b.hp,
      bossMaxHp: b.maxHp,
      pillarsShattered: sim.pillars.filter((p) => !p.intact).length,
    };
  }
}

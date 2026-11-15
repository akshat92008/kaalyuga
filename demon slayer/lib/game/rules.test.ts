import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_BOUND,
  createInitialChamberState,
  isoScreenInputToWorldMove,
  isPointInCone,
  resolvePillarCollisions,
  stepChamberSimulation,
  type PlayerInputFrame,
} from './rules';

const EMPTY_INPUT: PlayerInputFrame = {
  moveScreenX: 0,
  moveScreenY: 0,
  attackPressed: false,
  heavyPressed: false,
  castPressed: false,
  dodgePressed: false,
  blockHeld: false,
  blockJustPressed: false,
  elementSwitch: null,
  aimWorldX: null,
  aimWorldZ: null,
};

test('isometric screen W/A/S/D mapping produces unit XZ movement along camera axes', () => {
  const up = isoScreenInputToWorldMove(0, 1);
  assert.ok(up.x < 0 && up.z < 0);
  assert.ok(Math.abs(Math.hypot(up.x, up.z) - 1) < 1e-4);

  const right = isoScreenInputToWorldMove(1, 0);
  assert.ok(right.x > 0 && right.z < 0);
  assert.ok(Math.abs(Math.hypot(right.x, right.z) - 1) < 1e-4);

  const zero = isoScreenInputToWorldMove(0, 0);
  assert.deepEqual(zero, { x: 0, z: 0 });
});

test('cone hit check detects frontal targets and rejects behind-back targets', () => {
  assert.equal(isPointInCone(0, 0, 0, 0, 2.5, 3.2, 1.1), true);
  assert.equal(isPointInCone(0, 0, 0, 0, -2.5, 3.2, 1.1), false);
  assert.equal(isPointInCone(0, 0, 0, 0, 4.5, 3.2, 1.1), false);
});

test('Rudra spawns in open quadrant, switches Astra elements, and chains 3-hit combo', () => {
  const sim = createInitialChamberState(true);
  assert.equal(sim.phase, 'playing');
  assert.equal(sim.rudra.astra, 'agni');

  // Switch to Vajra and trigger attack1 -> buffered attack2
  stepChamberSimulation(sim, 0.016, { ...EMPTY_INPUT, elementSwitch: 'vajra', attackPressed: true });
  assert.equal(sim.rudra.astra, 'vajra');
  assert.equal(sim.rudra.action, 'attack1');

  // Advance past 45% of swing and buffer second hit
  for (let i = 0; i < 6; i++) {
    stepChamberSimulation(sim, 0.032, { ...EMPTY_INPUT, attackPressed: i === 5 });
  }
  assert.equal(sim.rudra.bufferedAction, 'attack');

  // Finish attack1 -> transitions directly into attack2
  for (let i = 0; i < 8; i++) {
    stepChamberSimulation(sim, 0.032, EMPTY_INPUT);
  }
  assert.equal(sim.rudra.action, 'attack2');
});

test('Perfect parry during Dundubhi swipe deals massive poise break and increments perfectParries', () => {
  const sim = createInitialChamberState(true);
  // Position Rudra directly in front of Dundubhi
  sim.rudra.x = 1.2;
  sim.rudra.z = -1.2;
  sim.boss.x = 2.6;
  sim.boss.z = -2.6;
  sim.boss.aiState = 'attack';
  sim.boss.attackKind = 'swipe';
  sim.boss.stateTimer = 0.06;
  sim.boss.stateDuration = 0.28;
  sim.boss.attackHitApplied = false;
  sim.boss.yaw = Math.atan2(sim.rudra.x - sim.boss.x, sim.rudra.z - sim.boss.z);

  stepChamberSimulation(sim, 0.03, { ...EMPTY_INPUT, blockJustPressed: true, blockHeld: true });
  stepChamberSimulation(sim, 0.03, { ...EMPTY_INPUT, blockHeld: true });
  assert.equal(sim.rudra.action, 'block');
  assert.equal(sim.rudra.perfectParries, 1);
  assert.equal(sim.rudra.hp, 100);
  assert.ok(sim.boss.poise >= 40);
  assert.ok(sim.pendingSfx.includes('parry'));
});

test('Pillar collision pushes actors clear of intact pillars and clamps inside arena bounds', () => {
  const sim = createInitialChamberState(true);
  const p = sim.pillars[0];
  const pushed = resolvePillarCollisions(p.x + 0.1, p.z, 0.6, sim.pillars);
  assert.ok(Math.hypot(pushed.x - p.x, pushed.z - p.z) >= p.radius + 0.59);

  const clamped = resolvePillarCollisions(99, -99, 0.5, sim.pillars);
  assert.ok(Math.abs(clamped.x) < ARENA_BOUND && Math.abs(clamped.z) < ARENA_BOUND);
});

test('Defeating Dundubhi plays death collapse beat then freezes victory snapshot', () => {
  const sim = createInitialChamberState(true);
  sim.boss.hp = 10;
  sim.rudra.x = sim.boss.x;
  sim.rudra.z = sim.boss.z + 1.8;

  stepChamberSimulation(sim, 0.016, { ...EMPTY_INPUT, attackPressed: true });
  for (let i = 0; i < 48; i++) {
    stepChamberSimulation(sim, 0.032, EMPTY_INPUT);
  }
  assert.equal(sim.boss.aiState, 'dead');
  assert.equal(sim.phase, 'victory');
  assert.ok(sim.snapshot !== null);
  assert.equal(sim.snapshot?.bossHpRemaining, 0);
});

test('Dundubhi chains punch directly into follow-up swipe when Rudra stays in melee range', () => {
  const sim = createInitialChamberState(true);
  sim.rudra.x = 0.8;
  sim.rudra.z = -0.8;
  sim.boss.x = 2.4;
  sim.boss.z = -2.4;
  sim.boss.aiState = 'attack';
  sim.boss.attackKind = 'punch';
  sim.boss.comboChainLeft = 1;
  sim.boss.stateTimer = 0.32;
  sim.boss.stateDuration = 0.34;
  sim.boss.attackHitApplied = true;

  stepChamberSimulation(sim, 0.04, EMPTY_INPUT);
  assert.equal(sim.boss.aiState, 'windup');
  assert.equal(sim.boss.attackKind, 'swipe');
  assert.equal(sim.boss.comboChainLeft, 0);
});


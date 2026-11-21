// ============================================================================
// KALIYUGA: VAITARANI SIMPLE ASH HUB — WALKABLE 2.5D SANCTUARY LOGIC
// Pure deterministic hub geometry & station interaction helpers:
// - Savitri (Lotus_Empress 3D) beside her Boat & Lantern (west shoreline)
// - Homa Fire Shrine (center-south sanctum brazier)
// - Northern Ferry Gate (cross into Act I Chamber I)
// ============================================================================

export type HubStationId = 'savitri_lantern' | 'homa_shrine' | 'ferry_gate';

export interface HubStationSpec {
  id: HubStationId;
  x: number;
  y: number;
  interactRadiusPx: number;
  title: string;
  sanskritLabel: string;
  promptHint: string;
  accentColor: string;
}

export const HUB_SPAWN_X = 640;
export const HUB_SPAWN_Y = 470;
export const HUB_SAVITRI_POS = { x: 310, y: 455 };
export const HUB_WEAPONSMITH_POS = { x: 970, y: 452 };
export const HUB_FERRY_GATE_POS = { x: 640, y: 205 };

export const VAITARANI_HUB_STATIONS: HubStationSpec[] = [
  {
    id: 'savitri_lantern',
    x: 345,
    y: 475,
    interactRadiusPx: 135,
    title: 'Savitri’s Boat & Lantern',
    sanskritLabel: 'सावित्री नौका · LANTERN CHRONICLE',
    promptHint: 'Read Sanjaya’s Chronicle & Act I Omen Notes',
    accentColor: '#f2c45a',
  },
  {
    id: 'homa_shrine',
    x: 925,
    y: 475,
    interactRadiusPx: 145,
    title: 'Lohakara’s Parashu Forge',
    sanskritLabel: 'लोहकार होम वेदी · WEAPONSMITH & SHRINE',
    promptHint: 'Speak with Lohakara · Temper Parashu & Spend Ashen Karma',
    accentColor: '#ff7a33',
  },
  {
    id: 'ferry_gate',
    x: 640,
    y: 215,
    interactRadiusPx: 125,
    title: 'Charnel Plains Crossing',
    sanskritLabel: 'कुरुक्षेत्र द्वार · ACT I CHAMBER I OF VIII',
    promptHint: 'Step onto the Charnel Plains (8-Chamber Act I Trial)',
    accentColor: '#3ee0a8',
  },
];

export interface HubProximityResult {
  station: HubStationSpec | null;
  distancePx: number;
}

/**
 * Returns the nearest walkable hub station within its interactive halo, or null if none.
 */
export function findNearestHubStation(
  playerX: number,
  playerY: number
): HubProximityResult {
  let closest: HubStationSpec | null = null;
  let bestDist = Infinity;

  for (const st of VAITARANI_HUB_STATIONS) {
    const dx = playerX - st.x;
    const dy = (playerY - st.y) / 0.8; // Subtle isometric Y weighting
    const dist = Math.hypot(dx, dy);
    if (dist <= st.interactRadiusPx && dist < bestDist) {
      bestDist = dist;
      closest = st;
    }
  }

  return {
    station: closest,
    distancePx: Number.isFinite(bestDist) ? Math.round(bestDist) : Infinity,
  };
}

/**
 * Returns true if Rudra physically walks into the Northern Charnel Gate trigger zone.
 */
export function isInsideHubFerryGate(playerX: number, playerY: number): boolean {
  const dx = playerX - HUB_FERRY_GATE_POS.x;
  const dy = playerY - HUB_FERRY_GATE_POS.y;
  return Math.hypot(dx, dy) <= 68;
}

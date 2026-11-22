import { CinematicCameraTrack, type CinematicCameraKeyframe } from './cinematicCamera';
import type { ParashuFinisherVariant } from './combatPipeline';

/**
 * Authored frames are fractional to the active combat action, never wall-clock delays.
 * Contact is committed exactly once when the animator's normalized action clock crosses
 * the impact marker. The game remains in charge of damage, camera shake and rewards.
 */
export interface ExecutionBeat {
  variant: ParashuFinisherVariant;
  impactProgress: number;
  prepareProgress: number;
  recoveryProgress: number;
  contactCallout: string;
  accent: string;
}

const BEATS: Record<ParashuFinisherVariant, ExecutionBeat> = {
  downward_crush: {
    variant: 'downward_crush',
    impactProgress: 0.51,
    prepareProgress: 0.13,
    recoveryProgress: 0.78,
    contactCallout: 'PARASHU CRUSH',
    accent: '#ff4c38',
  },
  spin_360_cleave: {
    variant: 'spin_360_cleave',
    impactProgress: 0.47,
    prepareProgress: 0.09,
    recoveryProgress: 0.81,
    contactCallout: 'SUDARSHANA CLEAVE',
    accent: '#fbb96b',
  },
  impaling_lunge: {
    variant: 'impaling_lunge',
    impactProgress: 0.42,
    prepareProgress: 0.11,
    recoveryProgress: 0.76,
    contactCallout: 'ARMOR BREAK',
    accent: '#4ff0a2',
  },
};

export function getExecutionBeat(variant: ParashuFinisherVariant): ExecutionBeat {
  return BEATS[variant];
}

export function shouldCommitExecutionImpact(
  variant: ParashuFinisherVariant,
  normalizedProgress: number,
  alreadyFired: boolean
): boolean {
  if (alreadyFired || !Number.isFinite(normalizedProgress)) return false;
  return normalizedProgress >= BEATS[variant].impactProgress;
}

/**
 * Three genuinely different 2.5D camera compositions. The existing
 * actor animations stay authoritative. The central keyframe in each
 * variant lands exactly on its real execution impact marker.
 */
export function createExecutionCameraTrack(
  variant: ParashuFinisherVariant,
  durationSec: number
): CinematicCameraTrack {
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0.48;
  const beat = BEATS[variant];
  const authored: Record<ParashuFinisherVariant, CinematicCameraKeyframe[]> = {
    downward_crush: [
      { at: duration * 0.10, focusX: 0.47, focusY: 0.76, zoom: 1.04 },
      { at: duration * 0.31, focusX: 0.47, focusY: 0.70, zoom: 1.10 },
      { at: duration * beat.impactProgress, focusX: 0.47, focusY: 0.65, zoom: 1.22 },
      { at: duration * beat.recoveryProgress, focusX: 0.50, focusY: 0.74, zoom: 1.045 },
    ],
    spin_360_cleave: [
      { at: duration * 0.09, focusX: 0.50, focusY: 0.72, zoom: 1.035 },
      { at: duration * 0.24, focusX: 0.50, focusY: 0.70, zoom: 1.085 },
      // Preserve a broader field to show every victim and the entire sweeping arc.
      { at: duration * beat.impactProgress, focusX: 0.50, focusY: 0.67, zoom: 1.135 },
      { at: duration * 0.65, focusX: 0.50, focusY: 0.69, zoom: 1.09 },
      { at: duration * beat.recoveryProgress, focusX: 0.50, focusY: 0.75, zoom: 1.025 },
    ],
    impaling_lunge: [
      { at: duration * 0.08, focusX: 0.49, focusY: 0.73, zoom: 1.035 },
      { at: duration * 0.24, focusX: 0.52, focusY: 0.70, zoom: 1.085 },
      // Push toward the victim, not toward the arena center.
      { at: duration * beat.impactProgress, focusX: 0.55, focusY: 0.66, zoom: 1.235 },
      { at: duration * beat.recoveryProgress, focusX: 0.51, focusY: 0.74, zoom: 1.055 },
    ],
  };
  return new CinematicCameraTrack(authored[variant], duration);
}

/** Dundubhi establishes frontal mass; Vrikodara slowly reveals a looming figure. */
export function createBossEntranceCameraTrack(
  boss: 'dundubhi' | 'vrikodara',
  durationSec = 2.65
): CinematicCameraTrack {
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 2.65;
  const shots: CinematicCameraKeyframe[] = boss === 'dundubhi'
    ? [
        { at: duration * 0.11, focusX: 0.47, focusY: 0.73, zoom: 1.035 },
        { at: duration * 0.33, focusX: 0.47, focusY: 0.68, zoom: 1.13 },
        { at: duration * 0.52, focusX: 0.49, focusY: 0.64, zoom: 1.185 },
        { at: duration * 0.72, focusX: 0.50, focusY: 0.68, zoom: 1.105 },
        { at: duration * 0.88, focusX: 0.50, focusY: 0.75, zoom: 1.018 },
      ]
    : [
        { at: duration * 0.12, focusX: 0.53, focusY: 0.74, zoom: 1.025 },
        { at: duration * 0.30, focusX: 0.54, focusY: 0.69, zoom: 1.08 },
        { at: duration * 0.54, focusX: 0.55, focusY: 0.63, zoom: 1.205 },
        { at: duration * 0.75, focusX: 0.53, focusY: 0.67, zoom: 1.125 },
        { at: duration * 0.89, focusX: 0.50, focusY: 0.75, zoom: 1.018 },
      ];
  return new CinematicCameraTrack(shots, duration);
}

/** Short in-combat shot; no control lock or new engine required. */
export function createBossTransformationCameraTrack(
  boss: 'dundubhi' | 'vrikodara',
  phase: number
): CinematicCameraTrack {
  const duration = boss === 'vrikodara' ? 1.34 : 1.05;
  const finalPhase = phase >= 3;
  const focusX = boss === 'vrikodara' ? 0.53 : 0.48;
  const apexZoom = boss === 'vrikodara'
    ? (finalPhase ? 1.20 : 1.155)
    : (finalPhase ? 1.17 : 1.13);
  return new CinematicCameraTrack([
    { at: duration * 0.12, focusX, focusY: 0.73, zoom: 1.035 },
    { at: duration * 0.49, focusX, focusY: 0.65, zoom: apexZoom },
    { at: duration * 0.72, focusX, focusY: 0.69, zoom: apexZoom * 0.96 },
    { at: duration * 0.88, focusX: 0.5, focusY: 0.75, zoom: 1.025 },
  ], duration);
}

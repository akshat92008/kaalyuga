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

export function createExecutionCameraTrack(
  variant: ParashuFinisherVariant,
  durationSec: number
): CinematicCameraTrack {
  const duration = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0.48;
  const beat = BEATS[variant];
  const focusX = variant === 'impaling_lunge' ? 0.53 : variant === 'spin_360_cleave' ? 0.5 : 0.47;
  const focusY = variant === 'downward_crush' ? 0.70 : 0.66;
  const apexZoom = variant === 'spin_360_cleave' ? 1.15 : 1.20;
  const frames: CinematicCameraKeyframe[] = [
    { at: duration * beat.prepareProgress, focusX, focusY: 0.72, zoom: 1.055 },
    { at: duration * beat.impactProgress, focusX, focusY, zoom: apexZoom },
    { at: duration * beat.recoveryProgress, focusX: 0.5, focusY: 0.74, zoom: 1.035 },
  ];
  return new CinematicCameraTrack(frames, duration);
}

/** Live boss entrances are framed without exposing missing sides of painted video arenas. */
export function createBossEntranceCameraTrack(
  boss: 'dundubhi' | 'vrikodara',
  durationSec = 2.65
): CinematicCameraTrack {
  const focusX = boss === 'dundubhi' ? 0.48 : 0.52;
  return new CinematicCameraTrack([
    { at: 0.28, focusX, focusY: 0.71, zoom: 1.055 },
    { at: 0.94, focusX, focusY: 0.66, zoom: 1.16 },
    { at: 1.63, focusX: 0.5, focusY: 0.68, zoom: 1.12 },
    { at: 2.27, focusX: 0.5, focusY: 0.75, zoom: 1.015 },
  ], durationSec);
}

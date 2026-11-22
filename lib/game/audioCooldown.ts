/**
 * A missing prior timestamp is NOT an event played at performance.now() === 0.
 * During the first seconds after page load, intro voice lines and weapon sounds
 * must be eligible to play immediately, while repeat events remain rate-limited.
 */
export function isAudioEventOnCooldown(
  lastPlayedAtMs: number | undefined,
  nowMs: number,
  cooldownMs: number
): boolean {
  if (lastPlayedAtMs === undefined || !Number.isFinite(lastPlayedAtMs)) return false;
  if (!Number.isFinite(nowMs) || nowMs < lastPlayedAtMs) return false;
  return nowMs - lastPlayedAtMs < Math.max(0, cooldownMs);
}

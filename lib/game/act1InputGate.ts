/**
 * A menu is an input boundary, not merely a paused simulation.
 * Keep this pure so the same decision can be exercised in Node and the browser.
 * The owning keyboard listener handles Escape and mute before consulting this.
 */
export function canDispatchAct1GameplayKey(
  gameState: string,
  modalPaused: boolean,
  blockingUiOpen: boolean
): boolean {
  return gameState === 'playing' && !modalPaused && !blockingUiOpen;
}

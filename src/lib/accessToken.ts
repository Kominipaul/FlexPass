/**
 * Rotation-window timing for the member's check-in code.
 *
 * Signing and verification both live on the server now
 * (server/src/domain/tokens.ts). This file is deliberately all that's left
 * on the client: the arithmetic for *when* the code rotates, which the
 * Check In screen uses to drive its countdown ring and to know when to ask
 * for a fresh token.
 *
 * The signing key is not here, was not shipped to the browser, and cannot
 * be read out of it — which is the one thing the old localStorage build
 * could never claim. A member's app can display a code; it cannot mint one.
 */

/**
 * Rotation window, in seconds — must match ROTATE_SECONDS on the server.
 *
 * 60s, not 20s: the member pulls the phone out at the door, unlocks it,
 * finds the app and holds it to the reader — a window shorter than that
 * whole sequence just means the code rotates in the reader's face and the
 * queue backs up. A minute is still far too short for a screenshot of
 * someone else's code to be worth passing around, which is the only thing
 * rotation is defending against.
 */
export const ROTATE_SECONDS = 60

export function currentWindowStart(nowMs: number = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return nowSec - (nowSec % ROTATE_SECONDS)
}

/** Seconds remaining until the *next* rotation — drives the countdown ring in the UI. */
export function secondsUntilRotation(nowMs: number = Date.now()): number {
  const nowSec = Math.floor(nowMs / 1000)
  return ROTATE_SECONDS - (nowSec - currentWindowStart(nowMs))
}

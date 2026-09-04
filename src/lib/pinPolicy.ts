/**
 * The rules around the backup PIN.
 *
 * The PIN exists for one situation: a member is standing at the door with a
 * flat phone. It is not a second front door. So:
 *
 *  1. **A PIN never identifies anyone.** The reader has no keypad until a
 *     staff member has found the member in the member list and opened a
 *     window against their user id — after that the typed digits are
 *     compared to that one member's PIN and nobody else's. This is what
 *     makes four digits fine at 10,000 members: two people sharing 4-2-8-1
 *     is meaningless when the PIN was never the thing saying who you are.
 *  2. **Three wrong digits burns the window.** Then it's back to QR-only
 *     and the staffer has to open a new one deliberately.
 *  3. **It's for emergencies, not for Tuesdays.** A member gets
 *     PIN_ALLOWANCE backup entries per rolling PIN_ALLOWANCE_DAYS days.
 *     Past that a staffer can still let them in, but has to knowingly
 *     override, and the override is stamped on the door log with their name
 *     — which is what stops "just tell them my PIN" from becoming the way
 *     a member gets in every day.
 */
import type { CheckIn } from '@/types'

/** Wrong digits allowed inside one staff-opened window before it burns. */
export const PIN_MAX_ATTEMPTS = 3
/** How long a staff-opened window stays usable. */
export const PIN_WINDOW_MINUTES = 5
/** Backup entries a member gets per rolling window before staff have to override. */
export const PIN_ALLOWANCE = 3
export const PIN_ALLOWANCE_DAYS = 30

export interface PinAllowance {
  /** PIN check-ins in the rolling window. */
  used: number
  limit: number
  /** Never negative. */
  remaining: number
  windowDays: number
  /** Allowance is spent — any further backup entry needs a deliberate staff override. */
  overLimit: boolean
}

/** How much of their backup allowance a member has spent, read straight off their check-in history. */
export function pinAllowanceFrom(checkIns: CheckIn[], nowMs: number = Date.now()): PinAllowance {
  const cutoff = nowMs - PIN_ALLOWANCE_DAYS * 24 * 60 * 60 * 1000
  const used = checkIns.filter(
    (c) => c.method === 'PIN' && new Date(c.timestamp).getTime() >= cutoff,
  ).length
  return {
    used,
    limit: PIN_ALLOWANCE,
    remaining: Math.max(0, PIN_ALLOWANCE - used),
    windowDays: PIN_ALLOWANCE_DAYS,
    overLimit: used >= PIN_ALLOWANCE,
  }
}

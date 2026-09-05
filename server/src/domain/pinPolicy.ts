/** Backup-PIN limits. Mirrors src/lib/pinPolicy.ts; enforced here. */
import type { CheckIn } from '../../../src/types/index.ts'

export const PIN_MAX_ATTEMPTS = 3
export const PIN_WINDOW_MINUTES = 5
export const PIN_ALLOWANCE = 3
export const PIN_ALLOWANCE_DAYS = 30

export interface PinAllowance {
  used: number
  limit: number
  remaining: number
  windowDays: number
  overLimit: boolean
}

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

/** Mirrors src/lib/pinPolicy.ts — this copy is the one actually enforced on a member-chosen PIN. */
const PIN_SEQUENCES = [
  '0123', '1234', '2345', '3456', '4567', '5678', '6789',
  '9876', '8765', '7654', '6543', '5432', '4321', '3210',
]

export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true
  if (new Set(pin).size === 1) return true
  return PIN_SEQUENCES.includes(pin)
}

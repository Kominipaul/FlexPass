/**
 * The door rule. Ported verbatim from src/lib/access.ts so the member app
 * and the server never disagree about what "active" means — but the copy
 * that decides whether a door opens is this one, on the server.
 */
import type { DoorReasonCode, Membership, Plan } from '../../../src/types/index.ts'

export type MemberDisplayStatus = 'active' | 'expiring' | 'expired' | 'frozen' | 'cancelled'

const EXPIRING_WINDOW_DAYS = 7

function daysUntil(iso: string, nowMs: number = Date.now()): number {
  const target = new Date(iso).getTime()
  return Math.ceil((target - nowMs) / (24 * 60 * 60 * 1000))
}

export function displayStatus(membership: Membership): MemberDisplayStatus {
  if (membership.status === 'frozen') return 'frozen'
  if (membership.status === 'cancelled') return 'cancelled'
  const daysLeft = daysUntil(membership.renewalDate)
  if (daysLeft <= 0) return 'expired'
  if (daysLeft <= EXPIRING_WINDOW_DAYS) return 'expiring'
  return 'active'
}

export interface AccessResult {
  ok: boolean
  reasonCode: DoorReasonCode
  daysLeft?: number
}

export function evaluateAccess(
  membership: Membership,
  plan: Plan,
  locationId: string,
  homeLocationId: string,
): AccessResult {
  const status = displayStatus(membership)
  if (status === 'expired') return { ok: false, reasonCode: 'expired' }
  if (status === 'frozen') return { ok: false, reasonCode: 'frozen' }
  if (status === 'cancelled') return { ok: false, reasonCode: 'cancelled' }

  if (!plan.allLocations && locationId !== homeLocationId) {
    return { ok: false, reasonCode: 'wrong_location' }
  }
  if (status === 'expiring') {
    return { ok: true, reasonCode: 'expiring_soon', daysLeft: daysUntil(membership.renewalDate) }
  }
  return { ok: true, reasonCode: 'active' }
}

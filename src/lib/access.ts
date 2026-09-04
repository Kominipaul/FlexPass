import type { DoorReasonCode, Membership, Plan } from '@/types'
import { daysUntil } from './format'
import { locationIdFromName } from './reference'

export type MemberDisplayStatus = 'active' | 'expiring' | 'expired' | 'frozen' | 'cancelled'

const EXPIRING_WINDOW_DAYS = 7

/** The status a human reads off a membership — combines its stored status with how many days are left. */
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

/** The rule the door actually runs — plan tier decides which locations open, status decides everything else. */
export function evaluateAccess(membership: Membership, plan: Plan, locationId: string): AccessResult {
  const status = displayStatus(membership)
  if (status === 'expired') return { ok: false, reasonCode: 'expired' }
  if (status === 'frozen') return { ok: false, reasonCode: 'frozen' }
  if (status === 'cancelled') return { ok: false, reasonCode: 'cancelled' }

  const homeId = locationIdFromName(membership.homeLocation)
  if (!plan.allLocations && locationId !== homeId) {
    return { ok: false, reasonCode: 'wrong_location' }
  }
  if (status === 'expiring') {
    return { ok: true, reasonCode: 'expiring_soon', daysLeft: daysUntil(membership.renewalDate) }
  }
  return { ok: true, reasonCode: 'active' }
}

const REASON_TEXT: Record<DoorReasonCode, string> = {
  expired: 'Membership expired — renew at the desk',
  frozen: 'Membership is frozen — lift it to check in',
  cancelled: 'Membership is cancelled — reactivate to check in',
  wrong_location: "This plan is home-location only — doesn't cover this club",
  expiring_soon: 'Active — renews soon',
  active: 'Active membership',
  code_invalid: 'Not a valid FlexPass code',
  code_expired: 'Code expired — reopen the app and rescan',
  pin_incorrect: 'Wrong backup PIN entered',
}

export function reasonText(result: { reasonCode: DoorReasonCode; daysLeft?: number }): string {
  if (result.reasonCode === 'expiring_soon' && result.daysLeft != null) {
    return `Active — renews in ${result.daysLeft} day${result.daysLeft === 1 ? '' : 's'}`
  }
  return REASON_TEXT[result.reasonCode]
}

/**
 * The app's data layer — now a thin client over the FlexPass API.
 *
 * This module keeps the exact function names and shapes the rest of the app
 * already calls, so components and contexts didn't have to change when the
 * localStorage fake was replaced by a real Postgres-backed server. What
 * *did* change is where the truth lives: every read and write below crosses
 * the network to server/, and nothing is cached in the browser. Two devices
 * signed into the same account now see the same data, because there is only
 * one copy of it.
 *
 * Requests are same-origin (`/api/...`) — the Vite dev server proxies them
 * to the API — so the session cookie rides along without any CORS dance.
 */
import type {
  Activity, AppNotification, BillingCycle, CheckIn, ClassBooking, DoorScan,
  EmergencyContact, GroupMembership, Invoice, Location, Membership,
  MembershipStatus, PaymentMethod, PinUnlock, Plan, StaffUser, TrainingGoal, User,
} from '@/types'
import type { PinAllowance } from './pinPolicy'

export class ApiError extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
      ...init,
    })
  } catch {
    throw new ApiError('Cannot reach the FlexPass server. Is it running?')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError((body && (body as any).error) || `Request failed (${res.status}).`)
  }
  return body as T
}

const get = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(body) })
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' })

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

export async function listPlans(): Promise<Plan[]> {
  return (await get<{ plans: Plan[] }>('/plans')).plans
}
export async function listLocations(): Promise<Location[]> {
  return (await get<{ locations: Location[] }>('/locations')).locations
}
export async function listActivities(): Promise<Activity[]> {
  return (await get<{ activities: Activity[] }>('/activities')).activities
}
export async function getBookingCounts(activityId: string): Promise<Record<string, number>> {
  return (await get<{ counts: Record<string, number> }>(`/activities/${activityId}/booking-counts`)).counts
}
export async function getGroupRosterSize(activityId: string): Promise<number> {
  return (await get<{ size: number }>(`/activities/${activityId}/roster-size`)).size
}

// ---------------------------------------------------------------------------
// Auth — session lives in an HttpOnly cookie the server sets.
// ---------------------------------------------------------------------------

export interface SignupInput {
  name: string
  email: string
  phone: string
  password: string
  planId: string
  billingCycle: BillingCycle
}

export async function signup(input: SignupInput): Promise<User> {
  return (await post<{ user: User }>('/auth/signup', input)).user
}

export async function login(email: string, password: string, remember: boolean): Promise<User> {
  return (await post<{ user: User }>('/auth/login', { email, password, remember })).user
}

export async function logout(): Promise<void> {
  await post('/auth/logout')
}

/** The signed-in member, or null when there's no live session. */
export async function getCurrentUser(): Promise<User | null> {
  try {
    return (await get<{ user: User }>('/auth/me')).user
  } catch {
    return null
  }
}

/**
 * Returns the reset code directly, because no mail transport is wired up.
 * Null when no account matches — callers show the same copy either way.
 */
export async function requestPasswordResetCode(email: string): Promise<string | null> {
  const res = await post<{ sent: boolean; code?: string }>('/auth/password-reset/request', { email })
  return res.code ?? null
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<void> {
  await post('/auth/password-reset/confirm', { email, code, password: newPassword })
}

// ---------------------------------------------------------------------------
// Profile & security
// ---------------------------------------------------------------------------

export interface ProfileUpdate {
  name?: string
  phone?: string
  dob?: string
  address?: string
  emergencyContact?: EmergencyContact
}

export async function updateProfile(patchBody: ProfileUpdate): Promise<User> {
  return (await patch<{ user: User }>('/me/profile', patchBody)).user
}

export async function changePassword(current: string, next: string): Promise<void> {
  await post('/me/password', { current, next })
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<User> {
  return (await post<{ user: User }>('/me/two-factor', { enabled })).user
}

/** Sets the backup PIN to `pin` if given, or asks the server to pick a random one otherwise. */
export async function setCheckInPin(pin?: string): Promise<string> {
  return (await post<{ pin: string }>('/me/checkin-pin', pin ? { pin } : {})).pin
}

export async function deleteAccount(): Promise<void> {
  await del('/me')
}

// ---------------------------------------------------------------------------
// Check-in — the server signs; this app never holds a key.
// ---------------------------------------------------------------------------

export interface CheckInToken {
  token: string
  rotateSeconds: number
  secondsLeft: number
  serverTime: string
}

export async function fetchCheckInToken(): Promise<CheckInToken> {
  return get<CheckInToken>('/checkin/token')
}

export async function getCheckInPin(): Promise<string> {
  return (await get<{ pin: string }>('/checkin/pin')).pin
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function getMembership(): Promise<Membership | undefined> {
  return (await get<{ membership: Membership | null }>('/me/membership')).membership ?? undefined
}
// Plan changes and reactivation are staff-only for now — see
// adminChangePlan / adminReactivateMembership below. Both bill the member,
// and there's no online payment provider to actually collect that yet.
export async function setAutoRenew(autoRenew: boolean): Promise<Membership> {
  return (await post<{ membership: Membership }>('/me/membership/auto-renew', { autoRenew })).membership
}
export async function freezeMembership(days: number, reason: string): Promise<Membership> {
  return (await post<{ membership: Membership }>('/me/membership/freeze', { days, reason })).membership
}
export async function unfreezeMembership(): Promise<Membership> {
  return (await post<{ membership: Membership }>('/me/membership/unfreeze')).membership
}
export async function cancelMembership(immediate: boolean): Promise<Membership> {
  return (await post<{ membership: Membership }>('/me/membership/cancel', { immediate })).membership
}

// ---------------------------------------------------------------------------
// Classes & groups
// ---------------------------------------------------------------------------

export async function listClassBookings(): Promise<ClassBooking[]> {
  return (await get<{ bookings: ClassBooking[] }>('/me/bookings')).bookings
}
export async function bookClass(activityId: string, date: string): Promise<ClassBooking> {
  return (await post<{ booking: ClassBooking }>('/me/bookings', { activityId, date })).booking
}
export async function cancelBooking(bookingId: string): Promise<void> {
  await del(`/me/bookings/${bookingId}`)
}
export async function listGroupMemberships(): Promise<GroupMembership[]> {
  return (await get<{ groups: GroupMembership[] }>('/me/groups')).groups
}
export async function joinGroup(activityId: string): Promise<GroupMembership> {
  return (await post<{ group: GroupMembership }>('/me/groups', { activityId })).group
}
export async function leaveGroup(membershipId: string): Promise<void> {
  await del(`/me/groups/${membershipId}`)
}

// ---------------------------------------------------------------------------
// Visits & progression
// ---------------------------------------------------------------------------

export async function listCheckIns(): Promise<CheckIn[]> {
  return (await get<{ checkIns: CheckIn[] }>('/me/check-ins')).checkIns
}
export async function getPinAllowance(): Promise<PinAllowance> {
  return (await get<{ allowance: PinAllowance }>('/me/pin-allowance')).allowance
}
export async function getTrainingGoal(): Promise<TrainingGoal> {
  return (await get<{ goal: TrainingGoal }>('/me/training-goal')).goal
}
export async function saveTrainingGoal(
  daysPerWeek: number, restDays: number[], enabled: boolean,
): Promise<TrainingGoal> {
  return (await put<{ goal: TrainingGoal }>('/me/training-goal', { daysPerWeek, restDays, enabled })).goal
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export async function listInvoices(): Promise<Invoice[]> {
  return (await get<{ invoices: Invoice[] }>('/me/invoices')).invoices
}
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  return (await get<{ paymentMethods: PaymentMethod[] }>('/me/payment-methods')).paymentMethods
}

export interface AddPaymentMethodInput {
  brand: PaymentMethod['brand']
  last4: string
  expMonth: number
  expYear: number
  nameOnCard: string
  makeDefault?: boolean
}

export async function addPaymentMethod(input: AddPaymentMethodInput): Promise<PaymentMethod> {
  return (await post<{ paymentMethod: PaymentMethod }>('/me/payment-methods', input)).paymentMethod
}
export async function removePaymentMethod(id: string): Promise<void> {
  await del(`/me/payment-methods/${id}`)
}
export async function setDefaultPaymentMethod(id: string): Promise<void> {
  await post(`/me/payment-methods/${id}/default`)
}
export async function payInvoice(invoiceId: string): Promise<Invoice> {
  return (await post<{ invoice: Invoice }>(`/me/invoices/${invoiceId}/pay`)).invoice
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(): Promise<AppNotification[]> {
  return (await get<{ notifications: AppNotification[] }>('/me/notifications')).notifications
}
export async function markNotificationRead(id: string): Promise<void> {
  await post(`/me/notifications/${id}/read`)
}
export async function markAllNotificationsRead(): Promise<void> {
  await post('/me/notifications/read-all')
}
export async function deleteNotification(id: string): Promise<void> {
  await del(`/me/notifications/${id}`)
}
export async function clearAllNotifications(): Promise<void> {
  await del('/me/notifications')
}

// ---------------------------------------------------------------------------
// Staff auth
// ---------------------------------------------------------------------------

export async function staffLogin(email: string, password: string, remember: boolean): Promise<StaffUser> {
  return (await post<{ staff: StaffUser }>('/staff/login', { email, password, remember })).staff
}
export async function staffLogout(): Promise<void> {
  await post('/staff/logout')
}
export async function getCurrentStaff(): Promise<StaffUser | null> {
  try {
    return (await get<{ staff: StaffUser }>('/staff/me')).staff
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Admin / front desk
// ---------------------------------------------------------------------------

export interface AdminMemberRow {
  user: User
  membership: Membership
  plan: Plan
}

export async function adminListMembers(): Promise<AdminMemberRow[]> {
  return (await get<{ members: AdminMemberRow[] }>('/admin/members')).members
}
export async function adminListAllCheckIns(): Promise<CheckIn[]> {
  return (await get<{ checkIns: CheckIn[] }>('/admin/check-ins')).checkIns
}
export async function adminListAllClassBookings(): Promise<ClassBooking[]> {
  return (await get<{ bookings: ClassBooking[] }>('/admin/bookings')).bookings
}
export async function adminListAllGroupMemberships(): Promise<GroupMembership[]> {
  return (await get<{ groups: GroupMembership[] }>('/admin/groups')).groups
}
export async function adminListDoorScans(): Promise<DoorScan[]> {
  return (await get<{ doorScans: DoorScan[] }>('/admin/door-scans')).doorScans
}
export async function adminExtendMembership(userId: string, days: number): Promise<Membership> {
  return (await post<{ membership: Membership }>(`/admin/members/${userId}/extend`, { days })).membership
}
export async function adminSetFrozen(userId: string, frozen: boolean): Promise<Membership> {
  return (await post<{ membership: Membership }>(`/admin/members/${userId}/frozen`, { frozen })).membership
}
// Staff call these only after collecting payment in person — see
// server/src/routes/admin.ts for why plan changes and reactivation moved
// here instead of staying member self-service.
//
// Both return enough of the pre-change state (or, for plan changes, the
// invoice they just created) for the caller to offer an immediate one-click
// Undo — see adminUndoChangePlan / adminUndoReactivateMembership below.
export async function adminChangePlan(
  userId: string, planId: string, billingCycle: BillingCycle,
): Promise<{ membership: Membership; invoiceId: string }> {
  return await post(`/admin/members/${userId}/plan`, { planId, billingCycle })
}
export async function adminUndoChangePlan(
  userId: string, planId: string, billingCycle: BillingCycle, invoiceId: string,
): Promise<Membership> {
  return (await post<{ membership: Membership }>(`/admin/members/${userId}/plan/undo`, { planId, billingCycle, invoiceId })).membership
}
export async function adminReactivateMembership(userId: string): Promise<Membership> {
  return (await post<{ membership: Membership }>(`/admin/members/${userId}/reactivate`)).membership
}
export interface ReactivateSnapshot {
  status: MembershipStatus
  autoRenew: boolean
  renewalDate: string
}
export async function adminUndoReactivateMembership(userId: string, snapshot: ReactivateSnapshot): Promise<Membership> {
  return (await post<{ membership: Membership }>(`/admin/members/${userId}/reactivate/undo`, snapshot)).membership
}

export interface NewActivityInput {
  kind: Activity['kind']
  name: string
  category: string
  instructor: string
  location: string
  locationId: string
  level: Activity['level']
  description: string
  capacity: number
  color: string
  schedule: Activity['schedule']
}

export async function adminCreateActivity(input: NewActivityInput): Promise<Activity> {
  return (await post<{ activity: Activity }>('/admin/activities', input)).activity
}
export async function adminDeleteActivity(activityId: string): Promise<{ notified: number }> {
  return del<{ notified: number }>(`/admin/activities/${activityId}`)
}

export interface ScanOutcome {
  scan: DoorScan
  user: User
  membership: Membership
  plan: Plan
  daysLeft?: number
}

/** The camera path — the server verifies the signature and decides. */
export async function adminRecordScanByToken(token: string, locationId: string): Promise<ScanOutcome> {
  return post<ScanOutcome>('/admin/scan', { token, locationId })
}

export async function adminListPinUnlocks(): Promise<PinUnlock[]> {
  return (await get<{ pinUnlocks: PinUnlock[] }>('/admin/pin-unlocks')).pinUnlocks
}
export async function adminPinAllowance(userId: string): Promise<PinAllowance> {
  return (await get<{ allowance: PinAllowance }>(`/admin/members/${userId}/pin-allowance`)).allowance
}
export async function adminOpenPinUnlock(
  userId: string, locationId: string, override = false,
): Promise<PinUnlock> {
  return (await post<{ unlock: PinUnlock }>('/admin/pin-unlocks', { userId, locationId, override })).unlock
}
export async function adminCancelPinUnlock(unlockId: string): Promise<void> {
  await post(`/admin/pin-unlocks/${unlockId}/cancel`)
}

export type PinAttemptResult =
  | { ok: true; scan: DoorScan; user: User; membership: Membership; plan: Plan; unlock: PinUnlock; daysLeft?: number }
  | { ok: false; reason: 'wrong_pin'; unlock: PinUnlock; user: User; scan: DoorScan }

export async function adminAttemptPinUnlock(unlockId: string, pin: string): Promise<PinAttemptResult> {
  return post<PinAttemptResult>(`/admin/pin-unlocks/${unlockId}/attempt`, { pin })
}

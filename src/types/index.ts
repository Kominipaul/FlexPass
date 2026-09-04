// Core domain types for FlexPass.
//
// Shared by the React app and the API server (server/), which imports this
// file directly — so a change to a shape here is a compile error on both
// sides at once rather than a silent drift between them.

export type PlanTier = 'basic' | 'standard' | 'elite'

export interface Plan {
  id: string
  tier: PlanTier
  name: string
  tagline: string
  priceMonthly: number
  priceYearly: number
  color: string // tone token, see src/lib/colors.ts
  popular?: boolean
  classCredits: number | 'unlimited'
  guestPasses: number
  /** false = door access is restricted to the member's home location */
  allLocations: boolean
  perks: string[]
}

/** A physical club the door system and staff dashboard operate at. */
export interface Location {
  id: string
  name: string
  address: string
  /** Human-readable opening hours for the days the club is actually open. */
  hours: string
  /**
   * Days of the week the club is shut (0 = Sunday). A member can't train on
   * a day the doors never opened, so the progression system (lib/progress.ts)
   * takes these out of the week before it decides whether a goal was missed.
   */
  closedDays: number[]
  /** Specific dates (YYYY-MM-DD) the club is shut — public holidays, maintenance. Same rule as closedDays. */
  closedDates: string[]
}

export type BillingCycle = 'monthly' | 'yearly'
export type MembershipStatus = 'active' | 'frozen' | 'cancelled' | 'pending_cancellation'

export interface FreezeRecord {
  id: string
  startDate: string
  endDate: string
  reason: string
}

export interface Membership {
  id: string
  userId: string
  planId: string
  status: MembershipStatus
  billingCycle: BillingCycle
  autoRenew: boolean
  startDate: string // ISO date
  renewalDate: string // ISO date
  homeLocation: string // matches a Location.name
  freezeHistory: FreezeRecord[]
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface UserSecurity {
  twoFactorEnabled: boolean
  /**
   * The member's 4-digit backup PIN. Short on purpose — it has to be
   * memorable — and that's safe here only because a PIN is never a way in
   * by itself: the reader has no keypad until a staff member opens a
   * PinUnlock for one specific member, and the PIN is then checked against
   * that member alone. Nobody is ever *identified* by a PIN, so two members
   * sharing 4-2-8-1 is a non-event.
   */
  checkInPin: string
  /**
   * Always empty on the client.
   *
   * The per-member signing key lives in Postgres and never leaves the
   * server (server/src/domain/tokens.ts). The field stays on the type so
   * the server and client share one User shape; the API's mapper blanks it
   * on every response. Nothing in the app should read it.
   */
  checkInSecret: string
  lastPasswordChange: string
}

export interface User {
  id: string
  name: string
  email: string
  phone: string
  dob: string
  address: string
  memberSince: string
  avatarColor: string
  passwordHash: string
  emergencyContact: EmergencyContact
  security: UserSecurity
}

export type ActivityKind = 'class' | 'group'

export interface ScheduleSlot {
  dayOfWeek: number // 0 = Sunday ... 6 = Saturday
  startTime: string // "HH:mm" 24h
  durationMins: number
}

export interface Activity {
  id: string
  kind: ActivityKind
  name: string
  category: string
  instructor: string
  /** room/studio within the club, e.g. "Studio B" — display only */
  location: string
  /** which club hosts it — matches a Location.id */
  locationId: string
  level: 'All levels' | 'Beginner' | 'Intermediate' | 'Advanced'
  description: string
  capacity: number
  color: string
  schedule: ScheduleSlot[]
}

export type ClassBookingStatus = 'booked' | 'waitlisted' | 'cancelled' | 'attended' | 'no-show'

export interface ClassBooking {
  id: string
  userId: string
  activityId: string
  date: string // ISO date of the specific occurrence
  status: ClassBookingStatus
  bookedAt: string
}

export type GroupMembershipStatus = 'active' | 'left'

export interface GroupMembership {
  id: string
  userId: string
  activityId: string
  joinedAt: string
  status: GroupMembershipStatus
}

/**
 * How a visit was actually let through the door. There are exactly two ways
 * in — the member's rotating QR, or their backup PIN — and a PIN only ever
 * works inside a window a staff member opened for that one person (see
 * PinUnlock). There is deliberately no "front desk logged it for them" and
 * no self-service "log a visit": a check-in record always means the door
 * verified somebody.
 */
export type CheckInMethod = 'QR' | 'PIN'

export interface CheckIn {
  id: string
  userId: string
  timestamp: string // ISO datetime
  location: string // matches a Location.name
  method: CheckInMethod
  durationMins?: number
}

export type InvoiceStatus = 'paid' | 'due' | 'failed' | 'refunded'

export interface Invoice {
  id: string
  userId: string
  date: string
  description: string
  amount: number
  status: InvoiceStatus
  method: string
}

export interface PaymentMethod {
  id: string
  userId: string
  brand: 'Visa' | 'Mastercard' | 'Amex'
  last4: string
  expMonth: number
  expYear: number
  isDefault: boolean
  nameOnCard: string
}

export type NotificationType =
  | 'renewal'
  | 'class'
  | 'billing'
  | 'security'
  | 'achievement'
  | 'general'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
}

// Session token stored while a login is pending 2FA verification.
export interface PendingAuth {
  userId: string
  email: string
  code: string
  expiresAt: string
  remember: boolean
}

// ---------------------------------------------------------------------------
// Staff / front-desk — a fully separate identity from members. Staff sign in
// at /admin/login with their own account and never see the member app.
// ---------------------------------------------------------------------------

export type StaffRole = 'frontdesk' | 'manager'

export interface StaffUser {
  id: string
  name: string
  email: string
  passwordHash: string
  role: StaffRole
  avatarColor: string
}

export type DoorScanResult = 'granted' | 'denied'

export type DoorReasonCode =
  | 'expired'
  | 'frozen'
  | 'cancelled'
  | 'wrong_location'
  | 'expiring_soon'
  | 'active'
  /** Signature didn't verify — malformed, forged, or not a FlexPass code at all. */
  | 'code_invalid'
  /** Signature verified, but the token's rotation window has passed (stale/replayed). */
  | 'code_expired'
  /** A wrong digit on a staff-opened PIN window — logged so a member being probed is visible in the door log. */
  | 'pin_incorrect'

export interface DoorScan {
  id: string
  userId: string
  locationId: string
  timestamp: string
  result: DoorScanResult
  reasonCode: DoorReasonCode
  method: CheckInMethod
}

// ---------------------------------------------------------------------------
// PIN unlocks — the backup way in
// ---------------------------------------------------------------------------

export type PinUnlockStatus = 'open' | 'used' | 'locked' | 'expired' | 'cancelled'

/**
 * A staff-opened window in which one named member may type their PIN.
 *
 * This is what makes a 4-digit PIN safe at any member count. The keypad is
 * not on the reader; a member without their phone has to ask the desk, the
 * staffer finds *them* in the member list and opens a window against their
 * user id, and the PIN typed afterwards is only ever compared to that one
 * member's PIN. So the PIN identifies nobody, collisions between members
 * are meaningless, three wrong tries burns the window, and a PIN overheard
 * by somebody else is useless without a staffer opening a window for them
 * by name first.
 */
export interface PinUnlock {
  id: string
  /** The one member this window is for. */
  userId: string
  locationId: string
  /** Which staff member opened it — every backup entry has a name against it. */
  staffId: string
  openedAt: string
  expiresAt: string
  /** Wrong digits left before the window burns. Starts at PIN_MAX_ATTEMPTS. */
  attemptsLeft: number
  /** True when the staffer opened it despite the member being over their 30-day allowance. */
  override: boolean
  status: PinUnlockStatus
}

// ---------------------------------------------------------------------------
// Progression — the member's own training goal
// ---------------------------------------------------------------------------

/**
 * A goal the member sets for themselves: how many days a week they intend
 * to train. Everything the Progress page shows — streak, week grid, badges
 * — is derived from this plus their check-ins, and `enabled: false` turns
 * the whole thing off for members who just don't care about it.
 */
export interface TrainingGoal {
  userId: string
  /** Target training days per week (1-7). */
  daysPerWeek: number
  /** Days the member has claimed as rest (0 = Sunday) — shown in the week strip, never counted as a miss. */
  restDays: number[]
  /** false = member opted out; the Progress page collapses to a plain visit history. */
  enabled: boolean
  startedAt: string
}

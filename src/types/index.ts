// Core domain types for the FlexPass member portal demo.
// This is a client-side demo: all data is generated/mocked and persisted
// to localStorage via src/lib/db.ts — there is no real backend yet.

export type PlanTier = 'basic' | 'standard' | 'elite'

export interface Plan {
  id: string
  tier: PlanTier
  name: string
  tagline: string
  priceMonthly: number
  priceYearly: number
  color: string // tailwind gradient token used on plan cards
  popular?: boolean
  classCredits: number | 'unlimited'
  guestPasses: number
  perks: string[]
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
  homeLocation: string
  freezeHistory: FreezeRecord[]
}

export interface EmergencyContact {
  name: string
  phone: string
  relationship: string
}

export interface UserSecurity {
  twoFactorEnabled: boolean
  checkInPin: string // 4-digit PIN used at the gym kiosk / turnstile
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
  location: string
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

export type CheckInMethod = 'QR' | 'PIN' | 'Manual'

export interface CheckIn {
  id: string
  userId: string
  timestamp: string // ISO datetime
  location: string
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

/**
 * snake_case rows -> the camelCase domain shapes in src/types.
 *
 * Every read goes through here, which is also the chokepoint that keeps
 * `check_in_secret` and `password_hash` off the wire: toUser() simply has
 * no field for them.
 */
import type {
  Activity, AppNotification, CheckIn, ClassBooking, DoorScan, GroupMembership,
  Invoice, Location, Membership, PaymentMethod, PinUnlock, Plan, StaffUser,
  TrainingGoal, User,
} from '../../src/types/index.ts'
import { iso } from './db.ts'

/**
 * The member as the client is allowed to see them. `passwordHash` is kept in
 * the type for compatibility with the existing frontend types but is always
 * blanked, and `checkInSecret` is likewise never populated — the client has
 * no use for either now that signing happens on the server.
 */
export function toUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone ?? '',
    dob: r.dob ?? '',
    address: r.address ?? '',
    memberSince: iso(r.member_since),
    avatarColor: r.avatar_color,
    passwordHash: '',
    emergencyContact: r.emergency_contact ?? { name: '', phone: '', relationship: '' },
    security: {
      twoFactorEnabled: r.two_factor_enabled,
      checkInPin: r.check_in_pin,
      checkInSecret: '',
      lastPasswordChange: iso(r.last_password_change),
    },
  }
}

/** Staff as seen by the staff app — password hash blanked the same way. */
export function toStaff(r: any): StaffUser {
  return { id: r.id, name: r.name, email: r.email, passwordHash: '', role: r.role, avatarColor: r.avatar_color }
}

export function toLocation(r: any): Location {
  return {
    id: r.id, name: r.name, address: r.address, hours: r.hours,
    closedDays: r.closed_days ?? [], closedDates: r.closed_dates ?? [],
  }
}

export function toPlan(r: any): Plan {
  return {
    id: r.id, tier: r.tier, name: r.name, tagline: r.tagline,
    priceMonthly: Number(r.price_monthly), priceYearly: Number(r.price_yearly),
    color: r.color, popular: r.popular || undefined,
    classCredits: r.class_credits === null ? 'unlimited' : r.class_credits,
    guestPasses: r.guest_passes, allLocations: r.all_locations, perks: r.perks ?? [],
  }
}

export function toMembership(r: any): Membership {
  return {
    id: r.id, userId: r.user_id, planId: r.plan_id, status: r.status,
    billingCycle: r.billing_cycle, autoRenew: r.auto_renew,
    startDate: iso(r.start_date), renewalDate: iso(r.renewal_date),
    homeLocation: r.home_location, freezeHistory: r.freeze_history ?? [],
  }
}

export function toActivity(r: any): Activity {
  return {
    id: r.id, kind: r.kind, name: r.name, category: r.category, instructor: r.instructor,
    location: r.location, locationId: r.location_id, level: r.level,
    description: r.description, capacity: r.capacity, color: r.color, schedule: r.schedule ?? [],
  }
}

export function toClassBooking(r: any): ClassBooking {
  return { id: r.id, userId: r.user_id, activityId: r.activity_id, date: iso(r.date), status: r.status, bookedAt: iso(r.booked_at) }
}

export function toGroupMembership(r: any): GroupMembership {
  return { id: r.id, userId: r.user_id, activityId: r.activity_id, joinedAt: iso(r.joined_at), status: r.status }
}

export function toCheckIn(r: any): CheckIn {
  return { id: r.id, userId: r.user_id, timestamp: iso(r.timestamp), location: r.location, method: r.method, durationMins: r.duration_mins ?? undefined }
}

export function toInvoice(r: any): Invoice {
  return { id: r.id, userId: r.user_id, date: iso(r.date), description: r.description, amount: Number(r.amount), status: r.status, method: r.method }
}

export function toPaymentMethod(r: any): PaymentMethod {
  return { id: r.id, userId: r.user_id, brand: r.brand, last4: r.last4, expMonth: r.exp_month, expYear: r.exp_year, isDefault: r.is_default, nameOnCard: r.name_on_card }
}

export function toNotification(r: any): AppNotification {
  return { id: r.id, userId: r.user_id, type: r.type, title: r.title, message: r.message, createdAt: iso(r.created_at), read: r.read }
}

export function toDoorScan(r: any): DoorScan {
  return { id: r.id, userId: r.user_id ?? '', locationId: r.location_id, timestamp: iso(r.timestamp), result: r.result, reasonCode: r.reason_code, method: r.method }
}

export function toPinUnlock(r: any): PinUnlock {
  return {
    id: r.id, userId: r.user_id, locationId: r.location_id, staffId: r.staff_id,
    openedAt: iso(r.opened_at), expiresAt: iso(r.expires_at),
    attemptsLeft: r.attempts_left, override: r.override, status: r.status,
  }
}

export function toTrainingGoal(r: any): TrainingGoal {
  return { userId: r.user_id, daysPerWeek: r.days_per_week, restDays: r.rest_days ?? [], enabled: r.enabled, startedAt: iso(r.started_at) }
}

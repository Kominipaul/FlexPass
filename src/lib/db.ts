/**
 * Mock "backend" for the FlexPass member portal demo.
 *
 * There is no server yet (see README — the real API will be Go + Postgres),
 * so this module plays that role entirely in the browser: it seeds
 * realistic data on first run, persists everything to localStorage, and
 * exposes an async, slightly-latent API so the UI can be built exactly the
 * way it would be against a real backend. Swap this module out for real
 * `fetch` calls later without touching any component.
 */
import type {
  Activity,
  AppNotification,
  BillingCycle,
  CheckIn,
  CheckInMethod,
  ClassBooking,
  DoorScan,
  EmergencyContact,
  FreezeRecord,
  GroupMembership,
  Invoice,
  Location,
  Membership,
  PaymentMethod,
  Plan,
  StaffUser,
  User,
} from '@/types'
import { storage } from './storage'
import { makeId } from './id'
import { LOCATIONS, PLANS, buildSeed, getLocation, getPlan, mockHash } from './seedData'
import { evaluateAccess } from './access'

const KEYS = {
  seeded: 'seeded_v1',
  users: 'users',
  memberships: 'memberships',
  classBookings: 'classBookings',
  groupMemberships: 'groupMemberships',
  checkIns: 'checkIns',
  invoices: 'invoices',
  paymentMethods: 'paymentMethods',
  notifications: 'notifications',
  activities: 'activities',
  staff: 'staff',
  doorScans: 'doorScans',
} as const

function read<T>(key: string): T[] {
  return storage.get<T[]>(key, [])
}
function write<T>(key: string, items: T[]): void {
  storage.set(key, items)
}

/** Small artificial network delay so loading states in the UI feel real. */
function delay(ms = 300): Promise<void> {
  const jitter = ms + Math.random() * 250
  return new Promise((resolve) => setTimeout(resolve, jitter))
}

export function ensureSeeded(): void {
  if (storage.get(KEYS.seeded, false)) return
  const seed = buildSeed()
  write(KEYS.users, seed.users)
  write(KEYS.memberships, seed.memberships)
  write(KEYS.classBookings, seed.classBookings)
  write(KEYS.groupMemberships, seed.groupMemberships)
  write(KEYS.checkIns, seed.checkIns)
  write(KEYS.invoices, seed.invoices)
  write(KEYS.paymentMethods, seed.paymentMethods)
  write(KEYS.notifications, seed.notifications)
  write(KEYS.activities, seed.activities)
  write(KEYS.staff, seed.staff)
  write(KEYS.doorScans, seed.doorScans)
  storage.set(KEYS.seeded, true)
}

export function resetDemoData(): void {
  storage.clearAll()
  ensureSeeded()
}

class ApiError extends Error {}

// ---------------------------------------------------------------------------
// Plans & Locations (static reference data) & Activities (live collection —
// seeded from a template, but staff can add/cancel classes at runtime)
// ---------------------------------------------------------------------------

export async function listPlans(): Promise<Plan[]> {
  await delay(150)
  return PLANS
}

export async function listLocations(): Promise<Location[]> {
  await delay(100)
  return LOCATIONS
}

export async function listActivities(): Promise<Activity[]> {
  await delay(250)
  return read<Activity>(KEYS.activities)
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
  await delay(450)
  const activity: Activity = { id: makeId('act'), ...input }
  const activities = read<Activity>(KEYS.activities)
  activities.push(activity)
  write(KEYS.activities, activities)
  return activity
}

/** Cancels a class/group entirely — cancels its bookings, ends its group memberships, and notifies everyone affected. */
export async function adminDeleteActivity(activityId: string): Promise<{ notified: number }> {
  await delay(450)
  const activities = read<Activity>(KEYS.activities)
  const activity = activities.find((a) => a.id === activityId)
  if (!activity) throw new ApiError('Class not found.')
  write(
    KEYS.activities,
    activities.filter((a) => a.id !== activityId),
  )

  const affected = new Set<string>()

  const bookings = read<ClassBooking>(KEYS.classBookings)
  write(
    KEYS.classBookings,
    bookings.map((b) => {
      if (b.activityId !== activityId || (b.status !== 'booked' && b.status !== 'waitlisted')) return b
      affected.add(b.userId)
      return { ...b, status: 'cancelled' as const }
    }),
  )

  const groups = read<GroupMembership>(KEYS.groupMemberships)
  write(
    KEYS.groupMemberships,
    groups.map((g) => {
      if (g.activityId !== activityId || g.status !== 'active') return g
      affected.add(g.userId)
      return { ...g, status: 'left' as const }
    }),
  )

  for (const userId of affected) {
    await pushNotification(userId, {
      type: 'class',
      title: `${activity.name} was cancelled`,
      message: `${activity.name} with ${activity.instructor} has been removed from the schedule. Any bookings or group membership were cleared automatically.`,
    })
  }

  return { notified: affected.size }
}

// ---------------------------------------------------------------------------
// Users / Auth
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<User | undefined> {
  await delay(50)
  const users = read<User>(KEYS.users)
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
}

export async function getUser(userId: string): Promise<User | undefined> {
  await delay(50)
  return read<User>(KEYS.users).find((u) => u.id === userId)
}

export interface SignupInput {
  name: string
  email: string
  phone: string
  password: string
  planId: string
  billingCycle: BillingCycle
}

export async function signup(input: SignupInput): Promise<User> {
  await delay(500)
  const users = read<User>(KEYS.users)
  if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw new ApiError('An account with this email already exists.')
  }
  const plan = getPlan(input.planId)
  if (!plan) throw new ApiError('Select a plan to continue.')

  const now = new Date()
  const user: User = {
    id: makeId('u'),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    dob: '',
    address: '',
    memberSince: now.toISOString(),
    avatarColor: pickAvatarColor(users.length),
    passwordHash: mockHash(input.password),
    emergencyContact: { name: '', phone: '', relationship: '' },
    security: {
      twoFactorEnabled: false,
      checkInPin: String(1000 + Math.floor(Math.random() * 9000)),
      lastPasswordChange: now.toISOString(),
    },
  }
  users.push(user)
  write(KEYS.users, users)

  const renewal = new Date(now)
  renewal.setDate(renewal.getDate() + (input.billingCycle === 'yearly' ? 365 : 30))
  const membership: Membership = {
    id: makeId('mem'),
    userId: user.id,
    planId: plan.id,
    status: 'active',
    billingCycle: input.billingCycle,
    autoRenew: true,
    startDate: now.toISOString(),
    renewalDate: renewal.toISOString(),
    homeLocation: LOCATIONS[0].name,
    freezeHistory: [],
  }
  const memberships = read<Membership>(KEYS.memberships)
  memberships.push(membership)
  write(KEYS.memberships, memberships)

  const price = input.billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const invoices = read<Invoice>(KEYS.invoices)
  invoices.push({
    id: makeId('inv'),
    userId: user.id,
    date: now.toISOString(),
    description: `${plan.name} plan — ${input.billingCycle} membership`,
    amount: price,
    status: 'due',
    method: 'No payment method on file',
  })
  write(KEYS.invoices, invoices)

  const notifications = read<AppNotification>(KEYS.notifications)
  notifications.push({
    id: makeId('ntf'),
    userId: user.id,
    type: 'general',
    title: `Welcome to FlexPass, ${user.name.split(' ')[0]}!`,
    message: `Your ${plan.name} membership is active. Add a payment method in Billing to cover your first invoice.`,
    createdAt: now.toISOString(),
    read: false,
  })
  write(KEYS.notifications, notifications)

  return user
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  await delay(400)
  return user.passwordHash === mockHash(password)
}

export function generateLoginCode(): string {
  return String(100000 + Math.floor(Math.random() * 900000))
}

/**
 * Returns a fresh reset code if an account exists for this email, or null
 * otherwise. Callers should show the same "if this account exists…"
 * copy either way — only the demo-mode code banner differs.
 */
export async function requestPasswordResetCode(email: string): Promise<string | null> {
  await delay(450)
  const found = await findUserByEmail(email)
  return found ? generateLoginCode() : null
}

export async function resetPassword(email: string, newPassword: string): Promise<void> {
  await delay(450)
  const users = read<User>(KEYS.users)
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (idx === -1) throw new ApiError('Account not found.')
  users[idx] = {
    ...users[idx],
    passwordHash: mockHash(newPassword),
    security: { ...users[idx].security, lastPasswordChange: new Date().toISOString() },
  }
  write(KEYS.users, users)
  await pushNotification(users[idx].id, {
    type: 'security',
    title: 'Password reset',
    message: 'Your password was reset via the forgot-password flow. If this was not you, contact support.',
  })
}

export interface ProfileUpdate {
  name: string
  phone: string
  dob: string
  address: string
  emergencyContact: EmergencyContact
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<User> {
  await delay(400)
  const users = read<User>(KEYS.users)
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) throw new ApiError('User not found.')
  users[idx] = { ...users[idx], ...patch }
  write(KEYS.users, users)
  return users[idx]
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await delay(450)
  const users = read<User>(KEYS.users)
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) throw new ApiError('User not found.')
  if (users[idx].passwordHash !== mockHash(currentPassword)) {
    throw new ApiError('Current password is incorrect.')
  }
  users[idx] = {
    ...users[idx],
    passwordHash: mockHash(newPassword),
    security: { ...users[idx].security, lastPasswordChange: new Date().toISOString() },
  }
  write(KEYS.users, users)
  await pushNotification(userId, {
    type: 'security',
    title: 'Password changed',
    message: 'Your password was changed successfully. If this was not you, contact support immediately.',
  })
}

export async function setTwoFactorEnabled(userId: string, enabled: boolean): Promise<User> {
  await delay(350)
  const users = read<User>(KEYS.users)
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) throw new ApiError('User not found.')
  users[idx] = { ...users[idx], security: { ...users[idx].security, twoFactorEnabled: enabled } }
  write(KEYS.users, users)
  await pushNotification(userId, {
    type: 'security',
    title: enabled ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
    message: enabled
      ? 'A secure sign-in code will now be required every time you log in.'
      : 'Secure sign-in codes are no longer required at login.',
  })
  return users[idx]
}

export async function regenerateCheckInPin(userId: string): Promise<string> {
  await delay(350)
  const users = read<User>(KEYS.users)
  const idx = users.findIndex((u) => u.id === userId)
  if (idx === -1) throw new ApiError('User not found.')
  const pin = String(1000 + Math.floor(Math.random() * 9000))
  users[idx] = { ...users[idx], security: { ...users[idx].security, checkInPin: pin } }
  write(KEYS.users, users)
  return pin
}

export async function deleteAccount(userId: string): Promise<void> {
  await delay(500)
  write(KEYS.users, read<User>(KEYS.users).filter((u) => u.id !== userId))
  write(KEYS.memberships, read<Membership>(KEYS.memberships).filter((m) => m.userId !== userId))
  write(KEYS.classBookings, read<ClassBooking>(KEYS.classBookings).filter((b) => b.userId !== userId))
  write(KEYS.groupMemberships, read<GroupMembership>(KEYS.groupMemberships).filter((g) => g.userId !== userId))
  write(KEYS.checkIns, read<CheckIn>(KEYS.checkIns).filter((c) => c.userId !== userId))
  write(KEYS.invoices, read<Invoice>(KEYS.invoices).filter((i) => i.userId !== userId))
  write(KEYS.paymentMethods, read<PaymentMethod>(KEYS.paymentMethods).filter((p) => p.userId !== userId))
  write(KEYS.notifications, read<AppNotification>(KEYS.notifications).filter((n) => n.userId !== userId))
}

function pickAvatarColor(seedIndex: number): string {
  const palette = ['volt', 'ember', 's1', 's2', 's3', 's4', 's5']
  return palette[seedIndex % palette.length]
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export async function getMembership(userId: string): Promise<Membership | undefined> {
  await delay(200)
  return read<Membership>(KEYS.memberships).find((m) => m.userId === userId)
}

export async function upgradePlan(
  userId: string,
  planId: string,
  billingCycle: BillingCycle,
): Promise<Membership> {
  await delay(600)
  const plan = getPlan(planId)
  if (!plan) throw new ApiError('Plan not found.')
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')

  const previousPlan = getPlan(memberships[idx].planId)
  const now = new Date()
  const renewal = new Date(now)
  renewal.setDate(renewal.getDate() + (billingCycle === 'yearly' ? 365 : 30))

  memberships[idx] = {
    ...memberships[idx],
    planId,
    billingCycle,
    status: 'active',
    renewalDate: renewal.toISOString(),
  }
  write(KEYS.memberships, memberships)

  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const invoices = read<Invoice>(KEYS.invoices)
  invoices.push({
    id: makeId('inv'),
    userId,
    date: now.toISOString(),
    description: `${plan.name} plan — ${billingCycle} membership (prorated change)`,
    amount: price,
    status: 'paid',
    method: 'Default payment method',
  })
  write(KEYS.invoices, invoices)

  const direction =
    previousPlan && plan.priceMonthly > previousPlan.priceMonthly ? 'upgraded' : 'changed'
  await pushNotification(userId, {
    type: 'billing',
    title: `Plan ${direction} to ${plan.name}`,
    message: `You are now on the ${plan.name} plan, billed ${billingCycle}. Your next renewal is ${renewal.toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    )}.`,
  })

  return memberships[idx]
}

export async function setAutoRenew(userId: string, autoRenew: boolean): Promise<Membership> {
  await delay(300)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = { ...memberships[idx], autoRenew }
  write(KEYS.memberships, memberships)
  return memberships[idx]
}

export async function freezeMembership(
  userId: string,
  record: Omit<FreezeRecord, 'id'>,
): Promise<Membership> {
  await delay(500)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = {
    ...memberships[idx],
    status: 'frozen',
    freezeHistory: [...memberships[idx].freezeHistory, { ...record, id: makeId('frz') }],
  }
  write(KEYS.memberships, memberships)
  await pushNotification(userId, {
    type: 'general',
    title: 'Membership frozen',
    message: `Your membership is frozen from ${new Date(record.startDate).toLocaleDateString()} to ${new Date(
      record.endDate,
    ).toLocaleDateString()}. Billing is paused during this time.`,
  })
  return memberships[idx]
}

export async function unfreezeMembership(userId: string): Promise<Membership> {
  await delay(400)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = { ...memberships[idx], status: 'active' }
  write(KEYS.memberships, memberships)
  return memberships[idx]
}

export async function cancelMembership(userId: string, immediate: boolean): Promise<Membership> {
  await delay(500)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = {
    ...memberships[idx],
    status: immediate ? 'cancelled' : 'pending_cancellation',
    autoRenew: false,
  }
  write(KEYS.memberships, memberships)
  await pushNotification(userId, {
    type: 'general',
    title: 'Membership cancellation scheduled',
    message: immediate
      ? 'Your membership has been cancelled effective immediately.'
      : `Your membership will remain active until ${new Date(
          memberships[idx].renewalDate,
        ).toLocaleDateString()}, then it will not renew.`,
  })
  return memberships[idx]
}

export async function reactivateMembership(userId: string): Promise<Membership> {
  await delay(450)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = { ...memberships[idx], status: 'active', autoRenew: true }
  write(KEYS.memberships, memberships)
  return memberships[idx]
}

// ---------------------------------------------------------------------------
// Classes (drop-in bookings) & Groups (ongoing membership)
// ---------------------------------------------------------------------------

export async function listClassBookings(userId: string): Promise<ClassBooking[]> {
  await delay(250)
  return read<ClassBooking>(KEYS.classBookings).filter((b) => b.userId === userId)
}

export async function bookClass(
  userId: string,
  activityId: string,
  date: string,
): Promise<ClassBooking> {
  await delay(500)
  const activity = read<Activity>(KEYS.activities).find((a) => a.id === activityId)
  if (!activity) throw new ApiError('Class not found.')

  const bookings = read<ClassBooking>(KEYS.classBookings)
  if (
    bookings.some(
      (b) =>
        b.userId === userId &&
        b.activityId === activityId &&
        b.date === date &&
        (b.status === 'booked' || b.status === 'waitlisted'),
    )
  ) {
    throw new ApiError("You're already booked into this session.")
  }

  const takenSpots = bookings.filter(
    (b) => b.activityId === activityId && b.date === date && b.status === 'booked',
  ).length
  const status = takenSpots >= activity.capacity ? 'waitlisted' : 'booked'

  const booking: ClassBooking = {
    id: makeId('bk'),
    userId,
    activityId,
    date,
    status,
    bookedAt: new Date().toISOString(),
  }
  bookings.push(booking)
  write(KEYS.classBookings, bookings)

  await pushNotification(userId, {
    type: 'class',
    title: status === 'booked' ? `You're booked: ${activity.name}` : `Waitlisted: ${activity.name}`,
    message:
      status === 'booked'
        ? `See you at ${activity.location} — ${new Date(date).toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}.`
        : `${activity.name} is full. We'll notify you if a spot opens up.`,
  })

  return booking
}

export async function cancelBooking(bookingId: string, userId: string): Promise<void> {
  await delay(350)
  const bookings = read<ClassBooking>(KEYS.classBookings)
  const idx = bookings.findIndex((b) => b.id === bookingId && b.userId === userId)
  if (idx === -1) throw new ApiError('Booking not found.')
  bookings[idx] = { ...bookings[idx], status: 'cancelled' }
  write(KEYS.classBookings, bookings)
}

/** Booked headcount per occurrence date, across all members — used to show real spots-left/waitlist state. */
export async function getBookingCounts(activityId: string): Promise<Record<string, number>> {
  await delay(150)
  const counts: Record<string, number> = {}
  for (const b of read<ClassBooking>(KEYS.classBookings)) {
    if (b.activityId !== activityId || b.status !== 'booked') continue
    counts[b.date] = (counts[b.date] ?? 0) + 1
  }
  return counts
}

/** Active member count for a group, across all members — used to show roster size. */
export async function getGroupRosterSize(activityId: string): Promise<number> {
  await delay(150)
  return read<GroupMembership>(KEYS.groupMemberships).filter(
    (g) => g.activityId === activityId && g.status === 'active',
  ).length
}

export async function listGroupMemberships(userId: string): Promise<GroupMembership[]> {
  await delay(250)
  return read<GroupMembership>(KEYS.groupMemberships).filter((g) => g.userId === userId)
}

export async function joinGroup(userId: string, activityId: string): Promise<GroupMembership> {
  await delay(450)
  const activity = read<Activity>(KEYS.activities).find((a) => a.id === activityId)
  if (!activity) throw new ApiError('Group not found.')

  const groups = read<GroupMembership>(KEYS.groupMemberships)
  const existing = groups.find((g) => g.userId === userId && g.activityId === activityId)
  if (existing && existing.status === 'active') {
    throw new ApiError("You're already a member of this group.")
  }

  let membership: GroupMembership
  if (existing) {
    existing.status = 'active'
    existing.joinedAt = new Date().toISOString()
    membership = existing
  } else {
    membership = {
      id: makeId('gm'),
      userId,
      activityId,
      joinedAt: new Date().toISOString(),
      status: 'active',
    }
    groups.push(membership)
  }
  write(KEYS.groupMemberships, groups)

  await pushNotification(userId, {
    type: 'class',
    title: `You joined ${activity.name}`,
    message: `You're now part of the ${activity.name} group with ${activity.instructor}. Meets weekly at ${activity.location}.`,
  })

  return membership
}

export async function leaveGroup(membershipId: string, userId: string): Promise<void> {
  await delay(350)
  const groups = read<GroupMembership>(KEYS.groupMemberships)
  const idx = groups.findIndex((g) => g.id === membershipId && g.userId === userId)
  if (idx === -1) throw new ApiError('Group membership not found.')
  groups[idx] = { ...groups[idx], status: 'left' }
  write(KEYS.groupMemberships, groups)
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export async function listCheckIns(userId: string): Promise<CheckIn[]> {
  await delay(250)
  return read<CheckIn>(KEYS.checkIns)
    .filter((c) => c.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

export async function checkIn(
  userId: string,
  method: CheckInMethod,
  location: string,
): Promise<CheckIn> {
  await delay(600)
  const entry: CheckIn = {
    id: makeId('chk'),
    userId,
    timestamp: new Date().toISOString(),
    location,
    method,
  }
  const checkIns = read<CheckIn>(KEYS.checkIns)
  checkIns.unshift(entry)
  write(KEYS.checkIns, checkIns)
  return entry
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

export async function listInvoices(userId: string): Promise<Invoice[]> {
  await delay(250)
  return read<Invoice>(KEYS.invoices)
    .filter((i) => i.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function listPaymentMethods(userId: string): Promise<PaymentMethod[]> {
  await delay(200)
  return read<PaymentMethod>(KEYS.paymentMethods).filter((p) => p.userId === userId)
}

export interface AddPaymentMethodInput {
  brand: PaymentMethod['brand']
  last4: string
  expMonth: number
  expYear: number
  nameOnCard: string
}

export async function addPaymentMethod(
  userId: string,
  input: AddPaymentMethodInput,
): Promise<PaymentMethod> {
  await delay(500)
  const methods = read<PaymentMethod>(KEYS.paymentMethods)
  const isFirst = !methods.some((m) => m.userId === userId)
  const method: PaymentMethod = {
    id: makeId('pm'),
    userId,
    isDefault: isFirst,
    ...input,
  }
  methods.push(method)
  write(KEYS.paymentMethods, methods)

  if (isFirst) {
    const invoices = read<Invoice>(KEYS.invoices)
    invoices
      .filter((i) => i.userId === userId && i.status === 'due')
      .forEach((i) => {
        i.status = 'paid'
        i.method = `${method.brand} •••• ${method.last4}`
      })
    write(KEYS.invoices, invoices)
  }

  return method
}

export async function removePaymentMethod(id: string, userId: string): Promise<void> {
  await delay(350)
  const remaining = read<PaymentMethod>(KEYS.paymentMethods).filter(
    (m) => !(m.id === id && m.userId === userId),
  )
  const needsNewDefault = !remaining.some((m) => m.userId === userId && m.isDefault)
  const firstRemainingId = remaining.find((m) => m.userId === userId)?.id
  const methods = needsNewDefault
    ? remaining.map((m) => (m.id === firstRemainingId ? { ...m, isDefault: true } : m))
    : remaining
  write(KEYS.paymentMethods, methods)
}

export async function setDefaultPaymentMethod(id: string, userId: string): Promise<void> {
  await delay(300)
  const methods = read<PaymentMethod>(KEYS.paymentMethods).map((m) =>
    m.userId === userId ? { ...m, isDefault: m.id === id } : m,
  )
  write(KEYS.paymentMethods, methods)
}

export async function payInvoice(invoiceId: string, userId: string): Promise<Invoice> {
  await delay(600)
  const invoices = read<Invoice>(KEYS.invoices)
  const methods = read<PaymentMethod>(KEYS.paymentMethods)
  const method = methods.find((m) => m.userId === userId && m.isDefault)
  if (!method) throw new ApiError('Add a payment method before paying an invoice.')

  const idx = invoices.findIndex((i) => i.id === invoiceId && i.userId === userId)
  if (idx === -1) throw new ApiError('Invoice not found.')
  invoices[idx] = {
    ...invoices[idx],
    status: 'paid',
    method: `${method.brand} •••• ${method.last4}`,
  }
  write(KEYS.invoices, invoices)
  return invoices[idx]
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function listNotifications(userId: string): Promise<AppNotification[]> {
  await delay(200)
  return read<AppNotification>(KEYS.notifications)
    .filter((n) => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

async function pushNotification(
  userId: string,
  input: Omit<AppNotification, 'id' | 'userId' | 'createdAt' | 'read'>,
): Promise<void> {
  const notifications = read<AppNotification>(KEYS.notifications)
  notifications.push({
    id: makeId('ntf'),
    userId,
    createdAt: new Date().toISOString(),
    read: false,
    ...input,
  })
  write(KEYS.notifications, notifications)
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  const notifications = read<AppNotification>(KEYS.notifications).map((n) =>
    n.id === id && n.userId === userId ? { ...n, read: true } : n,
  )
  write(KEYS.notifications, notifications)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifications = read<AppNotification>(KEYS.notifications).map((n) =>
    n.userId === userId ? { ...n, read: true } : n,
  )
  write(KEYS.notifications, notifications)
}

// ---------------------------------------------------------------------------
// Staff — a fully separate identity from members (see StaffAuthContext).
// ---------------------------------------------------------------------------

export async function findStaffByEmail(email: string): Promise<StaffUser | undefined> {
  await delay(50)
  return read<StaffUser>(KEYS.staff).find((s) => s.email.toLowerCase() === email.trim().toLowerCase())
}

export async function getStaffUser(id: string): Promise<StaffUser | undefined> {
  await delay(50)
  return read<StaffUser>(KEYS.staff).find((s) => s.id === id)
}

export async function verifyStaffPassword(staff: StaffUser, password: string): Promise<boolean> {
  await delay(400)
  return staff.passwordHash === mockHash(password)
}

// ---------------------------------------------------------------------------
// Admin — front desk, member management, class management, insights.
// These read/write the same collections as the member app but are never
// scoped to a single userId — only staff screens call these.
// ---------------------------------------------------------------------------

export interface AdminMemberRow {
  user: User
  membership: Membership
  plan: Plan
}

export async function adminListMembers(): Promise<AdminMemberRow[]> {
  await delay(300)
  const users = read<User>(KEYS.users)
  const memberships = read<Membership>(KEYS.memberships)
  const rows: AdminMemberRow[] = []
  for (const membership of memberships) {
    const user = users.find((u) => u.id === membership.userId)
    const plan = getPlan(membership.planId)
    if (user && plan) rows.push({ user, membership, plan })
  }
  return rows.sort((a, b) => a.user.name.localeCompare(b.user.name))
}

export async function adminGetMember(userId: string): Promise<AdminMemberRow | undefined> {
  const rows = await adminListMembers()
  return rows.find((r) => r.user.id === userId)
}

export async function adminExtendMembership(userId: string, days: number): Promise<Membership> {
  await delay(450)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  const renewal = new Date(memberships[idx].renewalDate)
  renewal.setDate(renewal.getDate() + days)
  memberships[idx] = {
    ...memberships[idx],
    renewalDate: renewal.toISOString(),
    status: 'active',
    autoRenew: true,
  }
  write(KEYS.memberships, memberships)
  await pushNotification(userId, {
    type: 'general',
    title: 'Membership extended',
    message: `The front desk added ${days} day${days === 1 ? '' : 's'} to your membership. New renewal date: ${renewal.toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', year: 'numeric' },
    )}.`,
  })
  return memberships[idx]
}

/** Staff quick-toggle — instant, no date range or reason. Distinct from the member's own freezeMembership flow. */
export async function adminSetFrozen(userId: string, frozen: boolean): Promise<Membership> {
  await delay(400)
  const memberships = read<Membership>(KEYS.memberships)
  const idx = memberships.findIndex((m) => m.userId === userId)
  if (idx === -1) throw new ApiError('Membership not found.')
  memberships[idx] = { ...memberships[idx], status: frozen ? 'frozen' : 'active' }
  write(KEYS.memberships, memberships)
  await pushNotification(userId, {
    type: 'general',
    title: frozen ? 'Membership frozen by staff' : 'Membership reactivated by staff',
    message: frozen
      ? 'The front desk froze your membership. Contact the club if this is unexpected.'
      : 'Your membership is active again — door access is restored.',
  })
  return memberships[idx]
}

export async function adminListAllCheckIns(): Promise<CheckIn[]> {
  await delay(250)
  return read<CheckIn>(KEYS.checkIns).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

export async function adminListAllClassBookings(): Promise<ClassBooking[]> {
  await delay(200)
  return read<ClassBooking>(KEYS.classBookings)
}

export async function adminListAllGroupMemberships(): Promise<GroupMembership[]> {
  await delay(200)
  return read<GroupMembership>(KEYS.groupMemberships)
}

export async function adminListDoorScans(): Promise<DoorScan[]> {
  await delay(200)
  return read<DoorScan>(KEYS.doorScans).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )
}

/** The core front-desk action: evaluate a member's access at a location, log the scan, and (if granted) record a real check-in. */
export async function adminRecordScan(
  userId: string,
  locationId: string,
  method: CheckInMethod,
): Promise<{ scan: DoorScan; user: User; membership: Membership }> {
  await delay(650)
  const user = read<User>(KEYS.users).find((u) => u.id === userId)
  const membership = read<Membership>(KEYS.memberships).find((m) => m.userId === userId)
  if (!user || !membership) throw new ApiError('Member not found.')
  const plan = getPlan(membership.planId)
  if (!plan) throw new ApiError('Plan not found.')

  const result = evaluateAccess(membership, plan, locationId)
  const scan: DoorScan = {
    id: makeId('scn'),
    userId,
    locationId,
    timestamp: new Date().toISOString(),
    result: result.ok ? 'granted' : 'denied',
    reasonCode: result.reasonCode,
    method,
  }
  const scans = read<DoorScan>(KEYS.doorScans)
  scans.unshift(scan)
  write(KEYS.doorScans, scans.slice(0, 200))

  if (result.ok) {
    const checkIns = read<CheckIn>(KEYS.checkIns)
    checkIns.unshift({
      id: makeId('chk'),
      userId,
      timestamp: scan.timestamp,
      location: getLocation(locationId)?.name ?? locationId,
      method,
    })
    write(KEYS.checkIns, checkIns)
  }

  return { scan, user, membership }
}

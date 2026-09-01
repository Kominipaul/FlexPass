import type {
  Activity,
  AppNotification,
  CheckIn,
  ClassBooking,
  DoorScan,
  GroupMembership,
  Invoice,
  Location,
  Membership,
  MembershipStatus,
  PaymentMethod,
  Plan,
  StaffUser,
  User,
} from '@/types'
import { makeId } from './id'

// ---------------------------------------------------------------------------
// Locations — the physical clubs the door system and staff dashboard run at
// ---------------------------------------------------------------------------

export const LOCATIONS: Location[] = [
  {
    id: 'downtown',
    name: 'FlexPass Downtown',
    address: '482 Commerce St, Austin, TX',
    hours: '5:00 AM – 11:00 PM',
  },
  {
    id: 'northside',
    name: 'FlexPass Northside',
    address: '1290 Parmer Ln, Austin, TX',
    hours: '6:00 AM – 10:00 PM',
  },
]

export function getLocation(id: string): Location | undefined {
  return LOCATIONS.find((l) => l.id === id)
}

export function locationIdFromName(name: string): string {
  return LOCATIONS.find((l) => l.name === name)?.id ?? LOCATIONS[0].id
}

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export const PLANS: Plan[] = [
  {
    id: 'plan_basic',
    tier: 'basic',
    name: 'Basic',
    tagline: 'Gym floor access at your home club',
    priceMonthly: 29,
    priceYearly: 290,
    color: 'slate',
    allLocations: false,
    classCredits: 2,
    guestPasses: 0,
    perks: [
      'Access to your home location',
      'Standard gym floor & cardio equipment',
      '2 class credits / month',
      'Free fitness assessment',
    ],
  },
  {
    id: 'plan_standard',
    tier: 'standard',
    name: 'Standard',
    tagline: 'Our most popular all-round membership',
    priceMonthly: 59,
    priceYearly: 590,
    color: 'volt',
    popular: true,
    allLocations: true,
    classCredits: 8,
    guestPasses: 1,
    perks: [
      'Access to all FlexPass locations',
      '8 class credits / month (classes & groups)',
      '1 guest pass / month',
      'Sauna & locker room access',
      'Free fitness assessment',
    ],
  },
  {
    id: 'plan_elite',
    tier: 'elite',
    name: 'Elite',
    tagline: 'Unlimited everything, priority booking',
    priceMonthly: 99,
    priceYearly: 990,
    color: 'ember',
    allLocations: true,
    classCredits: 'unlimited',
    guestPasses: 4,
    perks: [
      'Access to all FlexPass locations',
      'Unlimited classes & groups',
      '4 guest passes / month',
      'Priority class booking (24h early)',
      '20% off personal training',
      'Towel service & premium lockers',
    ],
  },
]

export function getPlan(planId: string): Plan | undefined {
  return PLANS.find((p) => p.id === planId)
}

// ---------------------------------------------------------------------------
// Activities — classes (drop-in, booked per occurrence) & groups (ongoing).
// This array only seeds the initial `activities` collection in db.ts — once
// seeded, staff can add/cancel classes and those changes persist there, not
// here. Treat this as a template, not a live source of truth.
// ---------------------------------------------------------------------------

export const ACTIVITIES: Activity[] = [
  {
    id: 'act_spin',
    kind: 'class',
    name: 'Spin Sprint',
    category: 'Spin',
    instructor: 'Jordan Reyes',
    location: 'Studio B',
    locationId: 'downtown',
    level: 'All levels',
    description: 'High-energy indoor cycling with interval sprints and a killer playlist.',
    capacity: 20,
    color: 's1',
    schedule: [
      { dayOfWeek: 1, startTime: '06:30', durationMins: 45 },
      { dayOfWeek: 3, startTime: '06:30', durationMins: 45 },
      { dayOfWeek: 5, startTime: '06:30', durationMins: 45 },
    ],
  },
  {
    id: 'act_hiit',
    kind: 'class',
    name: 'HIIT Circuit',
    category: 'HIIT',
    instructor: 'Marcus Lee',
    location: 'Studio A',
    locationId: 'downtown',
    level: 'Intermediate',
    description: 'Full-body high intensity interval training. Bring a towel — you will need it.',
    capacity: 16,
    color: 'ember',
    schedule: [
      { dayOfWeek: 2, startTime: '17:30', durationMins: 40 },
      { dayOfWeek: 4, startTime: '17:30', durationMins: 40 },
    ],
  },
  {
    id: 'act_yoga',
    kind: 'class',
    name: 'Power Yoga Flow',
    category: 'Yoga',
    instructor: 'Anya Petrova',
    location: 'Studio C',
    locationId: 'northside',
    level: 'All levels',
    description: 'A dynamic, breath-led vinyasa flow to build strength and flexibility.',
    capacity: 24,
    color: 's3',
    schedule: [
      { dayOfWeek: 1, startTime: '19:00', durationMins: 60 },
      { dayOfWeek: 3, startTime: '19:00', durationMins: 60 },
    ],
  },
  {
    id: 'act_boxing',
    kind: 'class',
    name: 'Boxing Fundamentals',
    category: 'Boxing',
    instructor: 'Deshawn Carter',
    location: 'Boxing Room',
    locationId: 'downtown',
    level: 'Beginner',
    description: 'Learn proper form, footwork and combinations on the heavy bag.',
    capacity: 14,
    color: 's2',
    schedule: [
      { dayOfWeek: 2, startTime: '08:00', durationMins: 50 },
      { dayOfWeek: 4, startTime: '08:00', durationMins: 50 },
      { dayOfWeek: 6, startTime: '08:00', durationMins: 50 },
    ],
  },
  {
    id: 'act_zumba',
    kind: 'class',
    name: 'Aqua Zumba',
    category: 'Zumba',
    instructor: 'Lily Nguyen',
    location: 'Pool Deck',
    locationId: 'northside',
    level: 'All levels',
    description: 'Low-impact, high-fun dance cardio in the shallow pool.',
    capacity: 18,
    color: 's5',
    schedule: [{ dayOfWeek: 6, startTime: '10:00', durationMins: 45 }],
  },
  {
    id: 'act_strengthlab',
    kind: 'class',
    name: 'Strength Lab',
    category: 'Strength',
    instructor: 'Omar Haddad',
    location: 'Weight Room',
    locationId: 'downtown',
    level: 'Intermediate',
    description: 'Coached barbell strength session — squat, bench, deadlift progressions.',
    capacity: 12,
    color: 'slate',
    schedule: [
      { dayOfWeek: 1, startTime: '06:00', durationMins: 50 },
      { dayOfWeek: 4, startTime: '06:00', durationMins: 50 },
    ],
  },
  {
    id: 'act_pilates_beg',
    kind: 'group',
    name: 'Pilates Beginners Group',
    category: 'Pilates',
    instructor: 'Sofia Marin',
    location: 'Studio C',
    locationId: 'northside',
    level: 'Beginner',
    description:
      'A friendly, ongoing mat Pilates group focused on core control and posture. Join once, attend every week.',
    capacity: 15,
    color: 'volt',
    schedule: [
      { dayOfWeek: 2, startTime: '09:00', durationMins: 50 },
      { dayOfWeek: 4, startTime: '09:00', durationMins: 50 },
    ],
  },
  {
    id: 'act_pilates_adv',
    kind: 'group',
    name: 'Pilates Advanced Reformer',
    category: 'Pilates',
    instructor: 'Sofia Marin',
    location: 'Reformer Studio',
    locationId: 'northside',
    level: 'Advanced',
    description: 'Reformer-based Pilates group for members who have completed the beginners track.',
    capacity: 10,
    color: 'volt',
    schedule: [
      { dayOfWeek: 1, startTime: '17:00', durationMins: 55 },
      { dayOfWeek: 3, startTime: '17:00', durationMins: 55 },
      { dayOfWeek: 5, startTime: '17:00', durationMins: 55 },
    ],
  },
  {
    id: 'act_marathon',
    kind: 'group',
    name: 'Marathon Training Squad',
    category: 'Running',
    instructor: 'Priya Shah',
    location: 'Track & Trail',
    locationId: 'northside',
    level: 'Intermediate',
    description: 'A season-long training group building up to race day, with weekly long runs.',
    capacity: 25,
    color: 's4',
    schedule: [{ dayOfWeek: 6, startTime: '07:00', durationMins: 90 }],
  },
  {
    id: 'act_barbell_club',
    kind: 'group',
    name: 'Beginner Barbell Club',
    category: 'Strength',
    instructor: 'Omar Haddad',
    location: 'Weight Room',
    locationId: 'downtown',
    level: 'Beginner',
    description: 'Small ongoing group learning barbell fundamentals together, week over week.',
    capacity: 12,
    color: 'slate',
    schedule: [{ dayOfWeek: 3, startTime: '18:30', durationMins: 60 }],
  },
]

// ---------------------------------------------------------------------------
// Staff — separate identity from members entirely, see StaffAuthContext.
// ---------------------------------------------------------------------------

export const STAFF_SEED: StaffUser[] = [
  {
    id: 'staff_1',
    name: 'Jordan Casey',
    email: 'staff@flexpass.app',
    passwordHash: mockHash('flexpass123'),
    role: 'manager',
    avatarColor: 'volt',
  },
  {
    id: 'staff_2',
    name: 'Riley Thompson',
    email: 'riley@flexpass.app',
    passwordHash: mockHash('flexpass123'),
    role: 'frontdesk',
    avatarColor: 's1',
  },
]

// ---------------------------------------------------------------------------
// Demo user + everything tied to them
// ---------------------------------------------------------------------------

const DEMO_USER_ID = 'u_demo'

function daysAgoIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function daysFromNowIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export interface SeedBundle {
  users: User[]
  memberships: Membership[]
  classBookings: ClassBooking[]
  groupMemberships: GroupMembership[]
  checkIns: CheckIn[]
  invoices: Invoice[]
  paymentMethods: PaymentMethod[]
  notifications: AppNotification[]
  activities: Activity[]
  staff: StaffUser[]
  doorScans: DoorScan[]
}

export function buildSeed(): SeedBundle {
  const demoUser: User = {
    id: DEMO_USER_ID,
    name: 'Alex Morgan',
    email: 'demo@flexpass.app',
    phone: '(555) 214-7788',
    dob: '1994-06-12',
    address: '482 Maple Grove Ave, Austin, TX',
    memberSince: daysAgoIso(430),
    avatarColor: 'volt',
    // Demo-only mock hash — never do this in a real app. See lib/db.ts.
    passwordHash: mockHash('flexpass123'),
    emergencyContact: {
      name: 'Sam Morgan',
      phone: '(555) 981-2244',
      relationship: 'Sibling',
    },
    security: {
      twoFactorEnabled: true,
      checkInPin: '4821',
      lastPasswordChange: daysAgoIso(96),
    },
  }

  const demoMembership: Membership = {
    id: 'mem_demo',
    userId: DEMO_USER_ID,
    planId: 'plan_standard',
    status: 'active',
    billingCycle: 'monthly',
    autoRenew: true,
    startDate: daysAgoIso(430),
    renewalDate: daysFromNowIso(9),
    homeLocation: LOCATIONS[0].name,
    freezeHistory: [
      {
        id: makeId('frz'),
        startDate: daysAgoIso(210),
        endDate: daysAgoIso(196),
        reason: 'Travel',
      },
    ],
  }

  const groupMemberships: GroupMembership[] = [
    {
      id: makeId('gm'),
      userId: DEMO_USER_ID,
      activityId: 'act_pilates_beg',
      joinedAt: daysAgoIso(140),
      status: 'active',
    },
    {
      id: makeId('gm'),
      userId: DEMO_USER_ID,
      activityId: 'act_marathon',
      joinedAt: daysAgoIso(40),
      status: 'active',
    },
  ]

  // A couple of upcoming drop-in class bookings, computed relative to "now"
  // so they always land on a real upcoming date/time no matter when the
  // demo is opened.
  const classBookings: ClassBooking[] = [
    {
      id: makeId('bk'),
      userId: DEMO_USER_ID,
      activityId: 'act_hiit',
      date: nextWeekdayIso(2, 17, 30, 0),
      status: 'booked',
      bookedAt: daysAgoIso(3),
    },
    {
      id: makeId('bk'),
      userId: DEMO_USER_ID,
      activityId: 'act_yoga',
      date: nextWeekdayIso(3, 19, 0, 0),
      status: 'booked',
      bookedAt: daysAgoIso(1),
    },
    {
      id: makeId('bk'),
      userId: DEMO_USER_ID,
      activityId: 'act_spin',
      date: nextWeekdayIso(5, 6, 30, -7),
      status: 'attended',
      bookedAt: daysAgoIso(10),
    },
    {
      id: makeId('bk'),
      userId: DEMO_USER_ID,
      activityId: 'act_boxing',
      date: nextWeekdayIso(4, 8, 0, -7),
      status: 'attended',
      bookedAt: daysAgoIso(9),
    },
  ]

  const demoCheckIns = buildDemoCheckIns()
  const invoices: Invoice[] = buildInvoices()
  const paymentMethods: PaymentMethod[] = [
    {
      id: makeId('pm'),
      userId: DEMO_USER_ID,
      brand: 'Visa',
      last4: '4242',
      expMonth: 8,
      expYear: new Date().getFullYear() + 2,
      isDefault: true,
      nameOnCard: 'Alex Morgan',
    },
  ]

  const notifications: AppNotification[] = [
    {
      id: makeId('ntf'),
      userId: DEMO_USER_ID,
      type: 'renewal',
      title: 'Membership renews soon',
      message: `Your Standard plan renews on ${new Date(demoMembership.renewalDate).toLocaleDateString(
        'en-US',
        { month: 'short', day: 'numeric' },
      )}. Auto-renew is on, so no action is needed.`,
      createdAt: daysAgoIso(1),
      read: false,
    },
    {
      id: makeId('ntf'),
      userId: DEMO_USER_ID,
      type: 'class',
      title: 'Upcoming class reminder',
      message: 'HIIT Circuit with Marcus Lee is coming up — bring a towel and water bottle.',
      createdAt: daysAgoIso(0),
      read: false,
    },
    {
      id: makeId('ntf'),
      userId: DEMO_USER_ID,
      type: 'achievement',
      title: '5-visit streak! 🔥',
      message: "You've checked in 5 times this month. Keep the streak alive.",
      createdAt: daysAgoIso(4),
      read: true,
    },
    {
      id: makeId('ntf'),
      userId: DEMO_USER_ID,
      type: 'billing',
      title: 'Payment received',
      message: 'We received your monthly payment of $59.00. Thanks!',
      createdAt: daysAgoIso(18),
      read: true,
    },
    {
      id: makeId('ntf'),
      userId: DEMO_USER_ID,
      type: 'security',
      title: 'Two-factor authentication enabled',
      message: 'Secure sign-in codes are now required whenever you log in.',
      createdAt: daysAgoIso(96),
      read: true,
    },
  ]

  // ---- The rest of the roster — visible to staff only, gives the Admin
  // side (member table, scanner, insights) real variety to work with.
  const roster = buildMemberRoster()

  const doorScans = buildDoorScans()

  return {
    users: [demoUser, ...roster.users],
    memberships: [demoMembership, ...roster.memberships],
    classBookings,
    groupMemberships,
    checkIns: [...demoCheckIns, ...roster.checkIns],
    invoices,
    paymentMethods,
    notifications,
    activities: ACTIVITIES,
    staff: STAFF_SEED,
    doorScans,
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

/** Extremely small, NON-cryptographic string hash for demo "password" storage only. */
export function mockHash(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return `h${Math.abs(hash)}`
}

/** Next given weekday (0=Sun) at hour:minute, optionally offset by extra days (can be negative for "past"). */
function nextWeekdayIso(dayOfWeek: number, hour: number, minute: number, extraDayOffset = 0): string {
  const d = new Date()
  const currentDay = d.getDay()
  let diff = dayOfWeek - currentDay
  if (extraDayOffset >= 0 && diff < 0) diff += 7
  d.setDate(d.getDate() + diff + extraDayOffset)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

function buildDemoCheckIns(): CheckIn[] {
  const locations = LOCATIONS.map((l) => l.name)
  const methods: CheckIn['method'][] = ['QR', 'PIN', 'QR', 'QR']
  const checkIns: CheckIn[] = []
  // Roughly 3-4 visits per week over the last 8 weeks, skipping some days for realism.
  for (let week = 0; week < 8; week++) {
    const visitsThisWeek = 3 + (week % 2)
    for (let v = 0; v < visitsThisWeek; v++) {
      const dayOffset = week * 7 + v * 2 + (week % 2)
      const d = new Date()
      d.setDate(d.getDate() - dayOffset)
      d.setHours(6 + ((v * 3) % 14), (v * 17) % 60, 0, 0)
      if (d.getTime() > Date.now()) continue
      checkIns.push({
        id: makeId('chk'),
        userId: DEMO_USER_ID,
        timestamp: d.toISOString(),
        location: locations[v % locations.length],
        method: methods[v % methods.length],
        durationMins: 40 + ((v * 13) % 50),
      })
    }
  }
  return checkIns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function buildInvoices(): Invoice[] {
  const invoices: Invoice[] = []
  for (let i = 6; i >= 1; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    d.setDate(3)
    invoices.push({
      id: makeId('inv'),
      userId: DEMO_USER_ID,
      date: d.toISOString(),
      description: 'Standard plan — monthly membership',
      amount: 59,
      status: 'paid',
      method: 'Visa •••• 4242',
    })
  }
  return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

interface RosterSpec {
  id: string
  name: string
  email: string
  planId: string
  locationIdx: 0 | 1
  status: MembershipStatus
  daysLeft: number
  memberSinceDays: number
  visits: number
  avatarColor: string
}

// A dozen supporting members — deliberately spans every state the staff
// dashboard needs to demonstrate (expiring soon, frozen, lapsed, cancelled).
const ROSTER_SPECS: RosterSpec[] = [
  { id: 'u_1042', name: 'Jordan Ellis', email: 'jordan.ellis@example.com', planId: 'plan_standard', locationIdx: 0, status: 'active', daysLeft: 22, memberSinceDays: 380, visits: 6, avatarColor: 's1' },
  { id: 'u_1108', name: 'Priya Nair', email: 'priya.nair@example.com', planId: 'plan_elite', locationIdx: 1, status: 'active', daysLeft: 15, memberSinceDays: 210, visits: 9, avatarColor: 'ember' },
  { id: 'u_1233', name: 'Marcus Webb', email: 'marcus.webb@example.com', planId: 'plan_basic', locationIdx: 0, status: 'active', daysLeft: 3, memberSinceDays: 40, visits: 3, avatarColor: 's2' },
  { id: 'u_1290', name: 'Devon Cruz', email: 'devon.cruz@example.com', planId: 'plan_standard', locationIdx: 1, status: 'frozen', daysLeft: 60, memberSinceDays: 300, visits: 2, avatarColor: 'froze' },
  { id: 'u_1355', name: 'Harper Wu', email: 'harper.wu@example.com', planId: 'plan_elite', locationIdx: 0, status: 'active', daysLeft: 210, memberSinceDays: 640, visits: 12, avatarColor: 's3' },
  { id: 'u_1401', name: 'Elena Vasquez', email: 'elena.vasquez@example.com', planId: 'plan_basic', locationIdx: 0, status: 'active', daysLeft: -6, memberSinceDays: 500, visits: 1, avatarColor: 'bad' },
  { id: 'u_1477', name: 'Miles Okafor', email: 'miles.okafor@example.com', planId: 'plan_standard', locationIdx: 0, status: 'active', daysLeft: 45, memberSinceDays: 150, visits: 5, avatarColor: 's5' },
  { id: 'u_1512', name: 'Ruby Chen', email: 'ruby.chen@example.com', planId: 'plan_elite', locationIdx: 1, status: 'active', daysLeft: 5, memberSinceDays: 90, visits: 8, avatarColor: 's4' },
  { id: 'u_1566', name: 'Tobias Grant', email: 'tobias.grant@example.com', planId: 'plan_basic', locationIdx: 1, status: 'active', daysLeft: 60, memberSinceDays: 60, visits: 4, avatarColor: 'good' },
  { id: 'u_1604', name: 'Naomi Torres', email: 'naomi.torres@example.com', planId: 'plan_standard', locationIdx: 0, status: 'pending_cancellation', daysLeft: 12, memberSinceDays: 260, visits: 3, avatarColor: 'warn' },
  { id: 'u_1688', name: 'Sasha Kim', email: 'sasha.kim@example.com', planId: 'plan_elite', locationIdx: 0, status: 'cancelled', daysLeft: -20, memberSinceDays: 700, visits: 0, avatarColor: 'slate' },
]

function buildMemberRoster(): { users: User[]; memberships: Membership[]; checkIns: CheckIn[] } {
  const users: User[] = []
  const memberships: Membership[] = []
  const checkIns: CheckIn[] = []

  for (const spec of ROSTER_SPECS) {
    users.push({
      id: spec.id,
      name: spec.name,
      email: spec.email,
      phone: '(555) 010-' + spec.id.slice(-4),
      dob: '',
      address: '',
      memberSince: daysAgoIso(spec.memberSinceDays),
      avatarColor: spec.avatarColor,
      passwordHash: mockHash('member123'),
      emergencyContact: { name: '', phone: '', relationship: '' },
      security: {
        twoFactorEnabled: false,
        checkInPin: String(1000 + Math.floor(Math.random() * 9000)),
        lastPasswordChange: daysAgoIso(spec.memberSinceDays),
      },
    })

    memberships.push({
      id: 'mem_' + spec.id,
      userId: spec.id,
      planId: spec.planId,
      status: spec.status,
      billingCycle: 'monthly',
      autoRenew: spec.status === 'active',
      startDate: daysAgoIso(spec.memberSinceDays),
      renewalDate: daysFromNowIso(spec.daysLeft),
      homeLocation: LOCATIONS[spec.locationIdx].name,
      freezeHistory: [],
    })

    checkIns.push(...buildRecentCheckIns(spec.id, LOCATIONS[spec.locationIdx].name, spec.visits))
  }

  return { users, memberships, checkIns }
}

function buildRecentCheckIns(userId: string, location: string, count: number): CheckIn[] {
  const methods: CheckIn['method'][] = ['QR', 'QR', 'PIN', 'QR', 'Manual']
  const checkIns: CheckIn[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (i * 2 + (i % 3)))
    d.setHours(6 + ((i * 5) % 15), (i * 23) % 60, 0, 0)
    if (d.getTime() > Date.now()) continue
    checkIns.push({
      id: makeId('chk'),
      userId,
      timestamp: d.toISOString(),
      location,
      method: methods[i % methods.length],
      durationMins: 35 + ((i * 11) % 55),
    })
  }
  return checkIns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

function buildDoorScans(): DoorScan[] {
  const todayAt = (hour: number, minute: number) => {
    const d = new Date()
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  return [
    { id: makeId('scn'), userId: 'u_1477', locationId: 'downtown', timestamp: todayAt(9, 40), result: 'granted', reasonCode: 'active', method: 'QR' },
    { id: makeId('scn'), userId: 'u_1233', locationId: 'downtown', timestamp: todayAt(8, 55), result: 'granted', reasonCode: 'expiring_soon', method: 'QR' },
    { id: makeId('scn'), userId: 'u_1401', locationId: 'downtown', timestamp: todayAt(8, 31), result: 'denied', reasonCode: 'expired', method: 'QR' },
    { id: makeId('scn'), userId: 'u_1688', locationId: 'downtown', timestamp: todayAt(8, 2), result: 'denied', reasonCode: 'cancelled', method: 'PIN' },
    { id: makeId('scn'), userId: 'u_1108', locationId: 'downtown', timestamp: todayAt(7, 12), result: 'granted', reasonCode: 'active', method: 'QR' },
    { id: makeId('scn'), userId: 'u_1290', locationId: 'northside', timestamp: todayAt(6, 48), result: 'denied', reasonCode: 'frozen', method: 'QR' },
    { id: makeId('scn'), userId: 'u_1512', locationId: 'northside', timestamp: todayAt(6, 20), result: 'granted', reasonCode: 'expiring_soon', method: 'PIN' },
    { id: makeId('scn'), userId: 'u_1566', locationId: 'northside', timestamp: todayAt(5, 58), result: 'granted', reasonCode: 'active', method: 'QR' },
  ]
}

export { DEMO_USER_ID }

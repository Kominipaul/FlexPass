import type {
  Activity,
  AppNotification,
  CheckIn,
  ClassBooking,
  GroupMembership,
  Invoice,
  Membership,
  PaymentMethod,
  Plan,
  User,
} from '@/types'
import { makeId } from './id'

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
    color: 'brand',
    popular: true,
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
    color: 'lime',
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
// Activities — classes (drop-in, booked per occurrence) & groups (ongoing)
// ---------------------------------------------------------------------------

export const ACTIVITIES: Activity[] = [
  {
    id: 'act_spin',
    kind: 'class',
    name: 'Spin Sprint',
    category: 'Spin',
    instructor: 'Jordan Reyes',
    location: 'Studio B',
    level: 'All levels',
    description: 'High-energy indoor cycling with interval sprints and a killer playlist.',
    capacity: 20,
    color: 'rose',
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
    level: 'Intermediate',
    description: 'Full-body high intensity interval training. Bring a towel — you will need it.',
    capacity: 16,
    color: 'orange',
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
    level: 'All levels',
    description: 'A dynamic, breath-led vinyasa flow to build strength and flexibility.',
    capacity: 24,
    color: 'violet',
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
    level: 'Beginner',
    description: 'Learn proper form, footwork and combinations on the heavy bag.',
    capacity: 14,
    color: 'amber',
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
    level: 'All levels',
    description: 'Low-impact, high-fun dance cardio in the shallow pool.',
    capacity: 18,
    color: 'cyan',
    schedule: [{ dayOfWeek: 6, startTime: '10:00', durationMins: 45 }],
  },
  {
    id: 'act_strengthlab',
    kind: 'class',
    name: 'Strength Lab',
    category: 'Strength',
    instructor: 'Omar Haddad',
    location: 'Weight Room',
    level: 'Intermediate',
    description: 'Coached barbell strength session — squat, bench, deadlift progressions.',
    capacity: 12,
    color: 'stone',
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
    level: 'Beginner',
    description:
      'A friendly, ongoing mat Pilates group focused on core control and posture. Join once, attend every week.',
    capacity: 15,
    color: 'brand',
    schedule: [{ dayOfWeek: 2, startTime: '09:00', durationMins: 50 }, { dayOfWeek: 4, startTime: '09:00', durationMins: 50 }],
  },
  {
    id: 'act_pilates_adv',
    kind: 'group',
    name: 'Pilates Advanced Reformer',
    category: 'Pilates',
    instructor: 'Sofia Marin',
    location: 'Reformer Studio',
    level: 'Advanced',
    description: 'Reformer-based Pilates group for members who have completed the beginners track.',
    capacity: 10,
    color: 'brand',
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
    level: 'Intermediate',
    description: 'A season-long training group building up to race day, with weekly long runs.',
    capacity: 25,
    color: 'lime',
    schedule: [{ dayOfWeek: 6, startTime: '07:00', durationMins: 90 }],
  },
  {
    id: 'act_barbell_club',
    kind: 'group',
    name: 'Beginner Barbell Club',
    category: 'Strength',
    instructor: 'Omar Haddad',
    location: 'Weight Room',
    level: 'Beginner',
    description: 'Small ongoing group learning barbell fundamentals together, week over week.',
    capacity: 12,
    color: 'stone',
    schedule: [{ dayOfWeek: 3, startTime: '18:30', durationMins: 60 }],
  },
]

export function getActivity(id: string): Activity | undefined {
  return ACTIVITIES.find((a) => a.id === id)
}

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
    avatarColor: 'brand',
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

  const membership: Membership = {
    id: 'mem_demo',
    userId: DEMO_USER_ID,
    planId: 'plan_standard',
    status: 'active',
    billingCycle: 'monthly',
    autoRenew: true,
    startDate: daysAgoIso(430),
    renewalDate: daysFromNowIso(9),
    homeLocation: 'FlexPass Downtown',
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

  const checkIns: CheckIn[] = buildCheckIns()
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
      message: `Your Standard plan renews on ${new Date(membership.renewalDate).toLocaleDateString(
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

  return {
    users: [demoUser],
    memberships: [membership],
    classBookings,
    groupMemberships,
    checkIns,
    invoices,
    paymentMethods,
    notifications,
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

function buildCheckIns(): CheckIn[] {
  const locations = ['FlexPass Downtown', 'FlexPass Northside']
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

export { DEMO_USER_ID }

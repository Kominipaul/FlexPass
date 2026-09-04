/**
 * Reference data: the clubs, the plans, the class timetable, the staff roster.
 *
 * Single source of truth, imported by BOTH the React app and the API server's
 * seed script (server/src/seed.ts) — so the rows in Postgres and the options
 * the signup form renders can never describe different products.
 *
 * Nothing here is per-member state; that all lives in the database.
 */
import type { Activity, Location, Plan, StaffUser } from '../types'

// ---------------------------------------------------------------------------
// Locations — the physical clubs the door system and staff dashboard run at
// ---------------------------------------------------------------------------

/** A date `n` days back from today as YYYY-MM-DD — used to place demo club closures near the current week. */
function closureDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const LOCATIONS: Location[] = [
  {
    id: 'downtown',
    name: 'FlexPass Downtown',
    address: '482 Commerce St, Austin, TX',
    hours: 'Mon–Sat, 5:00 AM – 11:00 PM',
    closedDays: [0], // closed Sundays
    closedDates: [closureDate(11), closureDate(26)],
  },
  {
    id: 'northside',
    name: 'FlexPass Northside',
    address: '1290 Parmer Ln, Austin, TX',
    hours: 'Every day, 6:00 AM – 10:00 PM',
    closedDays: [],
    closedDates: [closureDate(18)],
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

export type StaffSeed = Omit<StaffUser, 'passwordHash'>

export const STAFF_SEED: StaffSeed[] = [
  {
    id: 'staff_1',
    name: 'Jordan Casey',
    email: 'staff@flexpass.app',
    role: 'manager',
    avatarColor: 'volt',
  },
  {
    id: 'staff_2',
    name: 'Riley Thompson',
    email: 'riley@flexpass.app',
    role: 'frontdesk',
    avatarColor: 's1',
  },
]

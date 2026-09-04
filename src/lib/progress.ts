/**
 * The progression system.
 *
 * A gym streak that counts *consecutive days* is a lie: nobody trains seven
 * days a week, so the number resets every single week and stops meaning
 * anything by Tuesday. So the unit here is a **week against a goal the
 * member set themselves** — "I train 4 days a week" — and the streak counts
 * weeks they hit that goal.
 *
 * Two things keep that fair:
 *
 *  - **Days the club was shut don't count against you.** Sundays at a
 *    six-day club, public holidays, maintenance days — they come out of the
 *    week first, and the week's target is capped at the days that were
 *    actually available. A member aiming for 6 in a week with 5 open days
 *    needs 5, not 6.
 *  - **The current week is never a miss.** It's live until it ends, so it
 *    can only ever add to the streak, never break it.
 *
 * Everything here is pure and derived from check-ins — nothing is stored
 * but the goal itself — and `goal.enabled === false` means the member has
 * opted out and none of it should be shown to them.
 */
import type { CheckIn, Location, TrainingGoal } from '@/types'
import { isoDateOnly } from './format'

export const MIN_GOAL_DAYS = 1
export const MAX_GOAL_DAYS = 7
export const DEFAULT_GOAL_DAYS = 4
/** How many weeks of history the progress page works with. */
export const HISTORY_WEEKS = 12

// ---------------------------------------------------------------------------
// Calendar helpers — weeks run Monday→Sunday
// ---------------------------------------------------------------------------

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** The Monday at or before `date`, at midnight local time. */
export function mondayOf(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function addDaysTo(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Was this club shut on this date — either its weekly closed day, or a one-off closure? */
export function isClosedOn(location: Location | null | undefined, date: Date): boolean {
  if (!location) return false
  if (location.closedDays.includes(date.getDay())) return true
  return location.closedDates.includes(isoDateOnly(date))
}

/** Human phrase for a club's standing closures, e.g. "closed Sundays". Null when it never shuts. */
export function closureSummary(location: Location | null | undefined): string | null {
  if (!location || location.closedDays.length === 0) return null
  const names = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']
  const list = [...location.closedDays].sort().map((d) => names[d])
  if (list.length === 1) return `closed ${list[0]}`
  return `closed ${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`
}

// ---------------------------------------------------------------------------
// Weeks
// ---------------------------------------------------------------------------

export interface DayCell {
  /** YYYY-MM-DD */
  date: string
  dayOfWeek: number
  /** Single-letter column head, e.g. "M". */
  label: string
  dayOfMonth: number
  trained: boolean
  /** The club was shut — this day was never available, and never counts as a miss. */
  closed: boolean
  /** The member nominated this weekday as rest. Informational only. */
  rest: boolean
  isToday: boolean
  isFuture: boolean
}

export interface WeekSummary {
  /** Monday, YYYY-MM-DD. */
  start: string
  /** Sunday, YYYY-MM-DD. */
  end: string
  /** e.g. "Mar 3". */
  label: string
  days: DayCell[]
  /** Distinct days trained this week. */
  trained: number
  /** Days in the week the club was open at all — the ceiling on what the goal can ask for. */
  openDays: number
  /** The goal, capped at what the week physically allowed. */
  target: number
  met: boolean
  isCurrent: boolean
  /** Current week only: open days still to come, today included. */
  openDaysLeft: number
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function distinctTrainingDates(checkIns: CheckIn[]): Set<string> {
  return new Set(checkIns.map((c) => isoDateOnly(new Date(c.timestamp))))
}

/**
 * The last `weeks` Monday→Sunday weeks, oldest first, with the goal scored
 * against each. The final entry is always the week we're currently in.
 */
export function buildWeeks(
  checkIns: CheckIn[],
  goal: Pick<TrainingGoal, 'daysPerWeek' | 'restDays'>,
  location: Location | null | undefined,
  weeks = HISTORY_WEEKS,
): WeekSummary[] {
  const trainedDates = distinctTrainingDates(checkIns)
  const today = startOfDay(new Date())
  const todayKey = isoDateOnly(today)
  const thisMonday = mondayOf(today)

  const out: WeekSummary[] = []
  for (let back = weeks - 1; back >= 0; back--) {
    const monday = addDaysTo(thisMonday, -back * 7)
    const isCurrent = back === 0

    const days: DayCell[] = []
    let trained = 0
    let openDays = 0
    let openDaysLeft = 0

    for (let i = 0; i < 7; i++) {
      const d = addDaysTo(monday, i)
      const key = isoDateOnly(d)
      const closed = isClosedOn(location, d)
      const isFuture = d.getTime() > today.getTime()
      const didTrain = trainedDates.has(key)

      if (didTrain) trained += 1
      if (!closed) openDays += 1
      if (!closed && d.getTime() >= today.getTime()) openDaysLeft += 1

      days.push({
        date: key,
        dayOfWeek: d.getDay(),
        label: DAY_LETTERS[d.getDay()],
        dayOfMonth: d.getDate(),
        trained: didTrain,
        closed,
        rest: goal.restDays.includes(d.getDay()),
        isToday: key === todayKey,
        isFuture,
      })
    }

    // The target is the goal capped by the days the club was open across
    // the *whole* week — counted the same way for a finished week and a live
    // one, so it never creeps upward as the week goes on.
    const target = Math.max(1, Math.min(goal.daysPerWeek, Math.max(openDays, 1)))

    out.push({
      start: isoDateOnly(monday),
      end: isoDateOnly(addDaysTo(monday, 6)),
      label: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      days,
      trained,
      openDays,
      target,
      met: trained >= target,
      isCurrent,
      openDaysLeft,
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export interface StreakSummary {
  /** Consecutive weeks hitting the goal, this week included once it's hit. */
  current: number
  /** The longest such run anywhere in the history window. */
  best: number
  /** Sessions still needed this week. */
  remaining: number
  /** Open days left this week, today included. */
  openDaysLeft: number
  /** The goal is still reachable this week, but only by training every remaining open day. */
  atRisk: boolean
  /** Not enough open days left — this week can't be saved. */
  missed: boolean
  /** Share of completed weeks in the window that hit the goal, 0-1. */
  consistency: number
}

export function summarizeStreak(weeks: WeekSummary[]): StreakSummary {
  const current = weeks[weeks.length - 1]

  // Newest first. The live week can extend a streak but never end one.
  let currentStreak = 0
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i]
    if (w.met) {
      currentStreak += 1
      continue
    }
    if (w.isCurrent) continue // still live
    if (w.openDays === 0) continue // club shut all week — neither hit nor miss
    break
  }

  let best = 0
  let run = 0
  for (const w of weeks) {
    if (w.met) run += 1
    else if (w.isCurrent || w.openDays === 0) continue
    else run = 0
    best = Math.max(best, run)
  }

  const completed = weeks.filter((w) => !w.isCurrent && w.openDays > 0)
  const consistency = completed.length === 0 ? 0 : completed.filter((w) => w.met).length / completed.length

  const remaining = current ? Math.max(0, current.target - current.trained) : 0
  const openDaysLeft = current?.openDaysLeft ?? 0

  return {
    current: currentStreak,
    best: Math.max(best, currentStreak),
    remaining,
    openDaysLeft,
    atRisk: remaining > 0 && remaining === openDaysLeft,
    missed: remaining > 0 && remaining > openDaysLeft,
    consistency,
  }
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export type MilestoneIcon = 'flame' | 'trophy' | 'medal' | 'sunrise' | 'moon' | 'target' | 'zap'

export interface Milestone {
  id: string
  name: string
  description: string
  icon: MilestoneIcon
  /** Progress toward `goal`, in whatever unit the description implies. */
  value: number
  goal: number
  earned: boolean
}

function hourOf(iso: string): number {
  return new Date(iso).getHours()
}

/** The badge set. Deliberately small, deliberately reachable — this is a nudge, not a game economy. */
export function buildMilestones(
  checkIns: CheckIn[],
  weeks: WeekSummary[],
  streak: StreakSummary,
): Milestone[] {
  const total = checkIns.length
  const earlyBirds = checkIns.filter((c) => hourOf(c.timestamp) < 7).length
  const nightOwls = checkIns.filter((c) => hourOf(c.timestamp) >= 20).length
  const perfectWeeks = weeks.filter((w) => !w.isCurrent && w.openDays > 0 && w.trained >= w.openDays).length

  const defs: Omit<Milestone, 'earned'>[] = [
    { id: 'first', name: 'First rep', description: 'Check in for the first time', icon: 'zap', value: total, goal: 1 },
    { id: 'ten', name: 'Warmed up', description: '10 visits logged', icon: 'medal', value: total, goal: 10 },
    { id: 'fifty', name: 'Fifty in', description: '50 visits logged', icon: 'medal', value: total, goal: 50 },
    { id: 'century', name: 'Century club', description: '100 visits logged', icon: 'trophy', value: total, goal: 100 },
    { id: 'streak4', name: 'Month on target', description: 'Hit your goal 4 weeks running', icon: 'flame', value: streak.best, goal: 4 },
    { id: 'streak12', name: 'Quarter locked in', description: 'Hit your goal 12 weeks running', icon: 'flame', value: streak.best, goal: 12 },
    { id: 'early', name: 'Early bird', description: '10 check-ins before 7 AM', icon: 'sunrise', value: earlyBirds, goal: 10 },
    { id: 'night', name: 'Closing crew', description: '10 check-ins after 8 PM', icon: 'moon', value: nightOwls, goal: 10 },
    { id: 'perfect', name: 'Full house', description: 'Train every day the club was open, in one week', icon: 'target', value: perfectWeeks, goal: 1 },
  ]

  return defs.map((d) => ({ ...d, earned: d.value >= d.goal }))
}

// ---------------------------------------------------------------------------
// Plain totals — shown whether or not the member uses the goal system
// ---------------------------------------------------------------------------

export function monthlyVisitCount(checkIns: CheckIn[], reference = new Date()): number {
  return checkIns.filter((c) => {
    const d = new Date(c.timestamp)
    return d.getMonth() === reference.getMonth() && d.getFullYear() === reference.getFullYear()
  }).length
}

/** Average visits per week over the completed weeks in the window, to one decimal. */
export function averagePerWeek(weeks: WeekSummary[]): number {
  const completed = weeks.filter((w) => !w.isCurrent)
  if (completed.length === 0) return 0
  const total = completed.reduce((sum, w) => sum + w.trained, 0)
  return Math.round((total / completed.length) * 10) / 10
}

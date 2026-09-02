import type { Activity, ScheduleSlot } from '@/types'

/** Combine today's date with a slot's day-of-week + time into a concrete Date N weeks out. */
function nextDateForSlot(slot: ScheduleSlot, fromDate: Date, weeksOut: number): Date {
  const result = new Date(fromDate)
  const currentDay = result.getDay()
  let dayDiff = slot.dayOfWeek - currentDay
  if (dayDiff < 0) dayDiff += 7
  result.setDate(result.getDate() + dayDiff + weeksOut * 7)
  const [h, m] = slot.startTime.split(':').map(Number)
  result.setHours(h, m, 0, 0)
  return result
}

/**
 * Expand an activity's weekly `schedule` into concrete upcoming occurrences
 * (ISO datetime strings) within the next `daysAhead` days, soonest first.
 * Occurrences earlier today than the current time are skipped.
 */
export function getUpcomingOccurrences(activity: Activity, daysAhead = 14): string[] {
  const now = new Date()
  const horizon = new Date(now)
  horizon.setDate(horizon.getDate() + daysAhead)

  const occurrences: Date[] = []
  for (const slot of activity.schedule) {
    for (let week = 0; week <= Math.ceil(daysAhead / 7); week++) {
      const d = nextDateForSlot(slot, now, week)
      if (d >= now && d <= horizon) occurrences.push(d)
    }
  }
  occurrences.sort((a, b) => a.getTime() - b.getTime())
  return occurrences.map((d) => d.toISOString())
}

export function nextOccurrence(activity: Activity): string | null {
  const [first] = getUpcomingOccurrences(activity, 14)
  return first ?? null
}

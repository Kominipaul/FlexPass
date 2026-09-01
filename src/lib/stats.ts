import type { CheckIn } from '@/types'
import { isoDateOnly } from './format'

/** Check-ins grouped into the last `days` calendar days, oldest first. */
export function groupCheckInsByDay(
  checkIns: CheckIn[],
  days = 7,
): { label: string; date: string; value: number; isToday: boolean }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const buckets: { label: string; date: string; value: number; isToday: boolean }[] = []

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateKey = isoDateOnly(d)
    buckets.push({
      label: d.toLocaleDateString('en-US', { weekday: 'narrow' }),
      date: dateKey,
      value: 0,
      isToday: i === 0,
    })
  }

  const byDate = new Map(buckets.map((b) => [b.date, b]))
  for (const c of checkIns) {
    const key = isoDateOnly(new Date(c.timestamp))
    const bucket = byDate.get(key)
    if (bucket) bucket.value += 1
  }
  return buckets
}

/** Check-ins bucketed into the last `weeks` calendar weeks (Mon–Sun), oldest first. */
export function groupCheckInsByWeek(
  checkIns: CheckIn[],
  weeks = 8,
): { label: string; value: number }[] {
  const startOfWeek = (d: Date) => {
    const copy = new Date(d)
    const day = copy.getDay()
    const diffToMonday = day === 0 ? 6 : day - 1
    copy.setDate(copy.getDate() - diffToMonday)
    copy.setHours(0, 0, 0, 0)
    return copy
  }

  const thisWeekStart = startOfWeek(new Date())
  const buckets: { label: string; value: number; start: Date }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeekStart)
    start.setDate(start.getDate() - i * 7)
    buckets.push({
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: 0,
      start,
    })
  }

  for (const c of checkIns) {
    const wkStart = startOfWeek(new Date(c.timestamp)).getTime()
    const bucket = buckets.find((b) => b.start.getTime() === wkStart)
    if (bucket) bucket.value += 1
  }

  return buckets.map(({ label, value }) => ({ label, value }))
}

export function monthlyVisitCount(checkIns: CheckIn[], reference = new Date()): number {
  return checkIns.filter((c) => {
    const d = new Date(c.timestamp)
    return d.getMonth() === reference.getMonth() && d.getFullYear() === reference.getFullYear()
  }).length
}

/** Consecutive days (ending today or yesterday) with at least one check-in. */
export function currentStreak(checkIns: CheckIn[]): number {
  if (checkIns.length === 0) return 0
  const visitedDates = new Set(checkIns.map((c) => isoDateOnly(new Date(c.timestamp))))

  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  if (!visitedDates.has(isoDateOnly(cursor))) {
    // Streak can still be "alive" if the last visit was yesterday.
    cursor.setDate(cursor.getDate() - 1)
    if (!visitedDates.has(isoDateOnly(cursor))) return 0
  }

  let streak = 0
  while (visitedDates.has(isoDateOnly(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

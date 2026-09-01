import type { CheckIn, Location } from '@/types'
import { isoDateOnly } from './format'

export interface HourBucket {
  hour: number
  values: Record<string, number>
}

/** Check-ins bucketed by hour-of-day (0-23), split per location id, across all history. */
export function computeHourlyTraffic(checkIns: CheckIn[], locations: Location[]): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    values: Object.fromEntries(locations.map((l) => [l.id, 0])),
  }))
  for (const c of checkIns) {
    const loc = locations.find((l) => l.name === c.location)
    if (!loc) continue
    buckets[new Date(c.timestamp).getHours()].values[loc.id] += 1
  }
  return buckets
}

export interface DayBucket {
  date: string
  label: string
  values: Record<string, number>
}

/** Check-ins for each of the last `days` calendar days, split per location id. */
export function computeDailyTraffic(checkIns: CheckIn[], locations: Location[], days = 7): DayBucket[] {
  const buckets: DayBucket[] = Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    d.setHours(0, 0, 0, 0)
    return {
      date: isoDateOnly(d),
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      values: Object.fromEntries(locations.map((l) => [l.id, 0])),
    }
  })
  const byDate = new Map(buckets.map((b) => [b.date, b]))
  for (const c of checkIns) {
    const bucket = byDate.get(isoDateOnly(new Date(c.timestamp)))
    if (!bucket) continue
    const loc = locations.find((l) => l.name === c.location)
    if (!loc) continue
    bucket.values[loc.id] += 1
  }
  return buckets
}

export function checkInsToday(checkIns: CheckIn[], locationName?: string): number {
  const today = isoDateOnly(new Date())
  return checkIns.filter(
    (c) => (!locationName || c.location === locationName) && isoDateOnly(new Date(c.timestamp)) === today,
  ).length
}

export function sumValues(record: Record<string, number>): number {
  return Object.values(record).reduce((a, b) => a + b, 0)
}

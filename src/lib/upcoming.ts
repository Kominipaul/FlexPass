import type { Activity, ClassBooking, ClassBookingStatus, GroupMembership } from '@/types'
import { nextOccurrence } from './schedule'

export interface AgendaItem {
  key: string
  activity: Activity
  date: string
  kind: 'class' | 'group'
  bookingId?: string
  status?: ClassBookingStatus
}

/** Merges booked drop-in classes and ongoing group memberships into one sorted upcoming agenda. */
export function getUpcomingAgenda(
  activities: Activity[],
  classBookings: ClassBooking[],
  groupMemberships: GroupMembership[],
): AgendaItem[] {
  const activityById = new Map(activities.map((a) => [a.id, a]))
  const now = Date.now()
  const items: AgendaItem[] = []

  for (const booking of classBookings) {
    if (booking.status !== 'booked' && booking.status !== 'waitlisted') continue
    if (new Date(booking.date).getTime() < now) continue
    const activity = activityById.get(booking.activityId)
    if (!activity) continue
    items.push({
      key: booking.id,
      activity,
      date: booking.date,
      kind: 'class',
      bookingId: booking.id,
      status: booking.status,
    })
  }

  for (const membership of groupMemberships) {
    if (membership.status !== 'active') continue
    const activity = activityById.get(membership.activityId)
    if (!activity) continue
    const next = nextOccurrence(activity)
    if (!next) continue
    items.push({ key: membership.id, activity, date: next, kind: 'group' })
  }

  return items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

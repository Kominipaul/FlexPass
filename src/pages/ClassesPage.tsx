import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  Clock,
  Dumbbell,
  LogOut,
  MapPin,
  Users as UsersIcon,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageLoader, Spinner } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgendaRow } from '@/components/AgendaRow'
import { getBookingCounts, getGroupRosterSize } from '@/lib/db'
import { getUpcomingOccurrences } from '@/lib/schedule'
import { getUpcomingAgenda } from '@/lib/upcoming'
import { dayName, formatAgendaDate, formatDate, formatTime12 } from '@/lib/format'
import { TONES, toneOf } from '@/lib/colors'
import type { Activity, ClassBooking, GroupMembership } from '@/types'

export function ClassesPage() {
  const {
    loading,
    activities,
    classBookings,
    groupMemberships,
    bookClass,
    cancelBooking,
    joinGroup,
    leaveGroup,
  } = useGymData()
  const { showToast } = useToast()

  const [tab, setTab] = useState<'browse' | 'mine'>('browse')
  const [kindFilter, setKindFilter] = useState<'all' | 'class' | 'group'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [activeActivity, setActiveActivity] = useState<Activity | null>(null)

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(activities.map((a) => a.category))).sort()],
    [activities],
  )

  const filteredActivities = activities.filter(
    (a) => (kindFilter === 'all' || a.kind === kindFilter) && (categoryFilter === 'all' || a.category === categoryFilter),
  )

  const myGroups = groupMemberships.filter((g) => g.status === 'active')
  const agenda = getUpcomingAgenda(activities, classBookings, groupMemberships)
  const pastBookings = classBookings
    .filter((b) => b.status === 'attended' || b.status === 'no-show')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  if (loading) return <PageLoader label="Loading classes & groups…" />

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Classes & Groups" subtitle="Book drop-in classes or join an ongoing group." />

      <Tabs
        items={[
          { key: 'browse', label: 'Browse' },
          { key: 'mine', label: 'My schedule', count: agenda.length > 0 ? agenda.length : undefined },
        ]}
        active={tab}
        onChange={(k) => setTab(k as 'browse' | 'mine')}
        className="max-w-xs"
      />

      {tab === 'browse' ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill active={kindFilter === 'all'} onClick={() => setKindFilter('all')} label="All" />
            <FilterPill active={kindFilter === 'class'} onClick={() => setKindFilter('class')} label="Drop-in classes" />
            <FilterPill active={kindFilter === 'group'} onClick={() => setKindFilter('group')} label="Ongoing groups" />
            <span className="mx-1 h-5 w-px bg-line" />
            {categories.map((c) => (
              <FilterPill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} label={c === 'all' ? 'All categories' : c} subtle />
            ))}
          </div>

          {filteredActivities.length === 0 ? (
            <EmptyState icon={<Dumbbell className="h-5 w-5" />} title="No matches" description="Try a different filter." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredActivities.map((activity) => {
                const joined = myGroups.some((g) => g.activityId === activity.id)
                return (
                  <ActivityCard key={activity.id} activity={activity} joined={joined} onOpen={() => setActiveActivity(activity)} />
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody>
              <h3 className="font-display mb-3 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">Upcoming</h3>
              {agenda.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays className="h-5 w-5" />}
                  title="Nothing on your schedule"
                  description="Browse classes and groups to get started."
                  action={
                    <Button size="sm" onClick={() => setTab('browse')}>
                      Browse
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col divide-y divide-linesoft">
                  {agenda.map((item) => (
                    <AgendaRow
                      key={item.key}
                      item={item}
                      onCancel={async (bookingId) => {
                        await cancelBooking(bookingId)
                        showToast('Booking cancelled.')
                      }}
                    />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="font-display mb-3 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">My groups</h3>
              {myGroups.length === 0 ? (
                <EmptyState icon={<UsersIcon className="h-5 w-5" />} title="You haven't joined any groups yet" />
              ) : (
                <ul className="flex flex-col divide-y divide-linesoft">
                  {myGroups.map((g) => {
                    const activity = activities.find((a) => a.id === g.activityId)
                    if (!activity) return null
                    return (
                      <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                        <div>
                          <p className="text-[13px] font-semibold text-ink">{activity.name}</p>
                          <p className="text-[11.5px] text-mute">Member since {formatDate(g.joinedAt)}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="quiet"
                          iconLeft={<LogOut className="h-3.5 w-3.5" />}
                          onClick={async () => {
                            await leaveGroup(g.id)
                            showToast(`You left ${activity.name}.`)
                          }}
                        >
                          Leave
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {pastBookings.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="font-display mb-3 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">Past sessions</h3>
                <ul className="flex flex-col divide-y divide-linesoft">
                  {pastBookings.map((b) => {
                    const activity = activities.find((a) => a.id === b.activityId)
                    if (!activity) return null
                    return (
                      <li key={b.id} className="flex items-center justify-between gap-2 py-2.5 text-[13px] first:pt-0 last:pb-0">
                        <span className="font-medium text-dim">{activity.name}</span>
                        <span className="text-mute">{formatDate(b.date)}</span>
                        <Badge tone={b.status === 'attended' ? 'good' : 'slate'} size="sm">
                          {b.status === 'attended' ? 'Attended' : 'No-show'}
                        </Badge>
                      </li>
                    )
                  })}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      {activeActivity && (
        <ActivityDetailsModal
          activity={activeActivity}
          onClose={() => setActiveActivity(null)}
          classBookings={classBookings}
          groupMemberships={groupMemberships}
          onBook={async (date) => {
            const booking = await bookClass(activeActivity.id, date)
            showToast(booking.status === 'booked' ? "You're booked!" : "Class is full — you're on the waitlist.")
          }}
          onJoin={async () => {
            await joinGroup(activeActivity.id)
            showToast(`You joined ${activeActivity.name}.`)
          }}
          onLeave={async (membershipId) => {
            await leaveGroup(membershipId)
            showToast(`You left ${activeActivity.name}.`)
          }}
        />
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  subtle,
}: {
  active: boolean
  onClick: () => void
  label: string
  subtle?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.03em] transition-colors ${
        active
          ? 'border-volt bg-volt text-voltink'
          : subtle
            ? 'border-line bg-surface text-mute hover:border-voltline hover:text-ink'
            : 'border-line bg-surface text-dim hover:border-voltline hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function ActivityCard({ activity, joined, onOpen }: { activity: Activity; joined: boolean; onOpen: () => void }) {
  const classes = TONES[toneOf(activity.color)]
  const next = getUpcomingOccurrences(activity, 14)[0]
  return (
    <button
      type="button"
      onClick={onOpen}
      className="inner-top flex flex-col rounded-[12px] border border-line bg-surface p-5 text-left shadow-card transition-colors hover:border-voltline"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex h-10 w-10 items-center justify-center rounded-[9px] ${classes.chip}`}>
          <Dumbbell className="h-5 w-5" />
        </span>
        <div className="flex flex-col items-end gap-1">
          <Badge tone={activity.kind === 'group' ? 's3' : 'volt'} size="sm">
            {activity.kind === 'group' ? 'Group' : 'Class'}
          </Badge>
          {joined && (
            <Badge tone="good" size="sm">
              Joined
            </Badge>
          )}
        </div>
      </div>
      <h3 className="font-display mt-3 text-[14px] font-bold text-ink">{activity.name}</h3>
      <p className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">{activity.category}</p>
      <p className="mt-2 line-clamp-2 text-[12.5px] text-dim">{activity.description}</p>
      <div className="mt-3 flex flex-col gap-1 text-[11.5px] text-mute">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {activity.location} · {activity.instructor}
        </span>
        {next && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Next: {formatAgendaDate(next)}
          </span>
        )}
      </div>
    </button>
  )
}

function ActivityDetailsModal({
  activity,
  onClose,
  classBookings,
  groupMemberships,
  onBook,
  onJoin,
  onLeave,
}: {
  activity: Activity
  onClose: () => void
  classBookings: ClassBooking[]
  groupMemberships: GroupMembership[]
  onBook: (date: string) => Promise<void>
  onJoin: () => Promise<void>
  onLeave: (membershipId: string) => Promise<void>
}) {
  const [occupancy, setOccupancy] = useState<Record<string, number> | null>(null)
  const [rosterSize, setRosterSize] = useState<number | null>(null)
  const [busyDate, setBusyDate] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState(false)

  const myMembership = groupMemberships.find((g) => g.activityId === activity.id && g.status === 'active')

  useEffect(() => {
    let cancelled = false
    if (activity.kind === 'class') {
      getBookingCounts(activity.id).then((counts) => {
        if (!cancelled) setOccupancy(counts)
      })
    } else {
      getGroupRosterSize(activity.id).then((size) => {
        if (!cancelled) setRosterSize(size)
      })
    }
    return () => {
      cancelled = true
    }
  }, [activity.id, activity.kind])

  const occurrences = activity.kind === 'class' ? getUpcomingOccurrences(activity, 21) : []

  return (
    <Modal
      open
      onClose={onClose}
      icon={<Dumbbell className="h-4 w-4" />}
      title={activity.name}
      description={`${activity.category} · with ${activity.instructor}`}
      size="lg"
    >
      <div className="flex flex-col gap-5">
        <p className="text-[13px] text-dim">{activity.description}</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetaChip icon={<MapPin className="h-3.5 w-3.5" />} label={activity.location} />
          <MetaChip icon={<UsersIcon className="h-3.5 w-3.5" />} label={activity.level} />
          <MetaChip icon={<Dumbbell className="h-3.5 w-3.5" />} label={`Cap ${activity.capacity}`} />
          <MetaChip
            icon={<Clock className="h-3.5 w-3.5" />}
            label={activity.schedule.map((s) => `${dayName(s.dayOfWeek, true)} ${formatTime12(s.startTime)}`).join(', ')}
          />
        </div>

        {activity.kind === 'group' ? (
          <div className="rounded-[9px] border border-line p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold text-ink">
                  {rosterSize === null ? <Spinner className="h-4 w-4" /> : `${rosterSize} / ${activity.capacity} members`}
                </p>
                <p className="text-[11.5px] text-mute">Meets weekly — join once, attend every session.</p>
              </div>
              {myMembership ? (
                <Button
                  variant="quiet"
                  className="text-bad"
                  loading={busyAction}
                  onClick={async () => {
                    setBusyAction(true)
                    try {
                      await onLeave(myMembership.id)
                      onClose()
                    } finally {
                      setBusyAction(false)
                    }
                  }}
                >
                  Leave group
                </Button>
              ) : (
                <Button
                  loading={busyAction}
                  disabled={rosterSize !== null && rosterSize >= activity.capacity}
                  onClick={async () => {
                    setBusyAction(true)
                    try {
                      await onJoin()
                      onClose()
                    } finally {
                      setBusyAction(false)
                    }
                  }}
                  iconLeft={<Check className="h-3.5 w-3.5" />}
                >
                  Join this group
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink">Upcoming sessions</p>
            <ul className="flex flex-col gap-2">
              {occurrences.map((date) => {
                const already = classBookings.some(
                  (b) => b.activityId === activity.id && b.date === date && (b.status === 'booked' || b.status === 'waitlisted'),
                )
                const bookedCount = occupancy?.[date] ?? 0
                const spotsLeft = activity.capacity - bookedCount
                const isFull = occupancy !== null && spotsLeft <= 0
                return (
                  <li
                    key={date}
                    className="flex items-center justify-between gap-2 rounded-[9px] border border-line px-3.5 py-2.5"
                  >
                    <span className="text-[13px] font-medium text-ink">{formatAgendaDate(date)}</span>
                    {already ? (
                      <Badge tone="good" size="sm">
                        Booked
                      </Badge>
                    ) : occupancy === null ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Button
                        size="sm"
                        variant={isFull ? 'quiet' : 'solid'}
                        loading={busyDate === date}
                        onClick={async () => {
                          setBusyDate(date)
                          try {
                            await onBook(date)
                          } finally {
                            setBusyDate(null)
                          }
                        }}
                      >
                        {isFull ? 'Join waitlist' : `Book · ${spotsLeft} left`}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  )
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[7px] border border-line bg-raised px-2.5 py-2 text-[11.5px] font-medium text-dim">
      {icon}
      <span className="truncate">{label}</span>
    </div>
  )
}

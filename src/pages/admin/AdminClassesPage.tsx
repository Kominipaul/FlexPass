import { useEffect, useMemo, useState } from 'react'
import { CalendarPlus, ClipboardList, Dumbbell, Trash2 } from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, inputCls } from '@/components/admin/Field'
import { Select } from '@/components/ui/Select'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui/EmptyState'
import { getBookingCounts, getGroupRosterSize, type NewActivityInput } from '@/lib/db'
import { nextOccurrence } from '@/lib/schedule'
import { dayName, formatTime12 } from '@/lib/format'
import { TONES, toneOf } from '@/lib/colors'
import type { Activity } from '@/types'

const CATEGORIES = ['Spin', 'HIIT', 'Yoga', 'Boxing', 'Zumba', 'Strength', 'Pilates', 'Running', 'Functional', 'CrossFit']
const LEVELS: Activity['level'][] = ['All levels', 'Beginner', 'Intermediate', 'Advanced']
const DAYS = [0, 1, 2, 3, 4, 5, 6]

const blankDraft = (locationId: string): NewActivityInput => ({
  kind: 'class',
  name: '',
  category: CATEGORIES[0],
  instructor: '',
  location: '',
  locationId,
  level: 'All levels',
  description: '',
  capacity: 16,
  color: 's1',
  schedule: [{ dayOfWeek: 1, startTime: '18:00', durationMins: 45 }],
})

export function AdminClassesPage() {
  const { loading, activities, classBookings, groupMemberships, members, locations, atLocationId, createActivity, deleteActivity } =
    useAdminData()
  const { showToast } = useToast()

  const [scope, setScope] = useState<'all' | string>('all')
  const [addOpen, setAddOpen] = useState(false)
  const [draft, setDraft] = useState<NewActivityInput>(() => blankDraft(atLocationId))
  const [rosterFor, setRosterFor] = useState<Activity | null>(null)
  const [fillMap, setFillMap] = useState<Record<string, { booked: number; cap: number }>>({})

  useEffect(() => {
    let cancelled = false
    async function loadFills() {
      const entries = await Promise.all(
        activities.map(async (a) => {
          if (a.kind === 'group') {
            const size = await getGroupRosterSize(a.id)
            return [a.id, { booked: size, cap: a.capacity }] as const
          }
          const next = nextOccurrence(a)
          if (!next) return [a.id, { booked: 0, cap: a.capacity }] as const
          const counts = await getBookingCounts(a.id)
          return [a.id, { booked: counts[next] ?? 0, cap: a.capacity }] as const
        }),
      )
      if (!cancelled) setFillMap(Object.fromEntries(entries))
    }
    loadFills()
    return () => {
      cancelled = true
    }
  }, [activities])

  const shown = useMemo(
    () => activities.filter((a) => scope === 'all' || a.locationId === scope),
    [activities, scope],
  )

  if (loading) return <PageLoader label="Loading classes…" />

  function rosterUserIds(activity: Activity): string[] {
    if (activity.kind === 'group') {
      return groupMemberships.filter((g) => g.activityId === activity.id && g.status === 'active').map((g) => g.userId)
    }
    const next = nextOccurrence(activity)
    if (!next) return []
    return classBookings.filter((b) => b.activityId === activity.id && b.date === next && b.status === 'booked').map((b) => b.userId)
  }

  async function handleCreate() {
    if (!draft.name.trim() || !draft.instructor.trim() || !draft.location.trim()) return
    try {
      await createActivity(draft)
      showToast(`${draft.name} published to the schedule.`)
      setAddOpen(false)
      setDraft(blankDraft(atLocationId))
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not publish class.', 'error')
    }
  }

  async function handleDrop(activity: Activity) {
    try {
      const notified = await deleteActivity(activity.id)
      const suffix = notified > 0 ? ` — ${notified} member${notified === 1 ? '' : 's'} notified.` : '.'
      showToast(`${activity.name} cancelled${suffix}`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not cancel class.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] font-extrabold text-ink">Classes</h2>
          <p className="mt-1 text-[13px] text-dim">{shown.length} on the schedule · manage capacity and rosters.</p>
        </div>
        <Button
          onClick={() => {
            setDraft(blankDraft(atLocationId))
            setAddOpen(true)
          }}
          iconLeft={<CalendarPlus className="h-4 w-4" />}
        >
          Add class
        </Button>
      </div>

      <div className="flex gap-1.5">
        <ScopeButton active={scope === 'all'} onClick={() => setScope('all')} label="Both" />
        {locations.map((l) => (
          <ScopeButton key={l.id} active={scope === l.id} onClick={() => setScope(l.id)} label={l.name} />
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={<Dumbbell className="h-5 w-5" />} title="Nothing scheduled here" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((activity) => {
            const fill = fillMap[activity.id] ?? { booked: 0, cap: activity.capacity }
            const pct = fill.cap > 0 ? Math.round((fill.booked / fill.cap) * 100) : 0
            const full = fill.booked >= fill.cap
            const classes = TONES[toneOf(activity.color)]
            return (
              <Card key={activity.id} className="flex flex-col p-3.5">
                <div className="flex items-start gap-2.5">
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] ${classes.chip}`}>
                    <Dumbbell className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display truncate text-[13px] font-bold text-ink">{activity.name}</h3>
                    <p className="truncate text-[11.5px] text-dim">{activity.instructor}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDrop(activity)}
                    aria-label="Cancel class"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-badsoft hover:text-bad"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px] text-dim">
                  {activity.schedule.map((s, i) => (
                    <span key={i} className="inline-flex h-5 items-center gap-1 rounded-full border border-line bg-raised px-1.5">
                      {dayName(s.dayOfWeek, true)} {formatTime12(s.startTime)}
                    </span>
                  ))}
                  <span className="inline-flex h-5 items-center gap-1 rounded-full border border-line bg-raised px-1.5">
                    {activity.location}
                  </span>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-dim">
                      {fill.booked}/{fill.cap} {activity.kind === 'group' ? 'members' : 'booked'}
                    </span>
                    <span className={full ? 'font-semibold text-bad' : pct >= 80 ? 'font-semibold text-warn' : 'text-dim'}>
                      {pct}% full
                    </span>
                  </div>
                  <ProgressBar value={pct} tone={full ? 'bad' : pct >= 80 ? 'warn' : 'volt'} height="h-1.5" />
                </div>

                <Button size="sm" variant="quiet" className="mt-3 w-full" iconLeft={<ClipboardList className="h-3.5 w-3.5" />} onClick={() => setRosterFor(activity)}>
                  View roster
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        icon={<CalendarPlus className="h-4 w-4" />}
        title="Add class"
        description="Publishes immediately to the member app."
        size="lg"
        footer={
          <>
            <Button variant="quiet" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!draft.name.trim() || !draft.instructor.trim() || !draft.location.trim()}>
              Publish class
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Class name">
              <input
                className={inputCls}
                value={draft.name}
                placeholder="Functional Bootcamp"
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Type">
            <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as Activity['kind'] })}>
              <option value="class">Drop-in class</option>
              <option value="group">Ongoing group</option>
            </Select>
          </Field>
          <Field label="Category">
            <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Instructor">
            <input className={inputCls} value={draft.instructor} onChange={(e) => setDraft({ ...draft, instructor: e.target.value })} placeholder="Jordan Reyes" />
          </Field>
          <Field label="Room / studio">
            <input className={inputCls} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Studio A" />
          </Field>
          <Field label="Club">
            <Select value={draft.locationId} onChange={(e) => setDraft({ ...draft, locationId: e.target.value })}>
              {[{ id: 'downtown', name: 'FlexPass Downtown' }, { id: 'northside', name: 'FlexPass Northside' }].map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level">
            <Select value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Activity['level'] })}>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Day">
            <Select
              value={draft.schedule[0].dayOfWeek}
              onChange={(e) => setDraft({ ...draft, schedule: [{ ...draft.schedule[0], dayOfWeek: Number(e.target.value) }] })}
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {dayName(d)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Start time">
            <input
              type="time"
              className={inputCls}
              value={draft.schedule[0].startTime}
              onChange={(e) => setDraft({ ...draft, schedule: [{ ...draft.schedule[0], startTime: e.target.value }] })}
            />
          </Field>
          <Field label="Length (minutes)">
            <input
              type="number"
              min={15}
              max={120}
              step={5}
              className={inputCls}
              value={draft.schedule[0].durationMins}
              onChange={(e) => setDraft({ ...draft, schedule: [{ ...draft.schedule[0], durationMins: Number(e.target.value) || 45 }] })}
            />
          </Field>
          <Field label="Capacity" hint="Bookings stop here; extras join the waitlist.">
            <input
              type="number"
              min={1}
              max={60}
              className={inputCls}
              value={draft.capacity}
              onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) || 1 })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea
                className={`${inputCls} h-20 resize-none py-2`}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="What members should expect…"
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!rosterFor}
        onClose={() => setRosterFor(null)}
        icon={<ClipboardList className="h-4 w-4" />}
        title={rosterFor?.name ?? ''}
        description={rosterFor ? `${rosterFor.instructor} · ${rosterFor.location}` : undefined}
        footer={
          <Button variant="quiet" onClick={() => setRosterFor(null)}>
            Close
          </Button>
        }
      >
        {rosterFor && (
          <RosterList activity={rosterFor} userIds={rosterUserIds(rosterFor)} members={members} />
        )}
      </Modal>
    </div>
  )
}

function ScopeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-display h-8 rounded-[6px] border px-3 text-[11px] font-bold uppercase tracking-[.05em] transition-colors ${
        active ? 'border-volt bg-volt text-voltink' : 'border-line bg-surface text-dim hover:border-voltline hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function RosterList({
  activity,
  userIds,
  members,
}: {
  activity: Activity
  userIds: string[]
  members: ReturnType<typeof useAdminData>['members']
}) {
  const fillLabel = activity.kind === 'group' ? 'members' : 'booked'
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-dim">
        {userIds.length}/{activity.capacity} {fillLabel}
        {userIds.length >= activity.capacity ? ' · full' : ''}
      </p>
      <ProgressBar value={activity.capacity > 0 ? (userIds.length / activity.capacity) * 100 : 0} tone={userIds.length >= activity.capacity ? 'bad' : 'volt'} height="h-1.5" />
      <div className="scroll-thin max-h-64 divide-y divide-linesoft overflow-y-auto rounded-[9px] border border-line">
        {userIds.length === 0 && <p className="p-4 text-center text-[12.5px] text-dim">No one has booked yet.</p>}
        {userIds.map((id, i) => {
          const member = members.find((m) => m.user.id === id)
          if (!member) return null
          return (
            <div key={id} className="flex items-center gap-2.5 px-3 py-2">
              <Avatar name={member.user.name} tone={member.user.avatarColor} size="sm" />
              <span className="flex-1 text-[13px] text-ink">{member.user.name}</span>
              <span className="font-mono text-[11px] text-mute">#{String(i + 1).padStart(2, '0')}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

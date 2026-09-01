import { useEffect, useMemo, useState } from 'react'
import { DoorOpen, ScanLine, TrendingUp, Users } from 'lucide-react'
import { useAdminData } from '@/context/AdminDataContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { PeakHoursChart } from '@/components/admin/PeakHoursChart'
import { WeekChart } from '@/components/admin/WeekChart'
import { displayStatus } from '@/lib/access'
import { computeDailyTraffic, computeHourlyTraffic, checkInsToday, sumValues } from '@/lib/adminStats'
import { getBookingCounts, getGroupRosterSize } from '@/lib/db'
import { nextOccurrence } from '@/lib/schedule'
import { formatCurrency, isoDateOnly } from '@/lib/format'
import { PLAN_ORDER_TONES } from '@/lib/adminConstants'

export function InsightsPage() {
  const { loading, members, activities, checkIns, doorScans, locations, plans, atLocationId } = useAdminData()
  const [scope, setScope] = useState<'all' | string>('all')
  const [fillTotals, setFillTotals] = useState<{ booked: number; cap: number }>({ booked: 0, cap: 0 })

  useEffect(() => {
    setScope(atLocationId)
  }, [atLocationId])

  useEffect(() => {
    let cancelled = false
    async function loadFill() {
      let booked = 0
      let cap = 0
      for (const a of activities) {
        cap += a.capacity
        if (a.kind === 'group') {
          booked += await getGroupRosterSize(a.id)
        } else {
          const next = nextOccurrence(a)
          if (!next) continue
          const counts = await getBookingCounts(a.id)
          booked += counts[next] ?? 0
        }
      }
      if (!cancelled) setFillTotals({ booked, cap })
    }
    loadFill()
    return () => {
      cancelled = true
    }
  }, [activities])

  const hourly = useMemo(() => computeHourlyTraffic(checkIns, locations), [checkIns, locations])
  const daily = useMemo(() => computeDailyTraffic(checkIns, locations, 7), [checkIns, locations])

  if (loading) return <PageLoader label="Loading insights…" />

  const scopedLocationName = scope === 'all' ? undefined : locations.find((l) => l.id === scope)?.name
  const todayCount = checkInsToday(checkIns, scopedLocationName)
  const activeMembers = members.filter((m) => ['active', 'expiring'].includes(displayStatus(m.membership)))
  const peak = hourly.reduce((best, h) => {
    const v = scope === 'all' ? sumValues(h.values) : (h.values[scope] ?? 0)
    const bestV = scope === 'all' ? sumValues(best.values) : (best.values[scope] ?? 0)
    return v > bestV ? h : best
  }, hourly[0])
  const peakValue = scope === 'all' ? sumValues(peak.values) : (peak.values[scope] ?? 0)
  const todayKey = isoDateOnly(new Date())
  const deniedToday = doorScans.filter(
    (s) => s.result === 'denied' && isoDateOnly(new Date(s.timestamp)) === todayKey && (scope === 'all' || s.locationId === scope),
  ).length

  const fillPct = fillTotals.cap > 0 ? Math.round((fillTotals.booked / fillTotals.cap) * 100) : 0
  const revenue = members.reduce((sum, m) => sum + m.plan.priceMonthly, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[22px] font-extrabold text-ink">Insights</h2>
          <p className="mt-1 text-[13px] text-dim">Live traffic, membership and class metrics.</p>
        </div>
        <div className="flex gap-1.5">
          <ScopeButton active={scope === 'all'} onClick={() => setScope('all')} label="Both" />
          {locations.map((l) => (
            <ScopeButton key={l.id} active={scope === l.id} onClick={() => setScope(l.id)} label={l.name.replace('FlexPass ', '')} />
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<DoorOpen className="h-4 w-4" />} label="Check-ins today" value={todayCount} />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Active memberships"
          value={activeMembers.length}
          tone="good"
          sub={locations.map((l) => `${l.name.replace('FlexPass ', '').slice(0, 2).toUpperCase()} ${activeMembers.filter((m) => m.membership.homeLocation === l.name).length}`).join('   ·   ')}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Peak hour"
          value={`${String(peak.hour).padStart(2, '0')}:00`}
          sub={`${peakValue} check-ins in that hour`}
        />
        <MetricCard
          icon={<ScanLine className="h-4 w-4" />}
          label="Refused scans"
          value={deniedToday}
          tone={deniedToday ? 'bad' : 'good'}
          sub={deniedToday ? 'Expired, frozen or wrong club' : 'Every scan cleared today'}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardBody>
            <SectionTitle hint={scope === 'all' ? 'Both locations · all-time' : `${scopedLocationName} · all-time`}>
              Traffic by hour
            </SectionTitle>
            <PeakHoursChart data={hourly} scope={scope} />
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <SectionTitle hint="Check-ins, last 7 days">Location comparison</SectionTitle>
            <WeekChart data={daily} locations={locations} />
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardBody>
            <span className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">Class fill rate</span>
            <p className="font-display tnum mt-2 text-[28px] font-extrabold text-ink">{fillPct}%</p>
            <p className="mb-2.5 text-[11.5px] text-dim">
              {fillTotals.booked} booked of {fillTotals.cap} spots
            </p>
            <ProgressBar value={fillPct} tone="volt" height="h-2" />
          </CardBody>
        </Card>
        <Card className="sm:col-span-2">
          <CardBody>
            <div className="flex items-baseline justify-between">
              <span className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">Membership mix</span>
              <span className="font-mono text-[12px] font-semibold text-volt">{formatCurrency(revenue)} / mo</span>
            </div>
            <div className="mt-3 space-y-2">
              {plans.map((plan, i) => {
                const count = members.filter((m) => m.plan.id === plan.id).length
                return (
                  <div key={plan.id} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-[12px] text-ink">{plan.name}</span>
                    <div className="flex-1">
                      <ProgressBar value={members.length > 0 ? (count / members.length) * 100 : 0} tone={PLAN_ORDER_TONES[i % PLAN_ORDER_TONES.length]} height="h-1.5" />
                    </div>
                    <span className="font-mono w-24 shrink-0 text-right text-[12px] text-dim">
                      {count} · {formatCurrency(count * plan.priceMonthly)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      </div>
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

function SectionTitle({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h3 className="font-display text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">{children}</h3>
      <p className="text-[11px] text-mute">{hint}</p>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone = 'volt',
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
  tone?: 'volt' | 'good' | 'bad'
}) {
  const toneCls = { volt: 'text-volt bg-voltsoft border-voltline', good: 'text-good bg-goodsoft border-goodsoft', bad: 'text-bad bg-badsoft border-badsoft' }[tone]
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-[7px] border ${toneCls}`}>{icon}</span>
      </div>
      <p className="font-display tnum mt-2.5 text-[26px] font-extrabold leading-none text-ink">{value}</p>
      {sub && <p className="mt-2 text-[11px] text-dim">{sub}</p>}
    </Card>
  )
}

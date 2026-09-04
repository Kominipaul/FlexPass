import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Flame,
  Snowflake,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { PageLoader } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgendaRow } from '@/components/AgendaRow'
import { WeekStrip } from '@/components/progress/WeekStrip'
import { daysUntil, formatCurrency, formatDate, relativeTime } from '@/lib/format'
import { buildWeeks, monthlyVisitCount, summarizeStreak } from '@/lib/progress'
import { getUpcomingAgenda } from '@/lib/upcoming'
import { toneOf } from '@/lib/colors'

export function DashboardPage() {
  const { user } = useAuth()
  const {
    loading,
    membership,
    currentPlan,
    activities,
    classBookings,
    groupMemberships,
    checkIns,
    notifications,
    homeLocation,
    trainingGoal,
  } = useGymData()
  const navigate = useNavigate()

  if (loading || !user || !membership || !currentPlan) {
    return <PageLoader label="Loading your dashboard…" />
  }

  const daysLeft = daysUntil(membership.renewalDate)
  const cycleLength = membership.billingCycle === 'yearly' ? 365 : 30
  const ringValue = Math.max(2, Math.min(100, (daysLeft / cycleLength) * 100))
  const agenda = getUpcomingAgenda(activities, classBookings, groupMemberships).slice(0, 3)
  const visitsThisMonth = monthlyVisitCount(checkIns)
  const previewNotifications = notifications.slice(0, 3)
  const firstName = user.name.split(' ')[0]

  const goal = trainingGoal
  const weeks = goal ? buildWeeks(checkIns, goal, homeLocation) : []
  const streak = weeks.length > 0 ? summarizeStreak(weeks) : null
  const showProgress = !!goal?.enabled && !!streak

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Welcome back, ${firstName} 👋`}
        subtitle={`${new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })} · ${membership.homeLocation}`}
      />

      {membership.status !== 'active' && (
        <MembershipStatusBanner status={membership.status} renewalDate={membership.renewalDate} />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Membership snapshot */}
          <Card className="overflow-hidden">
            <div className="hazard h-1 opacity-90" />
            <CardBody className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
              <ProgressRing
                value={ringValue}
                size={120}
                strokeWidth={10}
                progressClassName={daysLeft <= 5 ? 'text-bad' : 'text-volt'}
              >
                <div className="text-center">
                  <p className="font-display tnum text-[28px] font-extrabold leading-none text-ink">
                    {Math.max(daysLeft, 0)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">days left</p>
                </div>
              </ProgressRing>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h3 className="font-display text-[16px] font-bold uppercase tracking-[.03em] text-ink">
                    {currentPlan.name} plan
                  </h3>
                  <Badge tone={toneOf(currentPlan.color)}>{membership.billingCycle}</Badge>
                </div>
                <p className="mt-1.5 text-[12.5px] text-dim">
                  {formatCurrency(
                    membership.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly,
                  )}{' '}
                  · renews {formatDate(membership.renewalDate)}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:justify-start">
                  <Button
                    size="sm"
                    onClick={() => navigate('/membership/upgrade')}
                    iconLeft={<Sparkles className="h-3.5 w-3.5" />}
                  >
                    Upgrade plan
                  </Button>
                  <Button size="sm" variant="quiet" onClick={() => navigate('/membership')}>
                    Manage membership
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stat row */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            <StatCard
              label="This month"
              value={visitsThisMonth}
              icon={<TrendingUp className="h-4 w-4" />}
              tone="volt"
            />
            <StatCard
              label={showProgress ? 'Week streak' : 'Total visits'}
              value={showProgress ? `${streak!.current}w` : checkIns.length}
              icon={showProgress ? <Flame className="h-4 w-4" /> : <Target className="h-4 w-4" />}
              tone="ember"
            />
            <StatCard
              label="Up next"
              value={agenda.length}
              icon={<CalendarClock className="h-4 w-4" />}
              tone="s3"
            />
          </div>

          {/* Up next */}
          <Card>
            <CardHeader
              title="Up next"
              action={
                <Link to="/classes" className="text-[11.5px] font-semibold text-volt hover:brightness-125">
                  Browse classes
                </Link>
              }
            />
            <CardBody>
              {agenda.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="h-5 w-5" />}
                  title="Nothing booked yet"
                  description="Book a drop-in class or join an ongoing group to see it here."
                  action={
                    <Button size="sm" onClick={() => navigate('/classes')}>
                      Find a class
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col divide-y divide-linesoft">
                  {agenda.map((item) => (
                    <AgendaRow key={item.key} item={item} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-5">
          {showProgress ? (
            <Card>
              <CardHeader
                title="This week"
                action={
                  <Link to="/progress" className="text-[11.5px] font-semibold text-volt hover:brightness-125">
                    Progress
                  </Link>
                }
              />
              <CardBody className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="font-display tnum text-[32px] font-extrabold leading-none text-ink">
                      {weeks[weeks.length - 1].trained}
                      <span className="text-[20px] text-mute">/{weeks[weeks.length - 1].target}</span>
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-mute">sessions this week</p>
                  </div>
                  <span className="flex items-center gap-1.5 rounded-full border border-emberline bg-embersoft px-2.5 py-1 text-[11px] font-bold text-ember">
                    <Flame className="h-3.5 w-3.5" />
                    {streak!.current}w
                  </span>
                </div>
                <WeekStrip week={weeks[weeks.length - 1]} />
                <p className="text-[11.5px] leading-snug text-dim">
                  {streak!.remaining === 0
                    ? 'Goal hit. Anything else this week is a bonus.'
                    : `${streak!.remaining} more to hit your goal of ${weeks[weeks.length - 1].target}.`}
                </p>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Progress" />
              <CardBody className="flex flex-col gap-3">
                <p className="text-[12px] leading-relaxed text-dim">
                  Set a weekly training goal and this turns into a streak you can actually keep — rest days and
                  club closures included.
                </p>
                <Button
                  size="sm"
                  variant="quiet"
                  fullWidth
                  onClick={() => navigate('/progress')}
                  iconLeft={<Target className="h-3.5 w-3.5" />}
                >
                  Set a goal
                </Button>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader
              title="Notifications"
              action={
                <Link to="/notifications" className="text-[11.5px] font-semibold text-volt hover:brightness-125">
                  View all
                </Link>
              }
            />
            <CardBody>
              {previewNotifications.length === 0 ? (
                <EmptyState icon={<BellRing className="h-5 w-5" />} title="You're all caught up" />
              ) : (
                <ul className="flex flex-col divide-y divide-linesoft">
                  {previewNotifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />}
                      <div className={n.read ? 'pl-3.5' : ''}>
                        <p className="text-[12.5px] font-semibold leading-snug text-ink">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11.5px] text-dim">{n.message}</p>
                        <p className="mt-1 text-[10.5px] text-mute">{relativeTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MembershipStatusBanner({ status, renewalDate }: { status: string; renewalDate: string }) {
  if (status === 'frozen') {
    return (
      <div className="flex items-start gap-3 rounded-[12px] border border-frozesoft bg-frozesoft px-4 py-3.5 text-[13px] leading-snug text-froze">
        <Snowflake className="mt-px h-5 w-5 shrink-0" />
        <p className="flex-1">
          Your membership is currently <span className="font-semibold">frozen</span>. Billing is paused — visit
          Membership to resume anytime.
        </p>
        <Link to="/membership" className="mt-px shrink-0 font-semibold underline underline-offset-2">
          Manage
        </Link>
      </div>
    )
  }
  if (status === 'pending_cancellation') {
    return (
      <div className="flex items-start gap-3 rounded-[12px] border border-warnsoft bg-warnsoft px-4 py-3.5 text-[13px] leading-snug text-warn">
        <ArrowRight className="mt-px h-5 w-5 shrink-0" />
        <p className="flex-1">
          Your membership won't renew — access continues until{' '}
          <span className="font-semibold">{formatDate(renewalDate)}</span>.
        </p>
        <Link to="/membership" className="mt-px shrink-0 font-semibold underline underline-offset-2">
          Manage
        </Link>
      </div>
    )
  }
  if (status === 'cancelled') {
    return (
      <div className="flex items-start gap-3 rounded-[12px] border border-badsoft bg-badsoft px-4 py-3.5 text-[13px] leading-snug text-bad">
        <ArrowRight className="mt-px h-5 w-5 shrink-0" />
        <p className="flex-1">Your membership is cancelled. Reactivate to regain access to classes and check-ins.</p>
        <Link to="/membership" className="mt-px shrink-0 font-semibold underline underline-offset-2">
          Reactivate
        </Link>
      </div>
    )
  }
  return null
}

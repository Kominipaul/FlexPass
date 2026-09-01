import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Flame,
  QrCode,
  Settings2,
  Snowflake,
  Sparkles,
  TrendingUp,
  Users as UsersIcon,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { MiniBarChart } from '@/components/ui/MiniBarChart'
import { EmptyState } from '@/components/ui/EmptyState'
import { AgendaRow } from '@/components/AgendaRow'
import { daysUntil, formatCurrency, formatDate, relativeTime } from '@/lib/format'
import { currentStreak, groupCheckInsByDay, monthlyVisitCount } from '@/lib/stats'
import { getUpcomingAgenda } from '@/lib/upcoming'
import { toneOf } from '@/lib/colors'

export function DashboardPage() {
  const { user } = useAuth()
  const { loading, membership, currentPlan, activities, classBookings, groupMemberships, checkIns, notifications, checkIn } =
    useGymData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [checkingIn, setCheckingIn] = useState(false)

  if (loading || !user || !membership || !currentPlan) {
    return <PageLoader label="Loading your dashboard…" />
  }

  const daysLeft = daysUntil(membership.renewalDate)
  const cycleLength = membership.billingCycle === 'yearly' ? 365 : 30
  const ringValue = Math.max(2, Math.min(100, (daysLeft / cycleLength) * 100))
  const agenda = getUpcomingAgenda(activities, classBookings, groupMemberships).slice(0, 3)
  const weekData = groupCheckInsByDay(checkIns, 7)
  const visitsThisMonth = monthlyVisitCount(checkIns)
  const streak = currentStreak(checkIns)
  const previewNotifications = notifications.slice(0, 3)
  const firstName = user.name.split(' ')[0]

  async function handleQuickCheckIn() {
    setCheckingIn(true)
    try {
      await checkIn('QR', membership!.homeLocation)
      showToast('Checked in — enjoy your workout! 💪')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not check in.', 'error')
    } finally {
      setCheckingIn(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-[22px] font-extrabold leading-tight text-ink">
          Welcome back, {firstName} <span aria-hidden="true">👋</span>
        </h2>
        <p className="mt-1 text-[13px] text-dim">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {membership.homeLocation}
        </p>
      </div>

      {membership.status !== 'active' && (
        <MembershipStatusBanner status={membership.status} renewalDate={membership.renewalDate} />
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Membership snapshot */}
          <Card className="overflow-hidden">
            <div className="hazard h-1 opacity-90" />
            <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <ProgressRing
                value={ringValue}
                size={128}
                strokeWidth={10}
                progressClassName={daysLeft <= 5 ? 'text-bad' : 'text-volt'}
              >
                <div className="text-center">
                  <p className="font-display tnum text-[30px] font-extrabold leading-none text-ink">
                    {Math.max(daysLeft, 0)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[.1em] text-mute">days left</p>
                </div>
              </ProgressRing>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
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
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button size="sm" onClick={() => navigate('/membership/upgrade')} iconLeft={<Sparkles className="h-3.5 w-3.5" />}>
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Visits this month" value={visitsThisMonth} icon={<TrendingUp className="h-4 w-4" />} tone="volt" />
            <StatCard
              label="Current streak"
              value={`${streak} day${streak === 1 ? '' : 's'}`}
              icon={<Flame className="h-4 w-4" />}
              tone="ember"
            />
            <StatCard
              label="Upcoming sessions"
              value={agenda.length}
              icon={<CalendarClock className="h-4 w-4" />}
              tone="s3"
              className="col-span-2 sm:col-span-1"
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

          {/* Weekly activity */}
          <Card>
            <CardHeader
              title="This week's activity"
              action={
                <Link to="/check-ins" className="text-[11.5px] font-semibold text-volt hover:brightness-125">
                  Full history
                </Link>
              }
            />
            <CardBody>
              <MiniBarChart data={weekData} />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <h3 className="font-display text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">
                Quick actions
              </h3>
              <Button
                fullWidth
                loading={checkingIn}
                onClick={handleQuickCheckIn}
                iconLeft={<Zap className="h-3.5 w-3.5" />}
              >
                Check in now
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <QuickLink to="/card" icon={<QrCode className="h-4 w-4" />} label="Member card" />
                <QuickLink to="/classes" icon={<UsersIcon className="h-4 w-4" />} label="Classes" />
                <QuickLink to="/billing" icon={<Sparkles className="h-4 w-4" />} label="Billing" />
                <QuickLink to="/settings" icon={<Settings2 className="h-4 w-4" />} label="Settings" />
              </div>
            </CardBody>
          </Card>

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

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center gap-1.5 rounded-[9px] border border-line bg-raised px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[.02em] text-dim transition-colors hover:border-voltline hover:text-volt"
    >
      {icon}
      {label}
    </Link>
  )
}

function MembershipStatusBanner({ status, renewalDate }: { status: string; renewalDate: string }) {
  if (status === 'frozen') {
    return (
      <div className="flex items-center gap-3 rounded-[12px] border border-frozesoft bg-frozesoft px-4 py-3.5 text-[13px] text-froze">
        <Snowflake className="h-5 w-5 shrink-0" />
        <p>
          Your membership is currently <span className="font-semibold">frozen</span>. Billing is paused —
          visit Membership to resume anytime.
        </p>
        <Link to="/membership" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
          Manage
        </Link>
      </div>
    )
  }
  if (status === 'pending_cancellation') {
    return (
      <div className="flex items-center gap-3 rounded-[12px] border border-warnsoft bg-warnsoft px-4 py-3.5 text-[13px] text-warn">
        <ArrowRight className="h-5 w-5 shrink-0" />
        <p>
          Your membership won't renew — access continues until{' '}
          <span className="font-semibold">{formatDate(renewalDate)}</span>.
        </p>
        <Link to="/membership" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
          Manage
        </Link>
      </div>
    )
  }
  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-3 rounded-[12px] border border-badsoft bg-badsoft px-4 py-3.5 text-[13px] text-bad">
        <ArrowRight className="h-5 w-5 shrink-0" />
        <p>Your membership is cancelled. Reactivate to regain access to classes and check-ins.</p>
        <Link to="/membership" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
          Reactivate
        </Link>
      </div>
    )
  }
  return null
}

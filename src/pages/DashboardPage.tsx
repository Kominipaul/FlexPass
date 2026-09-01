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
import { Card, CardBody } from '@/components/ui/Card'
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
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">
          Welcome back, {firstName} 👋
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {membership.homeLocation}
        </p>
      </div>

      {membership.status !== 'active' && <MembershipStatusBanner status={membership.status} renewalDate={membership.renewalDate} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Membership snapshot */}
          <Card>
            <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <ProgressRing
                value={ringValue}
                size={132}
                strokeWidth={11}
                progressClassName={daysLeft <= 5 ? 'text-rose-500' : 'text-brand-600'}
              >
                <div className="text-center">
                  <p className="text-3xl font-extrabold leading-none text-ink-900">{Math.max(daysLeft, 0)}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    days left
                  </p>
                </div>
              </ProgressRing>

              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-ink-900">{currentPlan.name} plan</h3>
                  <Badge tone={toneOf(currentPlan.color)}>{membership.billingCycle}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCurrency(
                    membership.billingCycle === 'yearly' ? currentPlan.priceYearly : currentPlan.priceMonthly,
                  )}{' '}
                  · renews {formatDate(membership.renewalDate)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  <Button size="sm" onClick={() => navigate('/membership/upgrade')} iconLeft={<Sparkles className="h-4 w-4" />}>
                    Upgrade plan
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate('/membership')}>
                    Manage membership
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Stat row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Visits this month" value={visitsThisMonth} icon={<TrendingUp className="h-4 w-4" />} tone="brand" />
            <StatCard
              label="Current streak"
              value={`${streak} day${streak === 1 ? '' : 's'}`}
              icon={<Flame className="h-4 w-4" />}
              tone="amber"
            />
            <StatCard
              label="Upcoming sessions"
              value={agenda.length}
              icon={<CalendarClock className="h-4 w-4" />}
              tone="violet"
              className="col-span-2 sm:col-span-1"
            />
          </div>

          {/* Up next */}
          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-base font-semibold text-ink-900">Up next</h3>
              <Link to="/classes" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Browse classes
              </Link>
            </div>
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
                <ul className="flex flex-col divide-y divide-slate-100">
                  {agenda.map((item) => (
                    <AgendaRow key={item.key} item={item} />
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Weekly activity */}
          <Card>
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-base font-semibold text-ink-900">This week's activity</h3>
              <Link to="/check-ins" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                Full history
              </Link>
            </div>
            <CardBody>
              <MiniBarChart data={weekData} />
            </CardBody>
          </Card>
        </div>

        {/* Sidebar column */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <h3 className="text-base font-semibold text-ink-900">Quick actions</h3>
              <Button
                fullWidth
                loading={checkingIn}
                onClick={handleQuickCheckIn}
                iconLeft={<Zap className="h-4 w-4" />}
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
            <div className="flex items-center justify-between p-5 pb-0">
              <h3 className="text-base font-semibold text-ink-900">Notifications</h3>
              <Link to="/notifications" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View all
              </Link>
            </div>
            <CardBody>
              {previewNotifications.length === 0 ? (
                <EmptyState icon={<BellRing className="h-5 w-5" />} title="You're all caught up" />
              ) : (
                <ul className="flex flex-col divide-y divide-slate-100">
                  {previewNotifications.map((n) => (
                    <li key={n.id} className="flex items-start gap-2.5 py-3 first:pt-0 last:pb-0">
                      {!n.read && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
                      <div className={n.read ? 'pl-3.5' : ''}>
                        <p className="text-sm font-semibold leading-snug text-ink-800">{n.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                        <p className="mt-1 text-[11px] text-slate-400">{relativeTime(n.createdAt)}</p>
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
      className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-center text-xs font-semibold text-ink-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
    >
      {icon}
      {label}
    </Link>
  )
}

function MembershipStatusBanner({ status, renewalDate }: { status: string; renewalDate: string }) {
  if (status === 'frozen') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3.5 text-sm text-cyan-800">
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
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
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
      <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm text-rose-800">
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

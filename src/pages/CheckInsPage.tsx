import { useState } from 'react'
import { CalendarCheck, Flame, MapPin, QrCode, TrendingUp, Zap } from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { MiniBarChart } from '@/components/ui/MiniBarChart'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/lib/format'
import { currentStreak, groupCheckInsByDay, groupCheckInsByWeek, monthlyVisitCount } from '@/lib/stats'
import type { Tone } from '@/lib/colors'
import type { CheckInMethod } from '@/types'

const METHODS: { key: CheckInMethod; label: string }[] = [
  { key: 'QR', label: 'QR scan' },
  { key: 'PIN', label: 'PIN code' },
  { key: 'Manual', label: 'Front desk' },
]

const METHOD_TONE: Record<CheckInMethod, Tone> = {
  QR: 'volt',
  PIN: 's3',
  Manual: 'slate',
}

export function CheckInsPage() {
  const { loading, membership, checkIns, checkIn } = useGymData()
  const { showToast } = useToast()

  const [method, setMethod] = useState<CheckInMethod>('QR')
  const [checkingIn, setCheckingIn] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)

  if (loading || !membership) return <PageLoader label="Loading check-ins…" />

  const canCheckIn = membership.status === 'active'
  const last7 = groupCheckInsByDay(checkIns, 7)
  const last8Weeks = groupCheckInsByWeek(checkIns, 8)
  const totalVisits = checkIns.length
  const monthVisits = monthlyVisitCount(checkIns)
  const last7Total = last7.reduce((sum, d) => sum + d.value, 0)
  const streak = currentStreak(checkIns)

  async function handleCheckIn() {
    setCheckingIn(true)
    try {
      await checkIn(method, membership!.homeLocation)
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
        <h2 className="font-display text-[22px] font-extrabold text-ink">Check-ins</h2>
        <p className="mt-1 text-[13px] text-dim">Your gym visit history — it all adds up.</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <MapPin className="h-4 w-4 text-volt" />
              {membership.homeLocation}
            </p>
            <p className="mt-1 text-[11.5px] text-mute">
              {canCheckIn ? 'Choose a check-in method to log a visit.' : 'Check-ins are unavailable while your membership is inactive.'}
            </p>
            <div className="mt-3 flex gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  disabled={!canCheckIn}
                  className={`font-display rounded-[6px] border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.03em] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    method === m.key ? 'border-volt bg-volt text-voltink' : 'border-line text-dim hover:border-voltline hover:text-ink'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <Button size="lg" disabled={!canCheckIn} loading={checkingIn} onClick={handleCheckIn} iconLeft={<Zap className="h-4 w-4" />}>
            Check in now
          </Button>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total visits" value={totalVisits} icon={<CalendarCheck className="h-4 w-4" />} tone="volt" />
        <StatCard label="This month" value={monthVisits} icon={<TrendingUp className="h-4 w-4" />} tone="s3" />
        <StatCard label="Last 7 days" value={last7Total} icon={<QrCode className="h-4 w-4" />} tone="froze" />
        <StatCard label="Current streak" value={`${streak}d`} icon={<Flame className="h-4 w-4" />} tone="ember" />
      </div>

      <Card>
        <CardBody>
          <h3 className="font-display mb-4 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">Last 8 weeks</h3>
          <MiniBarChart data={last8Weeks} height={120} />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h3 className="font-display mb-3 text-[12.5px] font-bold uppercase tracking-[.05em] text-ink">History</h3>
          {checkIns.length === 0 ? (
            <EmptyState icon={<CalendarCheck className="h-5 w-5" />} title="No check-ins yet" description="Check in above to start your streak." />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-linesoft">
                {checkIns.slice(0, visibleCount).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">{formatDateTime(c.timestamp)}</p>
                      <p className="flex items-center gap-1 text-[11.5px] text-mute">
                        <MapPin className="h-3 w-3" />
                        {c.location}
                        {c.durationMins && ` · ${c.durationMins} min`}
                      </p>
                    </div>
                    <Badge tone={METHOD_TONE[c.method]} size="sm">
                      {c.method}
                    </Badge>
                  </li>
                ))}
              </ul>
              {visibleCount < checkIns.length && (
                <div className="mt-4 flex justify-center">
                  <Button variant="quiet" size="sm" onClick={() => setVisibleCount((v) => v + 10)}>
                    Show more
                  </Button>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

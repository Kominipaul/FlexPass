import { useMemo, useState } from 'react'
import {
  CalendarCheck,
  Flame,
  KeyRound,
  MapPin,
  QrCode,
  Repeat,
  Settings2,
  Sparkles,
  Target,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/ui/StatCard'
import { ProgressRing } from '@/components/ui/ProgressRing'
import { EmptyState } from '@/components/ui/EmptyState'
import { WeekStrip } from '@/components/progress/WeekStrip'
import { WeekHistory } from '@/components/progress/WeekHistory'
import { MilestoneGrid } from '@/components/progress/MilestoneGrid'
import { GoalSheet } from '@/components/progress/GoalSheet'
import { formatDateTime } from '@/lib/format'
import {
  averagePerWeek,
  buildMilestones,
  buildWeeks,
  closureSummary,
  summarizeStreak,
} from '@/lib/progress'
import type { CheckInMethod, TrainingGoal } from '@/types'

const METHOD_LABEL: Record<CheckInMethod, string> = { QR: 'QR', PIN: 'PIN' }

/**
 * Progress — what used to be "Check-ins".
 *
 * The old page was a history list with a check-in button bolted on top,
 * and the button was the problem: a member tapping "check in now" in their
 * own app records a visit nothing verified. Checking in happens at the
 * door, so this page has no way to check in — it's what the visits added
 * up to. The goal, the streak and the badges are all opt-out in one switch
 * for members who just want the list.
 */
export function ProgressPage() {
  const { loading, membership, checkIns, homeLocation, trainingGoal, setTrainingGoal } = useGymData()
  const { showToast } = useToast()

  const [goalOpen, setGoalOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(10)

  const goal: TrainingGoal | null = trainingGoal

  const model = useMemo(() => {
    if (!goal) return null
    const weeks = buildWeeks(checkIns, goal, homeLocation)
    const streak = summarizeStreak(weeks)
    return { weeks, streak, milestones: buildMilestones(checkIns, weeks, streak) }
  }, [checkIns, goal, homeLocation])

  if (loading || !membership || !goal || !model) return <PageLoader label="Loading your progress…" />

  const { weeks, streak, milestones } = model
  const earned = milestones.filter((m) => m.earned).length

  async function saveGoal(patch: Partial<Omit<TrainingGoal, 'userId'>>) {
    try {
      await setTrainingGoal(patch)
      showToast(patch.enabled === false ? 'Progression turned off.' : 'Goal updated.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save your goal.', 'error')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Progress"
        subtitle={
          goal.enabled
            ? `${goal.daysPerWeek} days a week at ${membership.homeLocation}.`
            : 'Every visit you’ve logged, newest first.'
        }
        action={
          <Button
            variant="quiet"
            size="sm"
            onClick={() => setGoalOpen(true)}
            iconLeft={goal.enabled ? <Settings2 className="h-3.5 w-3.5" /> : <Target className="h-3.5 w-3.5" />}
          >
            {goal.enabled ? 'Edit goal' : 'Set a goal'}
          </Button>
        }
      />

      {goal.enabled ? (
        <>
          <StreakCard weeks={weeks} streak={streak} goal={goal} closure={closureSummary(homeLocation)} />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Best streak"
              value={`${streak.best}w`}
              icon={<Sparkles className="h-4 w-4" />}
              tone="ember"
            />
            <StatCard
              label="Weeks on goal"
              value={`${Math.round(streak.consistency * 100)}%`}
              icon={<Target className="h-4 w-4" />}
              tone="s3"
            />
            <StatCard
              label="Avg / week"
              value={averagePerWeek(weeks)}
              icon={<Repeat className="h-4 w-4" />}
              tone="froze"
            />
            <StatCard
              label="Total visits"
              value={checkIns.length}
              icon={<CalendarCheck className="h-4 w-4" />}
              tone="volt"
            />
          </div>

          <Card>
            <CardHeader title="Last 12 weeks" description="Each bar is a week; the dash is that week's target." />
            <CardBody>
              <WeekHistory weeks={weeks} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Badges"
              action={
                <span className="font-mono text-[11px] text-mute">
                  {earned}/{milestones.length}
                </span>
              }
            />
            <CardBody>
              <MilestoneGrid milestones={milestones} />
            </CardBody>
          </Card>
        </>
      ) : (
        <Card>
          <CardBody className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-ink">Progression is off</p>
              <p className="mt-0.5 text-[12px] text-dim">
                No streaks, no badges — just your visits. Turn it back on whenever you like.
              </p>
            </div>
            <Button size="sm" onClick={() => setGoalOpen(true)} iconLeft={<Target className="h-3.5 w-3.5" />}>
              Turn it on
            </Button>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader
          title="Visit history"
          description={goal.enabled ? undefined : `${checkIns.length} visits at ${membership.homeLocation}`}
          action={<span className="font-mono text-[11px] text-mute">{checkIns.length}</span>}
        />
        <CardBody>
          {checkIns.length === 0 ? (
            <EmptyState
              icon={<CalendarCheck className="h-5 w-5" />}
              title="No visits yet"
              description="Scan your code at the door and your first one shows up here."
            />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-linesoft">
                {checkIns.slice(0, visibleCount).map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-ink">{formatDateTime(c.timestamp)}</p>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-[11.5px] text-mute">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {c.location}
                        {c.durationMins ? ` · ${c.durationMins} min` : ''}
                      </p>
                    </div>
                    <Badge tone={c.method === 'QR' ? 'volt' : 's3'} size="sm">
                      {c.method === 'QR' ? (
                        <QrCode className="h-3 w-3" />
                      ) : (
                        <KeyRound className="h-3 w-3" />
                      )}
                      {METHOD_LABEL[c.method]}
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

      <GoalSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        goal={goal}
        homeLocation={homeLocation}
        onSave={saveGoal}
      />
    </div>
  )
}

function StreakCard({
  weeks,
  streak,
  goal,
  closure,
}: {
  weeks: ReturnType<typeof buildWeeks>
  streak: ReturnType<typeof summarizeStreak>
  goal: TrainingGoal
  closure: string | null
}) {
  const thisWeek = weeks[weeks.length - 1]
  const pct = Math.min(100, (thisWeek.trained / Math.max(1, thisWeek.target)) * 100)

  let note: string
  let noteTone = 'text-dim'
  if (streak.remaining === 0) {
    note =
      streak.current > 1
        ? `Goal hit — ${streak.current} weeks running.`
        : 'Goal hit for this week. Keep it going.'
    noteTone = 'text-good'
  } else if (streak.missed) {
    note = `Only ${thisWeek.openDaysLeft} open ${thisWeek.openDaysLeft === 1 ? 'day' : 'days'} left and ${streak.remaining} to go — this one's out of reach. Next week starts clean.`
    noteTone = 'text-mute'
  } else if (streak.atRisk) {
    note = `${streak.remaining} to go with ${thisWeek.openDaysLeft} open ${thisWeek.openDaysLeft === 1 ? 'day' : 'days'} left — every one counts.`
    noteTone = 'text-warn'
  } else {
    note = `${streak.remaining} more ${streak.remaining === 1 ? 'session' : 'sessions'} by Sunday to keep the streak.`
  }

  return (
    <Card className="overflow-hidden">
      <div className="hazard h-1 opacity-90" />
      <CardBody className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.1em] text-mute">
              <Flame className="h-3.5 w-3.5 text-ember" />
              Week streak
            </p>
            <p className="font-display tnum mt-1 text-[44px] font-extrabold leading-none text-ink">
              {streak.current}
            </p>
            <p className="mt-1.5 text-[11.5px] text-mute">
              {streak.current === 0
                ? 'Hit this week to start one'
                : `${streak.current === 1 ? 'week' : 'weeks'} on goal in a row`}
            </p>
          </div>

          <ProgressRing value={pct} size={96} strokeWidth={9}>
            <div className="text-center">
              <p className="font-display tnum text-[19px] font-extrabold leading-none text-ink">
                {thisWeek.trained}
                <span className="text-mute">/{thisWeek.target}</span>
              </p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[.1em] text-mute">this week</p>
            </div>
          </ProgressRing>
        </div>

        <WeekStrip week={thisWeek} />

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <p className={`text-[12px] font-medium leading-snug ${noteTone}`}>{note}</p>
          {thisWeek.target < goal.daysPerWeek && closure && (
            <span className="text-[11px] text-mute">Target trimmed to {thisWeek.target} — {closure}.</span>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

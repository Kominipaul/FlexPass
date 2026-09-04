import { useEffect, useState } from 'react'
import { Target } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { closureSummary, MAX_GOAL_DAYS, MIN_GOAL_DAYS } from '@/lib/progress'
import type { Location, TrainingGoal } from '@/types'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface GoalSheetProps {
  open: boolean
  onClose: () => void
  goal: TrainingGoal
  homeLocation: Location | null
  onSave: (patch: Partial<Omit<TrainingGoal, 'userId'>>) => Promise<void>
}

/** The member sets the target themselves — that's the whole basis of the streak, so it's editable in one sheet and nowhere else. */
export function GoalSheet({ open, onClose, goal, homeLocation, onSave }: GoalSheetProps) {
  const [daysPerWeek, setDaysPerWeek] = useState(goal.daysPerWeek)
  const [restDays, setRestDays] = useState<number[]>(goal.restDays)
  const [enabled, setEnabled] = useState(goal.enabled)
  const [saving, setSaving] = useState(false)

  // Re-seed from the stored goal each time the sheet opens, so an abandoned
  // edit doesn't linger as the starting point of the next one.
  useEffect(() => {
    if (!open) return
    setDaysPerWeek(goal.daysPerWeek)
    setRestDays(goal.restDays)
    setEnabled(goal.enabled)
  }, [open, goal])

  const closed = homeLocation?.closedDays ?? []
  const openDays = 7 - closed.length
  const effective = Math.min(daysPerWeek, Math.max(openDays, 1))
  const closureNote = closureSummary(homeLocation)

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Target className="h-4 w-4" />}
      title="Your training goal"
      description="The streak counts weeks you hit this — not days in a row."
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true)
              try {
                await onSave({ daysPerWeek, restDays, enabled })
                onClose()
              } finally {
                setSaving(false)
              }
            }}
          >
            Save goal
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="font-display text-[11.5px] font-bold uppercase tracking-[.06em] text-ink">
            Days per week
          </p>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {Array.from({ length: MAX_GOAL_DAYS - MIN_GOAL_DAYS + 1 }, (_, i) => i + MIN_GOAL_DAYS).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDaysPerWeek(n)}
                aria-pressed={daysPerWeek === n}
                className={`font-display flex h-11 items-center justify-center rounded-[8px] border text-[15px] font-extrabold transition-colors ${
                  daysPerWeek === n
                    ? 'border-volt bg-volt text-voltink'
                    : 'border-line bg-sunk text-dim hover:border-voltline hover:text-ink'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {effective < daysPerWeek && (
            <p className="mt-2 text-[11.5px] leading-snug text-warn">
              {homeLocation?.name} is only open {openDays} days a week, so a week here counts as hit at{' '}
              <span className="font-semibold">{effective}</span> visits.
            </p>
          )}
        </div>

        <div>
          <p className="font-display text-[11.5px] font-bold uppercase tracking-[.06em] text-ink">Rest days</p>
          <p className="mt-1 text-[11.5px] text-dim">
            Days you plan to be off. Marked in your week, never counted against you.
          </p>
          <div className="mt-2.5 grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, day) => {
              const isClosed = closed.includes(day)
              const active = restDays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  disabled={isClosed}
                  aria-label={DAY_NAMES[day]}
                  aria-pressed={active}
                  onClick={() =>
                    setRestDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
                  }
                  className={`flex h-10 items-center justify-center rounded-[8px] border text-[12px] font-bold transition-colors disabled:cursor-not-allowed ${
                    isClosed
                      ? 'border-dashed border-line bg-transparent text-mute/50'
                      : active
                        ? 'border-s3line bg-s3soft text-s3'
                        : 'border-line bg-sunk text-dim hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          {closureNote && (
            <p className="mt-2 text-[11.5px] text-mute">
              {homeLocation?.name} is {closureNote} — those days are already out of your week.
            </p>
          )}
        </div>

        <div className="rounded-[10px] border border-line bg-raised p-3.5">
          <Switch
            checked={enabled}
            onChange={setEnabled}
            label="Show progression"
            description="Not into streaks and badges? Turn this off and Progress becomes a plain visit history."
          />
        </div>
      </div>
    </Modal>
  )
}

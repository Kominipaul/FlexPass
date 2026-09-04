import { Check, Minus } from 'lucide-react'
import type { WeekSummary } from '@/lib/progress'

/**
 * One week, seven squares. The point of the strip is that a blank square
 * and a *closed* square are visibly not the same thing: the gym being shut
 * on Sunday isn't a day the member skipped, and showing it as a gap they
 * failed to fill is how a streak system starts feeling unfair.
 */
export function WeekStrip({ week }: { week: WeekSummary }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {week.days.map((day) => {
        const base =
          'flex aspect-square w-full flex-col items-center justify-center rounded-[8px] border text-[10px] font-bold transition-colors'

        let tone: string
        let content: React.ReactNode = day.dayOfMonth
        let title: string

        if (day.trained) {
          tone = 'border-volt bg-volt text-voltink'
          content = <Check className="h-3.5 w-3.5" strokeWidth={3.2} />
          title = 'Trained'
        } else if (day.closed) {
          tone = 'border-dashed border-line bg-transparent text-mute/60'
          content = <Minus className="h-3 w-3" />
          title = 'Club closed'
        } else if (day.isToday) {
          tone = 'border-volt bg-voltsoft text-volt'
          title = 'Today — still open'
        } else if (day.isFuture) {
          tone = 'border-linesoft bg-transparent text-mute/50'
          title = 'Still to come'
        } else if (day.rest) {
          tone = 'border-linesoft bg-sunk text-mute/70'
          title = 'Your rest day'
        } else {
          tone = 'border-line bg-sunk text-mute'
          title = 'No visit'
        }

        return (
          <div key={day.date} className="flex flex-col items-center gap-1">
            <span className="text-[9.5px] font-semibold uppercase tracking-[.06em] text-mute">{day.label}</span>
            <div className={`${base} ${tone}`} title={`${title} · ${day.date}`}>
              {content}
            </div>
          </div>
        )
      })}
    </div>
  )
}

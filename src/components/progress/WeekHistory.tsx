import type { WeekSummary } from '@/lib/progress'

/**
 * Twelve weeks at a glance. Each column is a week: the fill is how many
 * days were trained, and the notch is the target that week — which moves,
 * because a week with a public holiday in it asked for less.
 */
export function WeekHistory({ weeks }: { weeks: WeekSummary[] }) {
  const ceiling = Math.max(1, ...weeks.map((w) => Math.max(w.trained, w.target)))

  return (
    <div>
      {/* Columns must stretch, not hug their content: with `items-end` here
          the track's `flex-1` had no height to fill and every bar collapsed. */}
      <div className="flex h-[104px] gap-1.5">
        {weeks.map((week) => {
          const fill = (week.trained / ceiling) * 100
          const notch = (week.target / ceiling) * 100
          const label = week.isCurrent ? 'This week' : week.label
          return (
            <div key={week.start} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-[4px] bg-sunk">
                <div
                  className={`absolute inset-x-0 bottom-0 rounded-[4px] transition-[height] duration-500 ${
                    week.met ? 'bg-volt' : week.isCurrent ? 'bg-voltline' : 'bg-line'
                  }`}
                  style={{ height: `${Math.max(fill, week.trained > 0 ? 6 : 0)}%` }}
                />
                <div
                  className="absolute inset-x-0 border-t border-dashed border-mute/50"
                  style={{ bottom: `${notch}%` }}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`truncate text-center text-[8.5px] font-semibold uppercase tracking-[.04em] ${
                  week.isCurrent ? 'text-volt' : 'text-mute'
                }`}
                title={`${label}: ${week.trained} of ${week.target}`}
              >
                {week.isCurrent ? 'Now' : week.label.split(' ')[1]}
              </span>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-mute">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-volt" /> goal hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[2px] bg-line" /> short
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3.5 border-t border-dashed border-mute/70" /> that week's target
        </span>
      </div>
    </div>
  )
}

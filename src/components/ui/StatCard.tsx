import type { ReactNode } from 'react'
import { TONES, toneOf, type Tone } from '@/lib/colors'

interface StatCardProps {
  label: string
  value: ReactNode
  icon: ReactNode
  tone?: Tone
  hint?: ReactNode
  className?: string
}

export function StatCard({ label, value, icon, tone = 'volt', hint, className = '' }: StatCardProps) {
  const classes = TONES[toneOf(tone)]
  return (
    // Flex column with the value pushed to the bottom: in a grid row, one
    // card whose label wraps to two lines would otherwise sit its number a
    // line lower than its neighbours — the kind of half-pixel-looking
    // misalignment that reads as "something's off" without being nameable.
    <div
      className={`inner-top flex h-full flex-col rounded-[12px] border border-line bg-surface p-3 shadow-card sm:p-4 ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[9.5px] font-semibold uppercase leading-tight tracking-[.08em] text-mute sm:text-[10.5px]">
          {label}
        </p>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] sm:h-7 sm:w-7 ${classes.chip}`}>
          {icon}
        </span>
      </div>
      <p className="font-display tnum mt-auto pt-2 text-[20px] font-extrabold leading-none text-ink sm:text-[22px]">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[10.5px] leading-tight text-mute sm:text-[11px]">{hint}</p>}
    </div>
  )
}

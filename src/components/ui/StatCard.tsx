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
    <div className={`inner-top rounded-[12px] border border-line bg-surface p-4 shadow-card ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-[7px] ${classes.chip}`}>{icon}</span>
      </div>
      <p className="font-display tnum mt-2 text-[22px] font-extrabold leading-none text-ink">{value}</p>
      {hint && <p className="mt-1.5 text-[11px] text-mute">{hint}</p>}
    </div>
  )
}

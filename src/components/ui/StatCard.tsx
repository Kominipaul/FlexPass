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

export function StatCard({ label, value, icon, tone = 'brand', hint, className = '' }: StatCardProps) {
  const classes = TONES[toneOf(tone)]
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-card ${className}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${classes.chip}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-ink-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

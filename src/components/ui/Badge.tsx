import type { ReactNode } from 'react'
import { TONES, toneOf, type Tone } from '@/lib/colors'

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export function Badge({ children, tone = 'slate', size = 'md', dot = false, className = '' }: BadgeProps) {
  const classes = TONES[toneOf(tone)]
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${sizeClasses} ${classes.soft} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />}
      {children}
    </span>
  )
}

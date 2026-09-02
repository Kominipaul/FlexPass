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
  const sizeClasses =
    size === 'sm' ? 'h-5 px-1.5 text-[10px] gap-1' : 'h-6 px-2 text-[10.5px] gap-1.5'
  return (
    <span
      className={`font-display inline-flex items-center whitespace-nowrap rounded-full font-bold uppercase tracking-[.06em] ${sizeClasses} ${classes.soft} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${classes.dot}`} />}
      {children}
    </span>
  )
}

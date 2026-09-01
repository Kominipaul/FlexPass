import { initials } from '@/lib/format'
import { TONES, toneOf, type Tone } from '@/lib/colors'

interface AvatarProps {
  name: string
  tone?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
}

export function Avatar({ name, tone, size = 'md' }: AvatarProps) {
  const classes = TONES[toneOf(tone as Tone)]
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${classes.chip} ${SIZE_CLASSES[size]}`}
    >
      {initials(name)}
    </span>
  )
}

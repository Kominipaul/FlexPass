import { initials } from '@/lib/format'
import { TONES, toneOf, type Tone } from '@/lib/colors'

interface AvatarProps {
  name: string
  tone?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-[12px]',
  lg: 'h-14 w-14 text-[16px]',
  xl: 'h-20 w-20 text-[24px]',
}

export function Avatar({ name, tone, size = 'md' }: AvatarProps) {
  const classes = TONES[toneOf(tone as Tone)]
  return (
    <span
      className={`font-display inline-flex shrink-0 items-center justify-center rounded-full border font-bold ${classes.chip} ${SIZE_CLASSES[size]}`}
    >
      {initials(name)}
    </span>
  )
}

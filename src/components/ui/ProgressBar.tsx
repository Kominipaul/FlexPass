import { TONES, type Tone } from '@/lib/colors'

interface ProgressBarProps {
  value: number // 0-100
  tone?: Tone
  height?: string
  className?: string
}

export function ProgressBar({ value, tone = 'volt', height = 'h-1.5', className = '' }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-grid ${height} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${TONES[tone].dot}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

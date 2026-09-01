interface ProgressBarProps {
  value: number // 0-100
  className?: string
  trackClassName?: string
  barClassName?: string
}

export function ProgressBar({
  value,
  className = '',
  trackClassName = 'bg-slate-100',
  barClassName = 'bg-brand-600',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full ${trackClassName} ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

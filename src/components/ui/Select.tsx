import { forwardRef, useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = '', children, ...rest },
  ref,
) {
  const autoId = useId()
  const selectId = id ?? autoId

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-[11px] font-semibold uppercase tracking-[.08em] text-mute">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={`h-10 w-full cursor-pointer appearance-none rounded-[6px] border bg-sunk pl-3 pr-8 text-[13px] text-ink transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
            error ? 'border-bad focus:border-bad' : 'border-line focus:border-volt'
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-y-0 right-2.5 my-auto h-3.5 w-3.5 text-mute" />
      </div>
      {error && <p className="text-[11px] font-medium text-bad">{error}</p>}
      {!error && hint && <p className="text-[11px] text-mute">{hint}</p>}
    </div>
  )
})

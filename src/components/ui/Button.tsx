import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-300 shadow-sm',
  secondary: 'bg-ink-900 text-white hover:bg-ink-800 focus-visible:ring-ink-300 shadow-sm',
  outline:
    'bg-white text-ink-800 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-200',
  ghost: 'bg-transparent text-ink-700 hover:bg-slate-100 focus-visible:ring-slate-200',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300 shadow-sm',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled,
    iconLeft,
    iconRight,
    fullWidth,
    className = '',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft && <span className="-ml-0.5 inline-flex">{iconLeft}</span>
      )}
      {children}
      {!loading && iconRight && <span className="-mr-0.5 inline-flex">{iconRight}</span>}
    </button>
  )
})

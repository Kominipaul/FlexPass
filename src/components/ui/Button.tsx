import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'

type Variant = 'solid' | 'ember' | 'quiet' | 'ghost' | 'danger' | 'good'
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
  solid: 'bg-volt text-voltink border border-volt hover:shadow-glow active:brightness-95',
  ember: 'bg-ember text-white border border-ember hover:brightness-110',
  quiet: 'bg-raised text-ink border border-line hover:border-voltline hover:text-volt',
  ghost: 'bg-transparent text-dim border border-transparent hover:bg-raised hover:text-ink',
  danger: 'bg-badsoft text-bad border border-badsoft hover:brightness-125',
  good: 'bg-goodsoft text-good border border-goodsoft hover:brightness-125',
}

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[11px] gap-1.5 rounded-[6px]',
  md: 'h-9 px-3.5 text-[11.5px] gap-2 rounded-[6px]',
  lg: 'h-11 px-5 text-[13px] gap-2 rounded-[8px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'solid',
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
      className={`font-display inline-flex items-center justify-center font-bold uppercase tracking-[.06em] transition-all duration-150 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft && <span className="-ml-0.5 inline-flex">{iconLeft}</span>
      )}
      {children}
      {!loading && iconRight && <span className="-mr-0.5 inline-flex">{iconRight}</span>}
    </button>
  )
})

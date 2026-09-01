import { type ReactNode, type ButtonHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, Snowflake, type LucideIcon } from 'lucide-react'

type Variant = 'solid' | 'ember' | 'quiet' | 'ghost' | 'danger' | 'good'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[11px] gap-1.5',
  md: 'h-9 px-3.5 text-[11.5px] gap-2',
  lg: 'h-11 px-5 text-[13px] gap-2',
}
const variantClasses: Record<Variant, string> = {
  solid: 'bg-volt text-voltink border border-volt hover:shadow-glow active:brightness-95',
  ember: 'bg-ember text-white border border-ember hover:brightness-110',
  quiet: 'bg-raised text-ink border border-line hover:border-voltline hover:text-volt',
  ghost: 'bg-transparent text-dim border border-transparent hover:bg-raised hover:text-ink',
  danger: 'bg-badsoft text-bad border border-badsoft hover:brightness-125',
  good: 'bg-goodsoft text-good border border-goodsoft hover:brightness-125',
}

export function Button({ variant = 'solid', size = 'md', icon: Icon, iconRight: IconRight, children, className = '', ...rest }: ButtonProps) {
  const iconSize = size === 'lg' ? 17 : 14
  return (
    <button
      className={`display font-bold uppercase tracking-[.08em] inline-flex items-center justify-center rounded-[6px] transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {Icon && <Icon size={iconSize} strokeWidth={2.3} />}
      {children}
      {IconRight && <IconRight size={iconSize} strokeWidth={2.3} />}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-surface border border-line rounded-[12px] shadow-card inner-top ${className}`}>{children}</div>
}

type Status = 'active' | 'expiring' | 'expired' | 'frozen'
const statusMeta: Record<Status, { icon: LucideIcon; fg: string; bg: string; el: string; en: string }> = {
  active: { icon: CheckCircle2, fg: 'text-good', bg: 'bg-goodsoft', el: 'Ενεργή', en: 'Active' },
  expiring: { icon: AlertTriangle, fg: 'text-warn', bg: 'bg-warnsoft', el: 'Λήγει', en: 'Expiring' },
  expired: { icon: XCircle, fg: 'text-bad', bg: 'bg-badsoft', el: 'Έληξε', en: 'Expired' },
  frozen: { icon: Snowflake, fg: 'text-froze', bg: 'bg-frozesoft', el: 'Παύση', en: 'Frozen' },
}

export function statusFromMembership(status: string, daysLeft: number): Status {
  if (status === 'frozen') return 'frozen'
  if (status === 'expired' || daysLeft <= 0) return 'expired'
  if (daysLeft <= 7) return 'expiring'
  return 'active'
}

export function StatusPill({ status, lang, size = 'md' }: { status: Status; lang: 'el' | 'en'; size?: 'sm' | 'md' }) {
  const m = statusMeta[status]
  const Icon = m.icon
  const pad = size === 'sm' ? 'h-5 px-1.5 text-[10px] gap-1' : 'h-6 px-2 text-[10.5px] gap-1.5'
  return (
    <span className={`display font-bold uppercase tracking-[.06em] inline-flex items-center rounded-full whitespace-nowrap ${pad} ${m.bg} ${m.fg}`}>
      <Icon size={size === 'sm' ? 11 : 12} strokeWidth={2.6} />{lang === 'el' ? m.el : m.en}
    </span>
  )
}

export function Meter({ value, max, tone = 'volt', height = 'h-1.5' }: { value: number; max: number; tone?: 'volt' | 'good' | 'warn' | 'bad'; height?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const bar = { volt: 'bg-volt', good: 'bg-good', warn: 'bg-warn', bad: 'bg-bad' }[tone]
  return (
    <div className={`w-full rounded-full bg-grid overflow-hidden ${height}`} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={`h-full rounded-full transition-all duration-500 ${bar}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <span
      className="rounded-full bg-raised border border-line grid place-items-center display font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </span>
  )
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props
  return (
    <div className="relative">
      <select className={`w-full h-9 px-3 bg-sunk border border-line rounded-[6px] text-[13px] focus:border-volt transition-colors pr-8 cursor-pointer ${className}`} {...rest} />
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
    </div>
  )
}

export const inputCls = 'w-full h-9 px-3 bg-sunk border border-line rounded-[6px] text-[13px] focus:border-volt transition-colors'

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow text-mute block mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-mute mt-1">{hint}</span>}
    </label>
  )
}

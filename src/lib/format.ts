const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

export function formatCurrency(amount: number): string {
  return currencyFormatter.format(amount)
}

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', opts ?? { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function formatTime12(time24: string): string {
  const [hStr, mStr] = time24.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export function dayName(dayOfWeek: number, short = false): string {
  const name = DAY_NAMES[dayOfWeek] ?? ''
  return short ? name.slice(0, 3) : name
}

/** Whole days between "now" and a future/past ISO date. Negative = in the past. */
export function daysUntil(iso: string): number {
  const target = new Date(iso)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const ms = target.getTime() - now.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

export function relativeTime(iso: string): string {
  const target = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = target - now
  const diffMins = Math.round(diffMs / 60000)
  const abs = Math.abs(diffMins)

  if (abs < 1) return 'just now'
  if (abs < 60) return diffMins > 0 ? `in ${abs} min` : `${abs} min ago`
  const diffHours = Math.round(diffMins / 60)
  if (Math.abs(diffHours) < 24) return diffHours > 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`
  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) return diffDays > 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`
  return formatDate(iso)
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function formatAgendaDate(iso: string): string {
  const target = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => {
    const copy = new Date(d)
    copy.setHours(0, 0, 0, 0)
    return copy
  }
  const dayDiff = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / (1000 * 60 * 60 * 24),
  )
  const time = target.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  if (dayDiff === 0) return `Today · ${time}`
  if (dayDiff === 1) return `Tomorrow · ${time}`
  return `${target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · ${time}`
}

export function formatMemberId(userId: string): string {
  const clean = userId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(8, '0').slice(-8)
  return `FP-${clean.slice(0, 4)}-${clean.slice(4)}`
}

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

import { Ban, CheckCircle2, Snowflake, TriangleAlert, XCircle, type LucideIcon } from 'lucide-react'
import { displayStatus, type MemberDisplayStatus } from '@/lib/access'
import { TONES, type Tone } from '@/lib/colors'
import type { Membership } from '@/types'

const META: Record<MemberDisplayStatus, { icon: LucideIcon; tone: Tone; label: string }> = {
  active: { icon: CheckCircle2, tone: 'good', label: 'Active' },
  expiring: { icon: TriangleAlert, tone: 'warn', label: 'Expiring' },
  expired: { icon: XCircle, tone: 'bad', label: 'Expired' },
  frozen: { icon: Snowflake, tone: 'froze', label: 'Frozen' },
  cancelled: { icon: Ban, tone: 'slate', label: 'Cancelled' },
}

export function StatusPill({ membership, size = 'md' }: { membership: Membership; size?: 'sm' | 'md' }) {
  const status = displayStatus(membership)
  const meta = META[status]
  const classes = TONES[meta.tone]
  const pad = size === 'sm' ? 'h-5 gap-1 px-1.5 text-[10px]' : 'h-6 gap-1.5 px-2 text-[10.5px]'
  return (
    <span
      className={`font-display inline-flex items-center whitespace-nowrap rounded-full font-bold uppercase tracking-[.05em] ${pad} ${classes.soft}`}
    >
      <meta.icon className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} strokeWidth={2.6} />
      {meta.label}
    </span>
  )
}

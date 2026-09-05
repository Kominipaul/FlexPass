import { Check, Sparkles } from 'lucide-react'
import type { BillingCycle, Plan } from '@/types'
import { formatCurrency } from '@/lib/format'
import { TONES, toneOf } from '@/lib/colors'

interface PlanCardProps {
  plan: Plan
  billingCycle: BillingCycle
  selected?: boolean
  current?: boolean
  onSelect?: () => void
  /** Browsing only — no click does anything. Used where switching plans isn't self-service. */
  readOnly?: boolean
}

export function PlanCard({ plan, billingCycle, selected, current, onSelect, readOnly }: PlanCardProps) {
  const classes = TONES[toneOf(plan.color)]
  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const period = billingCycle === 'yearly' ? '/year' : '/month'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={current || readOnly}
      className={`relative flex w-full flex-col rounded-[12px] border-2 p-5 text-left transition-all ${
        selected ? 'border-volt bg-voltsoft/40 shadow-glow' : 'border-line bg-surface hover:border-voltline'
      } ${current || readOnly ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {plan.popular && !current && (
        <span className="font-display absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-bg">
          <Sparkles className="h-3 w-3 text-volt" />
          Most popular
        </span>
      )}
      {current && (
        <span className="font-display absolute -top-3 left-5 rounded-full bg-volt px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[.04em] text-voltink">
          Current plan
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} />
        <h3 className="font-display text-[14px] font-bold uppercase tracking-[.03em] text-ink">{plan.name}</h3>
      </div>
      <p className="mt-1 text-[12.5px] text-dim">{plan.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display tnum text-[28px] font-extrabold text-ink">{formatCurrency(price)}</span>
        <span className="text-[12.5px] font-medium text-mute">{period}</span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-[12.5px] text-dim">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${classes.text}`} strokeWidth={2.5} />
            {perk}
          </li>
        ))}
      </ul>

      <div
        className={`font-display mt-5 flex h-10 items-center justify-center rounded-[7px] text-[11.5px] font-bold uppercase tracking-[.05em] ${
          current ? 'bg-goodsoft text-good' : readOnly ? 'bg-raised text-mute' : selected ? 'bg-volt text-voltink' : 'bg-raised text-dim'
        }`}
      >
        {current ? 'Your plan' : readOnly ? 'Ask the front desk' : selected ? 'Selected' : 'Select plan'}
      </div>
    </button>
  )
}

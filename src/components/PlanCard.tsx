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
}

export function PlanCard({ plan, billingCycle, selected, current, onSelect }: PlanCardProps) {
  const classes = TONES[toneOf(plan.color)]
  const price = billingCycle === 'yearly' ? plan.priceYearly : plan.priceMonthly
  const period = billingCycle === 'yearly' ? '/year' : '/month'

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={current}
      className={`relative flex w-full flex-col rounded-2xl border-2 p-5 text-left transition-all ${
        selected
          ? 'border-brand-500 bg-brand-50/50 shadow-pop'
          : 'border-slate-100 bg-white hover:border-slate-200'
      } ${current ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {plan.popular && !current && (
        <span className="absolute -top-3 left-5 flex items-center gap-1 rounded-full bg-ink-950 px-2.5 py-1 text-[11px] font-bold text-white">
          <Sparkles className="h-3 w-3 text-lime-300" />
          Most popular
        </span>
      )}
      {current && (
        <span className="absolute -top-3 left-5 rounded-full bg-lime-500 px-2.5 py-1 text-[11px] font-bold text-ink-950">
          Current plan
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} />
        <h3 className="text-base font-bold text-ink-900">{plan.name}</h3>
      </div>
      <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>

      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold text-ink-900">{formatCurrency(price)}</span>
        <span className="text-sm font-medium text-slate-400">{period}</span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {plan.perks.map((perk) => (
          <li key={perk} className="flex items-start gap-2 text-sm text-ink-700">
            <Check className={`mt-0.5 h-4 w-4 shrink-0 ${classes.text}`} />
            {perk}
          </li>
        ))}
      </ul>

      <div
        className={`mt-5 flex h-10 items-center justify-center rounded-xl text-sm font-semibold ${
          current
            ? 'bg-lime-100 text-lime-700'
            : selected
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-ink-700'
        }`}
      >
        {current ? 'Your plan' : selected ? 'Selected' : 'Select plan'}
      </div>
    </button>
  )
}

import type { BillingCycle } from '@/types'

export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle
  onChange: (cycle: BillingCycle) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
      {(['monthly', 'yearly'] as const).map((cycle) => (
        <button
          key={cycle}
          type="button"
          onClick={() => onChange(cycle)}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold capitalize transition-colors ${
            value === cycle ? 'bg-white text-ink-900 shadow-sm' : 'text-slate-500 hover:text-ink-700'
          }`}
        >
          {cycle}
          {cycle === 'yearly' && (
            <span className="rounded-full bg-lime-100 px-1.5 py-0.5 text-[10px] font-bold text-lime-700">
              2 months free
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

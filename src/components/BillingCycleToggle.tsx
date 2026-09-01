import type { BillingCycle } from '@/types'

export function BillingCycleToggle({
  value,
  onChange,
}: {
  value: BillingCycle
  onChange: (cycle: BillingCycle) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-[9px] border border-line bg-raised p-1">
      {(['monthly', 'yearly'] as const).map((cycle) => (
        <button
          key={cycle}
          type="button"
          onClick={() => onChange(cycle)}
          className={`font-display flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-[11.5px] font-bold uppercase tracking-[.05em] transition-colors ${
            value === cycle ? 'bg-volt text-voltink' : 'text-dim hover:text-ink'
          }`}
        >
          {cycle}
          {cycle === 'yearly' && (
            <span className="rounded-full bg-goodsoft px-1.5 py-0.5 text-[9.5px] font-bold text-good">
              2 months free
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

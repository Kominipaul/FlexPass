import type { ReactNode } from 'react'

export const inputCls =
  'h-10 w-full rounded-[6px] border border-line bg-sunk px-3 text-[13px] text-ink placeholder:text-mute transition-colors focus:border-volt focus:outline-none'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-mute">{hint}</span>}
    </label>
  )
}

interface TabItem {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ items, active, onChange, className = '' }: TabsProps) {
  return (
    <div
      role="tablist"
      className={`flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 ${className}`}
    >
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(item.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              isActive ? 'bg-white text-ink-900 shadow-sm' : 'text-slate-500 hover:text-ink-700'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

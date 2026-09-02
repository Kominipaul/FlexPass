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
      className={`flex w-full gap-1 overflow-x-auto rounded-[9px] border border-line bg-raised p-1 ${className}`}
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
            className={`font-display flex shrink-0 items-center gap-1.5 rounded-[6px] px-3.5 py-2 text-[11.5px] font-bold uppercase tracking-[.05em] transition-colors ${
              isActive ? 'bg-volt text-voltink' : 'text-dim hover:text-ink'
            }`}
          >
            {item.label}
            {typeof item.count === 'number' && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  isActive ? 'bg-voltink/15 text-voltink' : 'bg-line text-dim'
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

interface BarDatum {
  label: string
  value: number
  isToday?: boolean
}

export function MiniBarChart({ data, height = 96 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div className="flex items-stretch gap-1.5 sm:gap-2" style={{ height }}>
      {data.map((d, i) => {
        const pct = d.value === 0 ? 4 : Math.max(10, (d.value / max) * 100)
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                title={`${d.label}: ${d.value}`}
                className={`w-full max-w-[22px] rounded-t-[3px] transition-all duration-500 ${
                  d.isToday ? 'bg-volt' : d.value > 0 ? 'bg-voltline' : 'bg-line'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span
              className={`text-[9.5px] font-semibold uppercase tracking-[.04em] ${d.isToday ? 'text-volt' : 'text-mute'}`}
            >
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

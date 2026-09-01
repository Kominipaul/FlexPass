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
                className={`w-full max-w-[22px] rounded-t-md transition-all duration-500 ${
                  d.isToday ? 'bg-brand-600' : d.value > 0 ? 'bg-brand-200' : 'bg-slate-100'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] font-semibold ${d.isToday ? 'text-brand-600' : 'text-slate-400'}`}>
              {d.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import type { DayBucket } from '@/lib/adminStats'
import type { Location } from '@/types'

function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h}V${y + rr}a${rr},${rr} 0 0 1 ${rr},-${rr}h${w - 2 * rr}a${rr},${rr} 0 0 1 ${rr},${rr}V${y + h}Z`
}

const SERIES_COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)']

export function WeekChart({ data, locations }: { data: DayBucket[]; locations: Location[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 190
  const padL = 30
  const padR = 8
  const padT = 18
  const padB = 22

  const max = Math.max(...data.flatMap((d) => locations.map((l) => d.values[l.id] ?? 0)), 1)
  const gw = (W - padL - padR) / data.length
  const bw = (gw - 10) / Math.max(locations.length, 1)
  const ticks = [0, Math.round(max / 2), max]

  return (
    <div className="relative">
      <div className="mb-1.5 flex items-center gap-4">
        {locations.map((l, i) => (
          <span key={l.id} className="inline-flex items-center gap-1.5 text-[11.5px] text-dim">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
            {l.name.replace('FlexPass ', '')}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[190px] w-full" role="img" aria-label="Location comparison">
        {ticks.map((tick) => {
          const y = padT + (1 - tick / max) * (H - padT - padB)
          return (
            <g key={tick}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={9.5} fill="var(--mute)">
                {tick}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const base = padL + i * gw + 5
          const isLast = i === data.length - 1
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * gw} y={padT} width={gw} height={H - padT - padB} fill="transparent" />
              {locations.map((l, li) => {
                const v = d.values[l.id] ?? 0
                const h = (v / max) * (H - padT - padB)
                const y = padT + (H - padT - padB - h)
                const x = base + li * (bw + 2)
                return (
                  <g key={l.id}>
                    <path
                      d={barPath(x, y, bw, h, 3)}
                      fill={SERIES_COLORS[li % SERIES_COLORS.length]}
                      opacity={hover === null || hover === i ? 1 : 0.35}
                      style={{ transition: 'opacity .15s' }}
                    />
                    {isLast && v > 0 && (
                      <text x={x + bw / 2} y={y - 5} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--ink)">
                        {v}
                      </text>
                    )}
                  </g>
                )
              })}
              <text x={base + bw} y={H - 6} textAnchor="middle" fontSize={9.5} fill="var(--mute)">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] border border-line bg-raised px-2.5 py-1.5 text-[11.5px] shadow-lift"
          style={{ left: `${((padL + hover * gw + gw / 2) / W) * 100}%`, top: 50 }}
        >
          <span className="font-semibold text-ink">{data[hover].label}</span>
          <span className="font-mono block text-dim">
            {locations.map((l) => `${l.name.replace('FlexPass ', '').slice(0, 2).toUpperCase()} ${data[hover].values[l.id] ?? 0}`).join(' · ')}
          </span>
        </div>
      )}
    </div>
  )
}

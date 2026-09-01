import { useState } from 'react'
import type { HourBucket } from '@/lib/adminStats'
import { sumValues } from '@/lib/adminStats'

function barPath(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h))
  return `M${x},${y + h}V${y + rr}a${rr},${rr} 0 0 1 ${rr},-${rr}h${w - 2 * rr}a${rr},${rr} 0 0 1 ${rr},${rr}V${y + h}Z`
}

export function PeakHoursChart({ data, scope }: { data: HourBucket[]; scope: 'all' | string }) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 720
  const H = 190
  const padL = 28
  const padR = 8
  const padT = 16
  const padB = 22

  const values = data.map((d) => (scope === 'all' ? sumValues(d.values) : (d.values[scope] ?? 0)))
  const max = Math.max(...values, 1)
  const peakIdx = values.indexOf(Math.max(...values))
  const iw = (W - padL - padR) / data.length
  const bw = iw - 4
  const ticks = [0, Math.round(max / 2), max]

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[190px] w-full" role="img" aria-label="Traffic by hour">
        {ticks.map((tick) => {
          const y = padT + (1 - tick / max) * (H - padT - padB)
          return (
            <g key={tick}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text x={padL - 6} y={y + 3.5} textAnchor="end" fontSize={9.5} fill="var(--mute)" fontFamily="var(--font-mono, monospace)">
                {tick}
              </text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const v = values[i]
          const h = (v / max) * (H - padT - padB)
          const x = padL + i * iw + 2
          const y = padT + (H - padT - padB - h)
          const isPeak = i === peakIdx && v > 0
          return (
            <g key={d.hour} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * iw} y={padT} width={iw} height={H - padT - padB} fill="transparent" />
              <path
                d={barPath(x, y, bw, h, 3)}
                fill={isPeak ? 'var(--volt)' : 'var(--s1)'}
                opacity={hover === null || hover === i ? (isPeak ? 1 : 0.78) : 0.34}
                style={{ transition: 'opacity .15s' }}
              />
              {i % 3 === 0 && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize={9.5} fill="var(--mute)">
                  {String(d.hour).padStart(2, '0')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[6px] border border-line bg-raised px-2.5 py-1.5 text-[11.5px] shadow-lift"
          style={{ left: `${((padL + hover * iw + iw / 2) / W) * 100}%`, top: 36 }}
        >
          <span className="font-mono font-semibold text-ink">{String(data[hover].hour).padStart(2, '0')}:00</span>
          <span className="text-dim"> · </span>
          <span className="font-mono text-ink">{values[hover]}</span>
        </div>
      )}
    </div>
  )
}

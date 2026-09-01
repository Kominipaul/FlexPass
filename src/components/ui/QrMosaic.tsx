import { useMemo } from 'react'
import { generateQrPattern } from '@/lib/qrPattern'

export function QrMosaic({ seed, size = 168, dark = false }: { seed: string; size?: number; dark?: boolean }) {
  const grid = useMemo(() => generateQrPattern(seed), [seed])
  const cells = grid.length
  const cellSize = size / cells

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Membership QR code">
      <rect width={size} height={size} rx={12} fill={dark ? '#0b0e14' : '#ffffff'} />
      {grid.map((row, r) =>
        row.map(
          (filled, c) =>
            filled && (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize + 1}
                y={r * cellSize + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                rx={1.5}
                fill={dark ? '#e2e8f0' : '#0b0e14'}
              />
            ),
        ),
      )}
    </svg>
  )
}

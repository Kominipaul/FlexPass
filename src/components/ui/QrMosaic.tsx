import { useEffect, useRef } from 'react'
import { rngFromSeed } from '@/lib/qrPattern'

interface QrMosaicProps {
  seed: string
  size?: number
  /** true = dark modules on a white tile (for placement on a dark card); false = light modules on dark */
  light?: boolean
}

export function QrMosaic({ seed, size = 168, light = true }: QrMosaicProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const modules = 29
    const quiet = 2
    const total = modules + quiet * 2
    const cell = size / total
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const bg = light ? '#ffffff' : '#0b0e14'
    const fg = light ? '#07080a' : '#e2e8f0'
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, size, size)
    ctx.fillStyle = fg

    const rand = rngFromSeed(seed)
    const isFinderZone = (x: number, y: number) =>
      (x < 7 && y < 7) ||
      (x >= modules - 7 && y < 7) ||
      (x < 7 && y >= modules - 7) ||
      (x >= modules - 9 && x <= modules - 5 && y >= modules - 9 && y <= modules - 5)

    const dot = (x: number, y: number, on: boolean) => {
      if (!on) return
      ctx.fillRect((x + quiet) * cell, (y + quiet) * cell, cell * 0.92, cell * 0.92)
    }
    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        if (!isFinderZone(x, y)) dot(x, y, rand() > 0.52)
      }
    }
    // timing pattern
    for (let i = 8; i < modules - 8; i++) {
      dot(i, 6, i % 2 === 0)
      dot(6, i, i % 2 === 0)
    }
    // finder "eyes" — outer ring, white gap, inner square
    const eye = (ox: number, oy: number, edge: number) => {
      ctx.fillStyle = fg
      ctx.fillRect((ox + quiet) * cell, (oy + quiet) * cell, cell * edge, cell * edge)
      ctx.fillStyle = bg
      ctx.fillRect((ox + 1 + quiet) * cell, (oy + 1 + quiet) * cell, cell * (edge - 2), cell * (edge - 2))
      ctx.fillStyle = fg
      ctx.fillRect((ox + 2 + quiet) * cell, (oy + 2 + quiet) * cell, cell * (edge - 4), cell * (edge - 4))
    }
    eye(0, 0, 7)
    eye(modules - 7, 0, 7)
    eye(0, modules - 7, 7)
    eye(modules - 9, modules - 9, 5)
  }, [seed, size, light])

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size }}
      className="block rounded-[3px]"
      aria-label="Access pass QR code"
      role="img"
    />
  )
}

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface QrCodeProps {
  /** The exact string to encode — e.g. a signed check-in token. Whatever a camera decodes back is this string, verbatim. */
  value: string
  /** Displayed size in CSS px (square). Rendered at devicePixelRatio for a crisp, reliably-scannable image regardless of size. */
  size?: number
  className?: string
  /** Accessible label — what a screen reader announces in place of the (undecodable-by-them) image. */
  label?: string
}

/**
 * Renders a real, camera-scannable QR code (via the `qrcode` package) —
 * not a decorative lookalike. Whatever string is passed as `value` is
 * exactly what a QR reader (this app's own camera scanner included) gets
 * back from decoding the rendered image.
 *
 * Always rendered dark-on-light: QR contrast conventions exist for a
 * reason, and a real scanner's reliability matters more than matching the
 * surrounding dark theme — see the white tile this is always placed in.
 */
export function QrCode({ value, size = 200, className = '', label = 'Check-in QR code' }: QrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !value) return
    let cancelled = false
    const dpr = Math.min(window.devicePixelRatio || 1, 3)

    QRCode.toCanvas(canvas, value, {
      width: Math.round(size * dpr),
      margin: 2,
      errorCorrectionLevel: 'Q',
      color: { dark: '#07080a', light: '#ffffffff' },
    })
      .then(() => {
        if (cancelled) return
        // toCanvas sets the canvas's CSS size to match its drawing-buffer
        // size (`width` above); shrink it back to the intended display
        // size so the extra buffer resolution reads as crisp, not huge.
        canvas.style.width = `${size}px`
        canvas.style.height = `${size}px`
        setFailed(false)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [value, size])

  return (
    <div
      className={`inline-flex items-center justify-center rounded-[10px] bg-white p-2.5 ${className}`}
      style={{ width: size + 20, height: size + 20 }}
    >
      {failed ? (
        <p className="max-w-[10rem] text-center text-[11px] font-medium text-red-600">
          Couldn't generate a code. Reload the page.
        </p>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={label} style={{ width: size, height: size }} />
      )}
    </div>
  )
}

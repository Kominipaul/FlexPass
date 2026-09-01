import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

/**
 * Renders a REAL, scannable QR code (via the `qrcode` package's Reed–
 * Solomon encoder) for whatever payload it's given — no placeholder
 * pixels. The payload here is always "<member_code>:<hmac_token>",
 * computed in lib/doorpass.ts and verifiable by the same algorithm on
 * the server (internal/doorpass, see the shared test vector in
 * doorpass_test.go).
 */
export function QrCode({ payload, size = 190 }: { payload: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!ref.current) return
    QRCode.toCanvas(ref.current, payload, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#07080A', light: '#FFFFFF' },
    }).catch((err) => console.error('QR render failed', err))
  }, [payload, size])

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="block rounded-[3px]"
      aria-label="Access pass QR code"
      role="img"
    />
  )
}

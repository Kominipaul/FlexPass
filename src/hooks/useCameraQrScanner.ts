import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

export type CameraScanStatus = 'idle' | 'starting' | 'scanning' | 'error'

export interface UseCameraQrScannerOptions {
  /** Camera only runs while true — set false to release it (tab not active, showing a result, page unmounted). */
  active: boolean
  onDecode: (text: string) => void
  /** Minimum ms between accepted decodes, so a code held in frame doesn't fire repeatedly. */
  cooldownMs?: number
}

export interface UseCameraQrScannerResult {
  videoRef: React.RefObject<HTMLVideoElement>
  status: CameraScanStatus
  error: string | null
  /** Re-attempt starting the camera after an error (e.g. the user granted permission and wants to try again). */
  retry: () => void
}

/**
 * Drives a real camera-based QR scan: requests the device camera, streams
 * it into a <video> (via `videoRef`), and on every animation frame draws
 * the current frame to an offscreen canvas and runs it through jsQR — an
 * actual QR image decoder, not a simulated result. `onDecode` fires with
 * whatever string jsQR reads out of the frame, throttled by `cooldownMs`.
 */
export function useCameraQrScanner({
  active,
  onDecode,
  cooldownMs = 2500,
}: UseCameraQrScannerOptions): UseCameraQrScannerResult {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<CameraScanStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  // Kept in a ref so the effect below doesn't need to restart the camera
  // every time the caller passes a new inline onDecode function.
  const onDecodeRef = useRef(onDecode)
  onDecodeRef.current = onDecode

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    if (!active) {
      setStatus('idle')
      return
    }
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('error')
      setError('This browser cannot access a camera. Check members in with Staff · backup entry.')
      return
    }

    // Captured once, synchronously, rather than re-read from the ref later —
    // the element this effect attaches a stream to is guaranteed to still be
    // the one its cleanup detaches it from, even across the async gap while
    // getUserMedia() is pending.
    const video = videoRef.current
    if (!video) {
      setStatus('error')
      setError('Could not start the camera. Check members in with Staff · backup entry.')
      return
    }

    let cancelled = false
    let stream: MediaStream | null = null
    let rafId = 0
    let workCanvas: HTMLCanvasElement | null = null
    let lastDecodeAt = 0

    setStatus('starting')
    setError(null)

    // Arrow function *expressions* assigned via const, not hoisted function
    // declarations — TypeScript can then prove `video` (narrowed to non-null
    // above) is still non-null wherever these close over it, since neither
    // can run before that narrowing is established.
    const tick = () => {
      if (cancelled) return
      if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        if (!workCanvas) workCanvas = document.createElement('canvas')
        if (workCanvas.width !== video.videoWidth) workCanvas.width = video.videoWidth
        if (workCanvas.height !== video.videoHeight) workCanvas.height = video.videoHeight
        const ctx = workCanvas.getContext('2d', { willReadFrequently: true })
        if (ctx) {
          ctx.drawImage(video, 0, 0, workCanvas.width, workCanvas.height)
          const frame = ctx.getImageData(0, 0, workCanvas.width, workCanvas.height)
          const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
          const now = performance.now()
          if (code?.data && now - lastDecodeAt > cooldownMs) {
            lastDecodeAt = now
            onDecodeRef.current(code.data)
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = stream
        video.muted = true
        video.setAttribute('playsinline', 'true') // iOS Safari: without this, video playback forces fullscreen
        await video.play()
        if (cancelled) return
        setStatus('scanning')
        tick()
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setError(describeCameraError(err))
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (rafId) cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
      video.srcObject = null
    }
  }, [active, cooldownMs, attempt])

  return { videoRef, status, error, retry }
}

function describeCameraError(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'Camera access was denied. Allow it in your browser, or use Staff · backup entry.'
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'No camera was found on this device. Use Staff · backup entry.'
    }
    if (err.name === 'NotReadableError') {
      return 'The camera is already in use by another app. Use Staff · backup entry.'
    }
  }
  return 'Could not start the camera. Check members in with Staff · backup entry.'
}

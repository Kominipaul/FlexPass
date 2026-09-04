import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Drag-to-dismiss for the things that slide in from an edge — the bottom
 * sheets and the nav drawer.
 *
 * On a phone these read as physical objects, so they have to behave like
 * them: a sheet that only closes if you find the little X in the corner is
 * a desktop dialog wearing a sheet costume. Push it down and it goes down;
 * let go halfway and it snaps back.
 *
 * Two details that matter more than they look:
 *
 *  - The transform is written straight to the DOM node during the drag
 *    rather than through React state, so following a finger doesn't mean a
 *    re-render of the sheet's whole subtree every frame.
 *  - `touchmove` is registered manually with `{ passive: false }`. React
 *    attaches its own touch listeners passively at the root, so a
 *    `preventDefault()` from a React `onTouchMove` prop is ignored and the
 *    page scrolls underneath the sheet while you're dragging it.
 */
export type SwipeDirection = 'down' | 'left'

interface UseSwipeDismissOptions {
  /** Only wire the gesture up when the surface is actually open (and, usually, only on small screens). */
  enabled: boolean
  direction?: SwipeDirection
  onDismiss: () => void
  /**
   * A scrollable region inside the panel. A downward drag starting while
   * this is scrolled away from the top scrolls the content instead of
   * moving the sheet — the same rule native sheets use.
   */
  scrollRef?: RefObject<HTMLElement | null>
  /** Backdrop fades out in step with the drag. */
  backdropRef?: RefObject<HTMLElement | null>
  /** Distance past which release dismisses instead of snapping back. */
  threshold?: number
}

interface SwipeDismissApi {
  /** Attach to the sliding panel. */
  panelRef: RefObject<HTMLDivElement>
  /** True while a finger is on it — used to drop the CSS transition so it tracks 1:1. */
  dragging: boolean
  /** True once dismissal has been committed and the panel is animating off-screen. */
  closing: boolean
  /** Run the exit animation, then dismiss. Use this for the X button and the backdrop too, so every close looks the same. */
  dismiss: () => void
}

/** Past the edge, movement gets heavy instead of stopping dead. */
function rubberBand(distance: number): number {
  return Math.sign(distance) * Math.pow(Math.abs(distance), 0.7) * 0.5
}

const EXIT_MS = 200

export function useSwipeDismiss({
  enabled,
  direction = 'down',
  onDismiss,
  scrollRef,
  backdropRef,
  threshold = 88,
}: UseSwipeDismissOptions): SwipeDismissApi {
  const panelRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const exitTimer = useRef<number | undefined>(undefined)

  const paint = useCallback(
    (distance: number, animate: boolean) => {
      const panel = panelRef.current
      if (!panel) return
      const axis = direction === 'down' ? 'Y' : 'X'
      const signed = direction === 'down' ? distance : -distance
      panel.style.transition = animate ? `transform ${EXIT_MS}ms cubic-bezier(.22,.8,.3,1)` : 'none'
      panel.style.transform = distance === 0 ? '' : `translate${axis}(${signed}px)`

      const backdrop = backdropRef?.current
      if (backdrop) {
        const span = direction === 'down' ? panel.offsetHeight : panel.offsetWidth
        const fade = span > 0 ? Math.max(0, 1 - Math.max(0, distance) / span) : 1
        backdrop.style.transition = animate ? `opacity ${EXIT_MS}ms ease` : 'none'
        backdrop.style.opacity = String(fade)
      }
    },
    [direction, backdropRef],
  )

  const dismiss = useCallback(() => {
    const panel = panelRef.current
    if (!panel) {
      onDismiss()
      return
    }
    setClosing(true)
    paint(direction === 'down' ? panel.offsetHeight : panel.offsetWidth, true)
    window.clearTimeout(exitTimer.current)
    exitTimer.current = window.setTimeout(onDismiss, EXIT_MS)
  }, [direction, onDismiss, paint])

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  useEffect(() => {
    const panel = panelRef.current
    if (!enabled || !panel) return

    let startX = 0
    let startY = 0
    let startedAt = 0
    let engaged: boolean | null = null
    let distance = 0

    function measure(touch: Touch): number {
      return direction === 'down' ? touch.clientY - startY : startX - touch.clientX
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      startedAt = e.timeStamp
      engaged = null
      distance = 0
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return
      const dx = e.touches[0].clientX - startX
      const dy = e.touches[0].clientY - startY

      if (engaged === null) {
        const moved = Math.max(Math.abs(dx), Math.abs(dy))
        if (moved < 6) return
        if (direction === 'down') {
          const scrolledDown = (scrollRef?.current?.scrollTop ?? 0) > 0
          engaged = Math.abs(dy) > Math.abs(dx) && dy > 0 && !scrolledDown
        } else {
          engaged = Math.abs(dx) > Math.abs(dy) && dx < 0
        }
        if (!engaged) return
        setDragging(true)
      }
      if (!engaged) return

      e.preventDefault()
      const raw = measure(e.touches[0])
      distance = raw >= 0 ? raw : rubberBand(raw)
      paint(distance, false)
    }

    function onTouchEnd(e: TouchEvent) {
      if (engaged !== true) return
      engaged = null
      setDragging(false)
      const velocity = distance / Math.max(1, e.timeStamp - startedAt)
      if (distance > threshold || velocity > 0.5) dismiss()
      else paint(0, true)
    }

    panel.addEventListener('touchstart', onTouchStart, { passive: true })
    panel.addEventListener('touchmove', onTouchMove, { passive: false })
    panel.addEventListener('touchend', onTouchEnd)
    panel.addEventListener('touchcancel', onTouchEnd)
    return () => {
      panel.removeEventListener('touchstart', onTouchStart)
      panel.removeEventListener('touchmove', onTouchMove)
      panel.removeEventListener('touchend', onTouchEnd)
      panel.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [enabled, direction, scrollRef, threshold, dismiss, paint])

  return { panelRef, dragging, closing, dismiss }
}

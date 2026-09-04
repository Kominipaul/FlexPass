import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useSwipeDismiss } from '@/hooks/useSwipeDismiss'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

const SIZE_CLASSES = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-2xl',
}

/** Below this the dialog is a bottom sheet you can throw away with your thumb; above it, a centred desktop dialog. */
const SHEET_QUERY = '(max-width: 639px)'

function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', icon }: ModalProps) {
  const titleId = useId()
  const isSheet = useMatchMedia(SHEET_QUERY)
  const backdropRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const { panelRef, dragging, closing, dismiss } = useSwipeDismiss({
    enabled: open && isSheet,
    direction: 'down',
    onDismiss: onClose,
    scrollRef: bodyRef,
    backdropRef,
  })

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      // Match the backdrop/handle/X path: on a sheet that means animating out.
      if (e.key === 'Escape') (isSheet ? dismiss() : onClose())
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose, isSheet, dismiss])

  if (!open) return null

  // Every exit runs the same animation, whether it came from a thumb, the
  // backdrop or the X — so closing never looks like two different things.
  const close = isSheet ? dismiss : onClose

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6">
      <div
        ref={backdropRef}
        className={`absolute inset-0 bg-black/70 backdrop-blur-[3px] ${dragging || closing ? '' : 'a-fade'}`}
        onClick={close}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-[20px] border border-line bg-surface shadow-lift sm:rounded-[14px] ${SIZE_CLASSES[size]} ${
          dragging || closing ? '' : 'a-sheet-in'
        }`}
        style={{ willChange: dragging ? 'transform' : undefined }}
      >
        {/* Grab handle — the affordance that says "you can throw this away". Touch target, not decoration. */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="flex h-6 w-full shrink-0 cursor-grab touch-none items-center justify-center pt-2.5 active:cursor-grabbing sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-line" />
        </button>

        <div className="flex items-start gap-3 border-b border-linesoft px-4 pb-3.5 pt-3.5 sm:px-5">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-voltline bg-voltsoft text-volt">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="font-display text-[14px] font-bold uppercase leading-snug tracking-[.05em] text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[12px] leading-snug text-dim">{description}</p>}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close dialog"
            className="-mr-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-raised hover:text-ink sm:flex"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={bodyRef} className="scroll-thin overflow-y-auto overscroll-contain p-4 sm:p-5">
          {children}
        </div>

        {footer && (
          <div
            className="flex flex-col-reverse gap-2 border-t border-linesoft bg-raised p-4 sm:flex-row sm:justify-end sm:rounded-b-[14px] sm:p-4"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {footer}
          </div>
        )}
        {!footer && <div className="sm:hidden" style={{ height: 'env(safe-area-inset-bottom)' }} />}
      </div>
    </div>,
    document.body,
  )
}

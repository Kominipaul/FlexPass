import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

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
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md', icon }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div
        className="a-fade absolute inset-0 bg-black/70 backdrop-blur-[3px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`a-rise relative flex max-h-[92vh] w-full ${SIZE_CLASSES[size]} flex-col rounded-t-[16px] border border-line bg-surface shadow-lift sm:rounded-[14px]`}
      >
        <div className="flex items-start gap-3 border-b border-linesoft p-4">
          {icon && (
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-voltline bg-voltsoft text-volt">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="font-display text-[14px] font-bold uppercase tracking-[.05em] text-ink">
              {title}
            </h2>
            {description && <p className="mt-1 text-[12px] text-dim">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-mute transition-colors hover:bg-raised hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto p-4">{children}</div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 rounded-b-[14px] border-t border-linesoft bg-raised p-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

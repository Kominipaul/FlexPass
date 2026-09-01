import { useEffect, type ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'

export function Modal({
  open, onClose, title, subtitle, icon: Icon, children, footer, width = 'max-w-md',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: LucideIcon
  children?: ReactNode
  footer?: ReactNode
  width?: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[3px] a-fade" onClick={onClose} />
      <div
        role="dialog" aria-modal="true" aria-label={title}
        className={`relative w-full ${width} bg-surface border border-line rounded-t-[16px] sm:rounded-[14px] shadow-lift a-rise max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-start gap-3 p-4 border-b border-linesoft">
          {Icon && (
            <span className="w-8 h-8 rounded-[7px] bg-voltsoft text-volt grid place-items-center mt-0.5 border border-voltline">
              <Icon size={16} />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="display text-[14px] font-bold uppercase tracking-[.05em]">{title}</h3>
            {subtitle && <p className="text-[12px] text-dim mt-1">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 grid place-items-center rounded-[6px] text-mute hover:text-ink hover:bg-raised transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">{children}</div>
        {footer && <div className="p-4 border-t border-linesoft flex justify-end gap-2 bg-raised rounded-b-[14px]">{footer}</div>}
      </div>
    </div>
  )
}

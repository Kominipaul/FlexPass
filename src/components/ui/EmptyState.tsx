import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-line px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-raised text-mute">
          {icon}
        </span>
      )}
      <div>
        <p className="font-display text-[12.5px] font-bold uppercase tracking-[.04em] text-ink">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-[12px] text-dim">{description}</p>}
      </div>
      {action}
    </div>
  )
}

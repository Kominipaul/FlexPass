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
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 px-6 py-12 text-center ${className}`}>
      {icon && (
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          {icon}
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-ink-800">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-xs text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

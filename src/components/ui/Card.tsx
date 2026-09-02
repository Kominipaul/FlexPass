import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`inner-top rounded-[12px] border border-line bg-surface shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  className?: string
}

export function CardHeader({ title, description, action, icon, className = '' }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 p-4 pb-0 sm:p-5 sm:pb-0 ${className}`}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border border-voltline bg-voltsoft text-volt">
            {icon}
          </span>
        )}
        <div>
          <h3 className="font-display text-[13px] font-bold uppercase tracking-[.05em] text-ink">{title}</h3>
          {description && <p className="mt-1 text-[12px] normal-case text-dim">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
}

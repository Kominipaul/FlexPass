import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: ReactNode
  /** Sits to the right of the title on wide screens, and drops under the subtitle on a phone. */
  action?: ReactNode
}

/**
 * One page-title treatment for the whole member app. Pages were each
 * rolling their own heading block with slightly different sizes and
 * margins, which is exactly the kind of drift you only notice as "this
 * feels a bit off" rather than as a bug.
 */
export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h2 className="font-display text-[21px] font-extrabold leading-tight tracking-[-.01em] text-ink sm:text-[23px]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

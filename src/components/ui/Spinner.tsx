import { Loader2 } from 'lucide-react'

export function Spinner({ className = 'h-5 w-5' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-volt ${className}`} aria-hidden="true" />
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-mute">
      <Spinner className="h-7 w-7" />
      <p className="font-display text-[11px] font-bold uppercase tracking-[.08em]">{label}</p>
    </div>
  )
}

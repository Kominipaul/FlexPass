import { Link } from 'react-router-dom'
import { Compass, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-bg px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[14px] bg-volt text-voltink">
        <Dumbbell className="h-8 w-8" />
      </span>
      <div>
        <h1 className="font-display text-[40px] font-extrabold tracking-tight text-ink">404</h1>
        <p className="mt-2 text-[13px] text-dim">
          This page skipped leg day — we couldn't find what you're looking for.
        </p>
      </div>
      <Link to="/">
        <Button iconLeft={<Compass className="h-4 w-4" />}>Back to dashboard</Button>
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Compass, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50 px-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white">
        <Dumbbell className="h-8 w-8" />
      </span>
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-ink-900">404</h1>
        <p className="mt-2 text-sm text-slate-500">
          This page skipped leg day — we couldn't find what you're looking for.
        </p>
      </div>
      <Link to="/">
        <Button iconLeft={<Compass className="h-4 w-4" />}>Back to dashboard</Button>
      </Link>
    </div>
  )
}

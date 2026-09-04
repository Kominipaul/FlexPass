import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Lock, LogIn, Mail, Sparkles, TriangleAlert } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'
import { isValidEmail } from '@/lib/validators'

const DEMO_EMAIL = 'demo@flexpass.app'
const DEMO_PASSWORD = 'flexpass123'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    setLoading(true)
    try {
      await login(email, password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function fillDemoCredentials() {
    setEmail(DEMO_EMAIL)
    setPassword(DEMO_PASSWORD)
    setError(null)
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to manage your membership.">
      <button
        type="button"
        onClick={fillDemoCredentials}
        className="mb-6 flex w-full items-center gap-2.5 rounded-[9px] border border-dashed border-voltline bg-voltsoft px-4 py-3 text-left text-[13px] text-ink transition-colors hover:brightness-110"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-volt" />
        <span>
          <span className="font-semibold text-volt">Demo account:</span> tap to fill {DEMO_EMAIL}. This account
          has secure sign-in codes enabled.
        </span>
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-[9px] border border-badsoft bg-badsoft px-3.5 py-3 text-[13px] text-bad">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          iconLeft={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          iconLeft={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[12.5px] text-dim">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-line bg-sunk text-volt focus:ring-0 focus:ring-offset-0"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-[12.5px] font-semibold text-volt hover:brightness-125">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={loading} iconLeft={<LogIn className="h-4 w-4" />}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-[12.5px] text-dim">
        New to FlexPass?{' '}
        <Link to="/signup" className="font-semibold text-volt hover:brightness-125">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}

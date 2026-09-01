import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, MailCheck, Wand2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { requestPasswordResetCode } from '@/lib/db'
import { isValidEmail } from '@/lib/validators'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ email: string; code: string | null } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const code = await requestPasswordResetCode(email)
      setResult({ email, code })
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset instructions">
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-sm text-slate-600">
            If an account exists for <span className="font-semibold text-ink-800">{result.email}</span>, we've
            sent a 6-digit reset code to it.
          </p>

          {result.code && (
            <div className="flex w-full items-start gap-2.5 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800">
              <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
              <div>
                <p className="font-semibold">Demo mode</p>
                <p>
                  No real email is sent here — your reset code is{' '}
                  <span className="font-mono font-bold tracking-wider">{result.code}</span>.
                </p>
              </div>
            </div>
          )}

          {result.code ? (
            <Button
              fullWidth
              size="lg"
              iconRight={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/reset-password', { state: { email: result.email, code: result.code } })}
            >
              Enter reset code
            </Button>
          ) : (
            <Link to="/login" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Back to sign in
            </Link>
          )}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your account email and we'll send you a reset code."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          iconLeft={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" size="lg" loading={loading}>
          Send reset code
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered it?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

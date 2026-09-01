import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, KeyRound, Lock, TriangleAlert, Wand2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { OtpInput } from '@/components/ui/OtpInput'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { resetPassword } from '@/lib/db'
import { isValidPassword } from '@/lib/validators'

interface ResetState {
  email: string
  code: string
}

export function ResetPasswordPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as ResetState | null

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!state?.email || !state?.code) navigate('/forgot-password', { replace: true })
  }, [state, navigate])

  if (!state?.email || !state?.code) return null

  async function handleSubmit() {
    if (code !== state!.code) {
      setError('That code is incorrect.')
      return
    }
    if (!isValidPassword(password)) {
      setError('Use 8+ characters with a mix of letters & numbers.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await resetPassword(state!.email, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password.">
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-100 text-lime-700">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <Button fullWidth size="lg" onClick={() => navigate('/login', { replace: true })}>
            Continue to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" subtitle={`Enter the code we sent for ${state.email}.`}>
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <p>
          Demo mode — your code is <span className="font-mono font-bold tracking-wider">{state.code}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div>
          <p className="mb-2 text-sm font-medium text-ink-800">Reset code</p>
          <OtpInput value={code} onChange={setCode} error={!!error} disabled={loading} />
        </div>

        <div>
          <Input
            label="New password"
            type="password"
            autoComplete="new-password"
            iconLeft={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-2">
            <PasswordStrengthMeter password={password} />
          </div>
        </div>
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          iconLeft={<Lock className="h-4 w-4" />}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <Button size="lg" loading={loading} onClick={handleSubmit} iconLeft={<KeyRound className="h-4 w-4" />}>
          Reset password
        </Button>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, TriangleAlert, Wand2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { OtpInput } from '@/components/ui/OtpInput'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/context/AuthContext'

export function VerifyCodePage() {
  const { pendingAuth, verifyCode, resendCode, cancelPendingAuth } = useAuth()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [justResent, setJustResent] = useState(false)

  useEffect(() => {
    if (!pendingAuth) navigate('/login', { replace: true })
  }, [pendingAuth, navigate])

  if (!pendingAuth) return null

  async function handleSubmit() {
    if (code.length !== 6) {
      setError('Enter the full 6-digit code.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await verifyCode(code)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify that code.')
    } finally {
      setLoading(false)
    }
  }

  function handleResend() {
    resendCode()
    setCode('')
    setError(null)
    setJustResent(true)
    window.setTimeout(() => setJustResent(false), 3000)
  }

  return (
    <AuthLayout
      title="Enter your security code"
      subtitle={`For your security, enter the 6-digit code to finish signing in as ${pendingAuth.email}.`}
    >
      <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 text-sm text-brand-800">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
        <div>
          <p className="font-semibold">Demo mode</p>
          <p>
            No real SMS/email is sent here — your code is{' '}
            <span className="font-mono font-bold tracking-wider">{pendingAuth.code}</span>.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <OtpInput value={code} onChange={setCode} error={!!error} disabled={loading} />

      <Button
        className="mt-6"
        size="lg"
        fullWidth
        loading={loading}
        onClick={handleSubmit}
        iconLeft={<ShieldCheck className="h-4 w-4" />}
      >
        Verify &amp; sign in
      </Button>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            cancelPendingAuth()
            navigate('/login', { replace: true })
          }}
          className="font-semibold text-slate-500 hover:text-slate-700"
        >
          Use a different account
        </button>
        <button
          type="button"
          onClick={handleResend}
          className="font-semibold text-brand-600 hover:text-brand-700"
        >
          {justResent ? 'New code sent ✓' : 'Resend code'}
        </button>
      </div>
    </AuthLayout>
  )
}

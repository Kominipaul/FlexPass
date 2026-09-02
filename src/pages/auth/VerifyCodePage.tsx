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
      <div className="mb-6 flex items-start gap-2.5 rounded-[9px] border border-dashed border-voltline bg-voltsoft px-4 py-3 text-[13px] text-ink">
        <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
        <div>
          <p className="font-semibold text-volt">Demo mode</p>
          <p>
            No real SMS/email is sent here — your code is{' '}
            <span className="font-mono font-bold tracking-wider">{pendingAuth.code}</span>.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-[9px] border border-badsoft bg-badsoft px-3.5 py-3 text-[13px] text-bad">
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

      <div className="mt-5 flex items-center justify-between text-[12.5px]">
        <button
          type="button"
          onClick={() => {
            cancelPendingAuth()
            navigate('/login', { replace: true })
          }}
          className="font-semibold text-mute hover:text-ink"
        >
          Use a different account
        </button>
        <button type="button" onClick={handleResend} className="font-semibold text-volt hover:brightness-125">
          {justResent ? 'New code sent ✓' : 'Resend code'}
        </button>
      </div>
    </AuthLayout>
  )
}

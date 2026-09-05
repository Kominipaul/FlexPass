import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Mail, MailCheck, Wand2 } from 'lucide-react'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/context/LanguageContext'
import { requestPasswordResetCode } from '@/lib/db'
import { isValidEmail } from '@/lib/validators'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ email: string; code: string | null } | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValidEmail(email)) {
      setError(t('forgotPassword.emailInvalid'))
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
      <AuthLayout title={t('forgotPassword.checkEmailTitle')} subtitle={t('forgotPassword.checkEmailSubtitle')}>
        <div className="flex flex-col items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-[12px] border border-voltline bg-voltsoft text-volt">
            <MailCheck className="h-6 w-6" />
          </span>
          <p className="text-[13px] text-dim">{t('forgotPassword.sentText', { email: result.email })}</p>

          {result.code && (
            <div className="flex w-full items-start gap-2.5 rounded-[9px] border border-dashed border-voltline bg-voltsoft px-4 py-3 text-[13px] text-ink">
              <Wand2 className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
              <div>
                <p className="font-semibold text-volt">{t('forgotPassword.demoMode')}</p>
                <p>{t('forgotPassword.demoText', { code: result.code })}</p>
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
              {t('forgotPassword.enterResetCode')}
            </Button>
          ) : (
            <Link to="/login" className="text-[12.5px] font-semibold text-volt hover:brightness-125">
              {t('forgotPassword.backToSignIn')}
            </Link>
          )}
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('forgotPassword.title')} subtitle={t('forgotPassword.subtitle')}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label={t('forgotPassword.email')}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          iconLeft={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error ?? undefined}
        />
        <Button type="submit" size="lg" loading={loading}>
          {t('forgotPassword.sendCode')}
        </Button>
      </form>
      <p className="mt-6 text-center text-[12.5px] text-dim">
        {t('forgotPassword.rememberedIt')}{' '}
        <Link to="/login" className="font-semibold text-volt hover:brightness-125">
          {t('forgotPassword.backToSignIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}

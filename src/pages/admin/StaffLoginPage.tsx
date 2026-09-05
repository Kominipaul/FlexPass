import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, LogIn, Mail, Sparkles, TriangleAlert } from 'lucide-react'
import { AdminAuthLayout } from '@/components/layout/AdminAuthLayout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useStaffAuth } from '@/context/StaffAuthContext'
import { useLanguage } from '@/context/LanguageContext'
import { isValidEmail } from '@/lib/validators'

const DEMO_EMAIL = 'staff@flexpass.app'
const DEMO_PASSWORD = 'flexpass123'

export function StaffLoginPage() {
  const { login } = useStaffAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setError(t('staffLogin.emailInvalid'))
      return
    }
    if (!password) {
      setError(t('staffLogin.passwordRequired'))
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('staffLogin.genericError'))
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
    <AdminAuthLayout title={t('staffLogin.title')} subtitle={t('staffLogin.subtitle')}>
      <button
        type="button"
        onClick={fillDemoCredentials}
        className="mb-6 flex w-full items-center gap-2.5 rounded-[9px] border border-dashed border-voltline bg-voltsoft px-4 py-3 text-left text-[13px] text-ink transition-colors hover:brightness-110"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-volt" />
        <span>
          <span className="font-semibold text-volt">{t('staffLogin.demoLabel')}</span>{' '}
          {t('staffLogin.demoText', { email: DEMO_EMAIL })}
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
          label={t('staffLogin.email')}
          type="email"
          autoComplete="email"
          placeholder="staff@flexpass.app"
          iconLeft={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t('staffLogin.password')}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          iconLeft={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" size="lg" loading={loading} iconLeft={<LogIn className="h-4 w-4" />}>
          {t('staffLogin.signIn')}
        </Button>
      </form>
    </AdminAuthLayout>
  )
}

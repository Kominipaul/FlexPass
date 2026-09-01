import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useL } from '../lib/i18n'
import { ApiError } from '../api/client'
import { Card, Button, inputCls, Field } from '../components/primitives'

export function LoginPage() {
  const { login } = useAuth()
  const { t, lang, setLang } = useL()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
      nav('/')
    } catch (err) {
      setError(err instanceof ApiError ? (t(`err${err.code}`) !== `err${err.code}` ? t(`err${err.code}`) : err.message) : t('errNETWORK'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4">
      <div className="w-full max-w-[380px]">
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <span className="w-10 h-10 rounded-[9px] bg-volt text-voltink grid place-items-center display text-[14px] font-extrabold">PL</span>
          <div className="leading-none text-center">
            <p className="display text-[15px] font-extrabold uppercase tracking-[.06em]">Power Life <span className="text-volt">Gym</span></p>
          </div>
        </div>

        <Card className="p-5">
          <h1 className="display text-[18px] font-extrabold uppercase tracking-[.04em] mb-4">{t('loginTitle')}</h1>
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label={t('email')}>
              <input className={inputCls} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </Field>
            <Field label={t('password')}>
              <input className={inputCls} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && <p className="text-[12.5px] text-bad">{error}</p>}
            <Button type="submit" icon={LogIn} disabled={busy} className="w-full">
              {busy ? t('signingIn') : t('signIn')}
            </Button>
          </form>
          <p className="text-[12px] text-dim text-center mt-4">
            {t('noAccount')} <Link to="/register" className="text-volt font-semibold hover:underline">{t('signUp')}</Link>
          </p>
        </Card>

        <div className="flex justify-center gap-1 mt-4">
          {(['el', 'en'] as const).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`display h-7 px-2.5 text-[10.5px] font-bold tracking-[.08em] rounded-[5px] ${lang === l ? 'bg-volt text-voltink' : 'text-dim hover:text-ink'}`}>
              {l === 'el' ? 'ΕΛ' : 'EN'}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

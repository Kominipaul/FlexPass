import { useState, type FormEvent } from 'react'
import { Lock, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useStaffAuth } from '@/context/StaffAuthContext'
import { useKiosk } from '@/context/KioskContext'
import { useLanguage } from '@/context/LanguageContext'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import * as db from '@/lib/db'

/**
 * The only way back out of kiosk mode.
 *
 * Re-checks the signed-in staff member's own password rather than trusting
 * a bare "are you sure?" click — the whole point of locking the tablet is
 * that a tap anyone can make shouldn't be enough to unlock it. There's no
 * separate verify-password endpoint; this reuses POST /api/staff/login
 * against the account already signed in, which is the same check the
 * server would run for a real login and costs nothing extra to rely on.
 */
export function UnlockKioskDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { staff } = useStaffAuth()
  const { setKiosk } = useKiosk()
  const { t } = useLanguage()

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleClose() {
    setPassword('')
    setError(null)
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!staff) return
    if (!password) {
      setError(t('staffLogin.passwordRequired'))
      return
    }
    setLoading(true)
    setError(null)
    try {
      await db.staffLogin(staff.email, password, true)
      setKiosk(false)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('adminNav.unlockWrongPassword'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      icon={<Lock className="h-4 w-4" />}
      title={t('adminNav.unlockTablet')}
      description={staff ? t('adminNav.unlockConfirmText', { name: staff.name.split(' ')[0] }) : undefined}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-[9px] border border-badsoft bg-badsoft px-3.5 py-3 text-[13px] text-bad">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <Input
          label={t('staffLogin.password')}
          type="password"
          autoComplete="current-password"
          autoFocus
          placeholder="••••••••"
          iconLeft={<Lock className="h-4 w-4" />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex items-center gap-2 text-[11.5px] text-mute">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          {t('adminNav.unlockPasswordHint')}
        </div>
        <Button type="submit" loading={loading} iconLeft={<Lock className="h-3.5 w-3.5" />}>
          {t('adminNav.unlockButton')}
        </Button>
      </form>
    </Modal>
  )
}

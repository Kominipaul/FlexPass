import { useState } from 'react'
import {
  AlertTriangle,
  Bell,
  KeyRound,
  Lock,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PasswordStrengthMeter } from '@/components/ui/PasswordStrengthMeter'
import { formatDate } from '@/lib/format'
import { isValidPassword } from '@/lib/validators'
import { getNotificationPrefs, setNotificationPref, type NotificationPrefs } from '@/lib/notificationPrefs'
import { resetDemoData } from '@/lib/db'
import type { NotificationType } from '@/types'

const PREF_LABELS: { key: NotificationType; label: string; description: string }[] = [
  { key: 'renewal', label: 'Renewal reminders', description: 'Your membership is about to renew.' },
  { key: 'class', label: 'Class & group reminders', description: 'Upcoming bookings and waitlist updates.' },
  { key: 'billing', label: 'Billing receipts', description: 'Payments, invoices and plan changes.' },
  { key: 'security', label: 'Security alerts', description: 'Password changes and sign-in security.' },
  { key: 'achievement', label: 'Streaks & achievements', description: 'Visit streaks and milestones.' },
  { key: 'general', label: 'General announcements', description: 'Everything else from FlexPass.' },
]

export function SettingsPage() {
  const { user, changePassword, setTwoFactorEnabled, deleteAccount } = useAuth()
  const { showToast } = useToast()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [savingPassword, setSavingPassword] = useState(false)

  const [twoFactorBusy, setTwoFactorBusy] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs())

  const [resetOpen, setResetOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!user) return null

  async function handleChangePassword() {
    if (!currentPassword) {
      setPasswordError('Enter your current password.')
      return
    }
    if (!isValidPassword(newPassword)) {
      setPasswordError('Use 8+ characters with a mix of letters & numbers.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }
    setPasswordError(null)
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      showToast('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Could not update your password.')
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleToggleTwoFactor(next: boolean) {
    setTwoFactorBusy(true)
    try {
      await setTwoFactorEnabled(next)
      showToast(next ? 'Two-factor authentication enabled.' : 'Two-factor authentication disabled.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update security settings.', 'error')
    } finally {
      setTwoFactorBusy(false)
    }
  }

  function handleTogglePref(key: NotificationType, value: boolean) {
    setPrefs(setNotificationPref(key, value))
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Settings</h2>
        <p className="mt-1 text-sm text-slate-500">Security, notification preferences and account controls.</p>
      </div>

      <Card>
        <CardHeader icon={<Lock className="h-4 w-4" />} title="Password" description={`Last changed ${formatDate(user.security.lastPasswordChange)}`} />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:max-w-md">
            {passwordError && <p className="text-sm font-medium text-rose-600">{passwordError}</p>}
            <Input
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div>
              <Input
                label="New password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="mt-2">
                <PasswordStrengthMeter password={newPassword} />
              </div>
            </div>
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <Button className="self-start" loading={savingPassword} onClick={handleChangePassword} iconLeft={<KeyRound className="h-4 w-4" />}>
              Update password
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<ShieldCheck className="h-4 w-4" />} title="Two-factor authentication" />
        <CardBody>
          <Switch
            checked={user.security.twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            disabled={twoFactorBusy}
            label="Require a secure code at sign-in"
            description="Adds a 6-digit code step after your password when you log in."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Bell className="h-4 w-4" />} title="Notification preferences" description="Controls what appears in your notification center." />
        <CardBody className="flex flex-col gap-4">
          {PREF_LABELS.map((p) => (
            <Switch
              key={p.key}
              checked={prefs[p.key]}
              onChange={(value) => handleTogglePref(p.key, value)}
              label={p.label}
              description={p.description}
            />
          ))}
        </CardBody>
      </Card>

      <Card className="border-rose-100">
        <CardHeader icon={<AlertTriangle className="h-4 w-4 text-rose-600" />} title="Danger zone" />
        <CardBody className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-sm font-semibold text-ink-800">Reset demo data</p>
              <p className="text-xs text-slate-500">Wipes local demo data and restores the sample account.</p>
            </div>
            <Button variant="outline" onClick={() => setResetOpen(true)} iconLeft={<RotateCcw className="h-4 w-4" />}>
              Reset
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-100 bg-rose-50/40 p-4">
            <div>
              <p className="text-sm font-semibold text-rose-700">Delete account</p>
              <p className="text-xs text-rose-500">Permanently deletes your profile, bookings and billing history.</p>
            </div>
            <Button variant="danger" onClick={() => setDeleteOpen(true)} iconLeft={<Trash2 className="h-4 w-4" />}>
              Delete account
            </Button>
          </div>
        </CardBody>
      </Card>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset all demo data?"
        description="This clears everything stored in this browser and restores the original sample account."
        confirmLabel="Reset"
        tone="danger"
        onConfirm={() => {
          resetDemoData()
          window.location.href = '/login'
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete your account?"
        description="This permanently deletes your profile, membership, bookings and billing history. This cannot be undone."
        confirmLabel="Delete account"
        tone="danger"
        onConfirm={async () => {
          try {
            await deleteAccount()
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not delete account.', 'error')
          } finally {
            setDeleteOpen(false)
          }
        }}
      />
    </div>
  )
}

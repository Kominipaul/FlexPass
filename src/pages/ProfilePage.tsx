import { useState } from 'react'
import {
  CalendarDays,
  Contact,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  User,
  X,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { formatDate } from '@/lib/format'
import { isValidPhone, type FieldErrors } from '@/lib/validators'
import type { ProfileUpdate } from '@/lib/db'

type Field = 'name' | 'phone' | 'dob' | 'address' | 'contactName' | 'contactPhone' | 'contactRelationship'

export function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { currentPlan, membership } = useGymData()
  const { showToast } = useToast()

  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors<Field>>({})
  const [form, setForm] = useState(() => toFormState(user))

  if (!user) return null

  function toFormState(u: typeof user) {
    return {
      name: u?.name ?? '',
      phone: u?.phone ?? '',
      dob: u?.dob ?? '',
      address: u?.address ?? '',
      contactName: u?.emergencyContact.name ?? '',
      contactPhone: u?.emergencyContact.phone ?? '',
      contactRelationship: u?.emergencyContact.relationship ?? '',
    }
  }

  function startEditing() {
    setForm(toFormState(user))
    setErrors({})
    setEditing(true)
  }

  function cancelEditing() {
    setEditing(false)
    setErrors({})
  }

  async function handleSave() {
    const nextErrors: FieldErrors<Field> = {}
    if (form.name.trim().length < 2) nextErrors.name = 'Enter your full name.'
    if (form.phone && !isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.'
    if (form.contactPhone && !isValidPhone(form.contactPhone)) {
      nextErrors.contactPhone = 'Enter a valid phone number.'
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const patch: ProfileUpdate = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
      address: form.address.trim(),
      emergencyContact: {
        name: form.contactName.trim(),
        phone: form.contactPhone.trim(),
        relationship: form.contactRelationship.trim(),
      },
    }

    setSaving(true)
    try {
      await updateProfile(patch)
      showToast('Profile updated.')
      setEditing(false)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save your profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Profile" subtitle="Manage your personal details and emergency contact." />

      <Card>
        <CardBody className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar name={user.name} tone={user.avatarColor} size="xl" />
          <div className="flex-1">
            <h3 className="font-display text-[18px] font-bold text-ink">{user.name}</h3>
            <p className="text-[12.5px] text-dim">{user.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              {currentPlan && <Badge tone="volt">{currentPlan.name} member</Badge>}
              <Badge tone="slate">Member since {formatDate(user.memberSince)}</Badge>
              {membership && <Badge tone="slate">{membership.homeLocation}</Badge>}
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<User className="h-4 w-4" />}
          title="Personal information"
          description="This is used for your membership record and check-ins."
          action={
            editing ? (
              <div className="flex gap-2">
                <Button size="sm" variant="quiet" onClick={cancelEditing} iconLeft={<X className="h-3.5 w-3.5" />}>
                  Cancel
                </Button>
                <Button size="sm" loading={saving} onClick={handleSave} iconLeft={<Save className="h-3.5 w-3.5" />}>
                  Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="quiet" onClick={startEditing} iconLeft={<Pencil className="h-3.5 w-3.5" />}>
                Edit
              </Button>
            )
          }
        />
        <CardBody>
          {editing ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                error={errors.name}
                iconLeft={<User className="h-4 w-4" />}
              />
              <Input label="Email" value={user.email} disabled hint="Contact support to change your email." iconLeft={<Mail className="h-4 w-4" />} />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                error={errors.phone}
                iconLeft={<Phone className="h-4 w-4" />}
              />
              <Input
                label="Date of birth"
                type="date"
                value={form.dob}
                onChange={(e) => setForm((f) => ({ ...f, dob: e.target.value }))}
                iconLeft={<CalendarDays className="h-4 w-4" />}
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  iconLeft={<MapPin className="h-4 w-4" />}
                />
              </div>
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Full name" value={user.name} />
              <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={user.email} />
              <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={user.phone || 'Not set'} />
              <InfoRow
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Date of birth"
                value={user.dob ? formatDate(user.dob) : 'Not set'}
              />
              <div className="sm:col-span-2">
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={user.address || 'Not set'} />
              </div>
            </dl>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          icon={<Contact className="h-4 w-4" />}
          title="Emergency contact"
          description="Who should we contact in case of an emergency at the gym."
        />
        <CardBody>
          {editing ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Contact name"
                value={form.contactName}
                onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
              />
              <Input
                label="Contact phone"
                type="tel"
                value={form.contactPhone}
                onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                error={errors.contactPhone}
              />
              <Input
                label="Relationship"
                placeholder="Sibling, parent, friend…"
                value={form.contactRelationship}
                onChange={(e) => setForm((f) => ({ ...f, contactRelationship: e.target.value }))}
              />
            </div>
          ) : (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoRow label="Contact name" value={user.emergencyContact.name || 'Not set'} />
              <InfoRow label="Contact phone" value={user.emergencyContact.phone || 'Not set'} />
              <InfoRow label="Relationship" value={user.emergencyContact.relationship || 'Not set'} />
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[.08em] text-mute">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-[13px] font-medium text-ink">{value}</dd>
    </div>
  )
}

import { useState } from 'react'
import {
  AlertCircle,
  CreditCard,
  Plus,
  Receipt,
  ShieldCheck,
  Star,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useGymData } from '@/context/DataContext'
import { useToast } from '@/context/ToastContext'
import { PageLoader } from '@/components/ui/Spinner'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate } from '@/lib/format'
import type { AddPaymentMethodInput } from '@/lib/db'
import type { Invoice, InvoiceStatus, PaymentMethod } from '@/types'

const INVOICE_STATUS_TONE: Record<InvoiceStatus, 'lime' | 'amber' | 'rose' | 'slate'> = {
  paid: 'lime',
  due: 'amber',
  failed: 'rose',
  refunded: 'slate',
}

export function BillingPage() {
  const { loading, invoices, paymentMethods, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod, payInvoice } =
    useGymData()
  const { showToast } = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<PaymentMethod | null>(null)
  const [payingId, setPayingId] = useState<string | null>(null)

  if (loading) return <PageLoader label="Loading billing…" />

  const hasDueInvoice = invoices.some((i) => i.status === 'due')

  async function handlePay(invoice: Invoice) {
    setPayingId(invoice.id)
    try {
      await payInvoice(invoice.id)
      showToast('Payment successful.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not process payment.', 'error')
    } finally {
      setPayingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Billing</h2>
        <p className="mt-1 text-sm text-slate-500">Manage payment methods and view your invoice history.</p>
      </div>

      {hasDueInvoice && paymentMethods.length === 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>You have an outstanding invoice. Add a payment method below to pay it.</p>
        </div>
      )}

      <Card>
        <CardHeader
          icon={<Wallet className="h-4 w-4" />}
          title="Payment methods"
          description="Used for membership renewals and class fees."
          action={
            <Button size="sm" onClick={() => setAddOpen(true)} iconLeft={<Plus className="h-4 w-4" />}>
              Add card
            </Button>
          }
        />
        <CardBody>
          {paymentMethods.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-5 w-5" />}
              title="No payment methods yet"
              description="Add a card to pay invoices and enable auto-renew."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {paymentMethods.map((pm) => (
                <li
                  key={pm.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-ink-950 text-xs font-extrabold tracking-wide text-white">
                      {pm.brand}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-ink-800">
                        •••• {pm.last4}{' '}
                        {pm.isDefault && (
                          <Badge tone="brand" size="sm" className="ml-1">
                            Default
                          </Badge>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {pm.nameOnCard} · Expires {String(pm.expMonth).padStart(2, '0')}/{pm.expYear}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!pm.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        iconLeft={<Star className="h-3.5 w-3.5" />}
                        onClick={async () => {
                          await setDefaultPaymentMethod(pm.id)
                          showToast('Default payment method updated.')
                        }}
                      >
                        Make default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-rose-600 hover:bg-rose-50"
                      onClick={() => setRemoveTarget(pm)}
                      iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Demo only — no real card numbers are stored or processed.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Receipt className="h-4 w-4" />} title="Invoice history" />
        <CardBody>
          {invoices.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices yet" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Description</th>
                    <th className="pb-2 font-semibold">Method</th>
                    <th className="pb-2 font-semibold">Amount</th>
                    <th className="pb-2 font-semibold">Status</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pr-3 font-medium text-ink-800">{formatDate(inv.date)}</td>
                      <td className="py-3 pr-3 text-slate-600">{inv.description}</td>
                      <td className="py-3 pr-3 text-slate-500">{inv.method}</td>
                      <td className="py-3 pr-3 font-semibold text-ink-900">{formatCurrency(inv.amount)}</td>
                      <td className="py-3 pr-3">
                        <Badge tone={INVOICE_STATUS_TONE[inv.status]} size="sm" className="capitalize">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-right">
                        {inv.status === 'due' && (
                          <Button size="sm" loading={payingId === inv.id} onClick={() => handlePay(inv)}>
                            Pay now
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <AddPaymentMethodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={async (input) => {
          try {
            await addPaymentMethod(input)
            showToast('Payment method added.')
            setAddOpen(false)
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not add payment method.', 'error')
          }
        }}
      />

      <ConfirmDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove payment method?"
        description={removeTarget ? `Card ending in ${removeTarget.last4} will be removed.` : undefined}
        confirmLabel="Remove"
        tone="danger"
        onConfirm={async () => {
          if (!removeTarget) return
          try {
            await removePaymentMethod(removeTarget.id)
            showToast('Payment method removed.')
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Could not remove payment method.', 'error')
          } finally {
            setRemoveTarget(null)
          }
        }}
      />
    </div>
  )
}

function detectBrand(cardNumber: string): PaymentMethod['brand'] {
  if (cardNumber.startsWith('3')) return 'Amex'
  if (cardNumber.startsWith('5')) return 'Mastercard'
  return 'Visa'
}

function AddPaymentMethodModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  onSubmit: (input: AddPaymentMethodInput) => Promise<void>
}) {
  const currentYear = new Date().getFullYear()
  const [name, setName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expMonth, setExpMonth] = useState('1')
  const [expYear, setExpYear] = useState(String(currentYear + 1))
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setName('')
    setCardNumber('')
    setExpMonth('1')
    setExpYear(String(currentYear + 1))
    setError(null)
  }

  async function handleSubmit() {
    const digits = cardNumber.replace(/\D/g, '')
    if (name.trim().length < 2) {
      setError('Enter the name on the card.')
      return
    }
    if (digits.length < 12) {
      setError('Enter a valid card number.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit({
        brand: detectBrand(digits),
        last4: digits.slice(-4),
        expMonth: Number(expMonth),
        expYear: Number(expYear),
        nameOnCard: name.trim(),
      })
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="Add payment method"
      description="Demo only — enter any digits, no real payment is processed."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={submitting} onClick={handleSubmit} iconLeft={<CreditCard className="h-4 w-4" />}>
            Save card
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}
        <Input label="Name on card" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" />
        <Input
          label="Card number"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="4242 4242 4242 4242"
          inputMode="numeric"
          maxLength={19}
        />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Expiry month" value={expMonth} onChange={(e) => setExpMonth(e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {String(m).padStart(2, '0')}
              </option>
            ))}
          </Select>
          <Select label="Expiry year" value={expYear} onChange={(e) => setExpYear(e.target.value)}>
            {Array.from({ length: 8 }, (_, i) => currentYear + i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  )
}

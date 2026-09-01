import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Snowflake, Zap, Play, Receipt, Info, Calendar, ScanLine } from 'lucide-react'
import { useL } from '../lib/i18n'
import { useAuth } from '../auth/AuthContext'
import { freezeMembership, unfreezeMembership, renewMembership, listInvoices } from '../api/endpoints'
import { useToast } from '../components/Toasts'
import { Card, Meter, Button, statusFromMembership } from '../components/primitives'
import { Modal } from '../components/Modal'

export function MembershipPage() {
  const { t, tx, lang } = useL()
  const { me, refetchMe } = useAuth()
  const { push } = useToast()
  const qc = useQueryClient()
  const [freezeOpen, setFreezeOpen] = useState(false)
  const [weeks, setWeeks] = useState(4)

  const member = me?.member
  const membership = member?.membership
  const { data: invoices } = useQuery({ queryKey: ['invoices'], queryFn: listInvoices })

  const freezeMut = useMutation({
    mutationFn: () => freezeMembership(weeks),
    onSuccess: async () => {
      await refetchMe()
      setFreezeOpen(false)
      push(lang === 'el' ? 'Η συνδρομή τέθηκε σε παύση' : 'Membership frozen',
        `${t('freezeFor')} ${weeks} ${t('weeks')}`, 'warn')
    },
  })
  const unfreezeMut = useMutation({
    mutationFn: unfreezeMembership,
    onSuccess: async () => {
      await refetchMe()
      push(lang === 'el' ? 'Η συνδρομή ενεργοποιήθηκε ξανά' : 'Membership active again')
    },
  })
  const renewMut = useMutation({
    mutationFn: renewMembership,
    onSuccess: async (res) => {
      await refetchMe()
      qc.invalidateQueries({ queryKey: ['invoices'] })
      push(lang === 'el' ? 'Ανανέωση 30 ημερών' : 'Renewed 30 days',
        `€${(res.charged_cents / 100).toFixed(0)}`)
    },
  })

  if (!member || !membership) return null
  const status = statusFromMembership(membership.status, membership.days_left)
  const TERM = 90

  return (
    <div className="space-y-3">
      {membership.status === 'frozen' && (
        <Card className="p-3.5 border-froze bg-frozesoft flex items-start gap-2.5">
          <Snowflake size={16} className="text-froze mt-0.5" />
          <div className="flex-1">
            <p className="display text-[12.5px] font-bold uppercase tracking-[.05em] text-froze">{t('frozenTitle')}</p>
          </div>
          <Button size="sm" variant="quiet" icon={Play} onClick={() => unfreezeMut.mutate()} disabled={unfreezeMut.isPending}>
            {t('unfreeze')}
          </Button>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-volt">{t('currentPlan')}</p>
            <h2 className="display text-[22px] font-extrabold mt-1.5">{tx(membership.plan.name)}</h2>
          </div>
          <div className="text-right">
            <p className="display text-[24px] font-extrabold tnum">€{membership.plan.price_cents / 100}</p>
            <p className="text-[11px] text-mute">{t('perMonth')}</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[12px] text-dim">{t('daysRemaining')}</span>
            <span className="mono text-[13px] font-semibold">{membership.days_left} {t('days')}</span>
          </div>
          <Meter value={Math.min(membership.days_left, TERM)} max={TERM} height="h-2"
            tone={status === 'expiring' ? 'warn' : status === 'expired' ? 'bad' : 'volt'} />
          <div className="flex justify-between mt-1.5 text-[11px] text-mute">
            <span>{lang === 'el' ? 'διάρκεια 90 ημερών' : '90-day term'}</span>
            <span>{t('renews')} {new Date(membership.ends_on).toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button icon={Zap} onClick={() => renewMut.mutate()} disabled={renewMut.isPending} className="flex-1">{t('renew30')}</Button>
          {membership.status !== 'frozen' && (
            <Button variant="quiet" icon={Snowflake} onClick={() => setFreezeOpen(true)} className="flex-1">{t('freezeAccount')}</Button>
          )}
        </div>
      </Card>

      <Card>
        <div className="px-4 py-3 border-b border-linesoft flex items-center justify-between">
          <h3 className="display text-[13px] font-bold uppercase tracking-[.06em]">{t('billing')}</h3>
          {invoices && <span className="mono text-[11px] text-mute">{invoices.length}</span>}
        </div>
        <div className="divide-y divide-linesoft">
          {invoices?.length === 0 && <p className="p-4 text-[12.5px] text-dim text-center">—</p>}
          {invoices?.map((inv) => (
            <div key={inv.number} className="px-4 py-2.5 flex items-center gap-3">
              <Receipt size={15} className="text-mute" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{tx(inv.description)}</p>
                <p className="mono text-[11px] text-mute">{inv.number} · {inv.issued_on}</p>
              </div>
              <div className="text-right">
                <p className="mono text-[13px] font-semibold">€{(inv.amount_cents / 100).toFixed(2)}</p>
                <p className={`text-[11px] ${inv.status === 'paid' ? 'text-good' : inv.status === 'pending' ? 'text-warn' : 'text-dim'}`}>
                  {t(inv.status)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={freezeOpen} onClose={() => setFreezeOpen(false)} icon={Snowflake}
        title={t('freezeTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFreezeOpen(false)}>{t('keepActive')}</Button>
            <Button icon={Snowflake} onClick={() => freezeMut.mutate()} disabled={freezeMut.isPending}>
              {t('freezeFor')} {weeks} {t('weeks')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[2, 4, 8].map((w) => (
              <button key={w} onClick={() => setWeeks(w)}
                className={`h-16 rounded-[9px] border text-center transition-colors ${weeks === w ? 'border-volt bg-voltsoft text-volt' : 'border-line bg-raised text-dim hover:text-ink'}`}>
                <span className="display block text-[20px] font-extrabold">{w}</span>
                <span className="text-[11px]">{t('weeks')}</span>
              </button>
            ))}
          </div>
          <div className="rounded-[9px] bg-raised border border-line p-3 text-[12px] text-dim space-y-1.5">
            <p className="flex items-start gap-2"><Info size={13} className="text-volt mt-0.5" />
              {lang === 'el' ? 'Παύση άνω των 4 εβδομάδων χρεώνεται 9€ στην επόμενη ανανέωση.' : 'Freezes over 4 weeks carry a €9 hold fee at the next renewal.'}
            </p>
            <p className="flex items-start gap-2"><Calendar size={13} className="text-volt mt-0.5" />
              {lang === 'el' ? 'Οι υπόλοιπες ημέρες συνεχίζουν από την ημέρα επιστροφής.' : 'Your remaining days resume the day you come back.'}
            </p>
            <p className="flex items-start gap-2"><ScanLine size={13} className="text-volt mt-0.5" />
              {lang === 'el' ? 'Η ρεσεψιόν μπορεί να άρει την παύση αμέσως.' : 'The front desk can lift the freeze instantly.'}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}

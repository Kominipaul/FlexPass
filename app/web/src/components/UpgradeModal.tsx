import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, Zap } from 'lucide-react'
import { useL } from '../lib/i18n'
import { changePlan } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useToast } from './Toasts'
import { Modal } from './Modal'
import { Button } from './primitives'
import type { PlanRefDTO } from '../api/types'

export type UpgradeTarget = PlanRefDTO

export function UpgradeModal({ target, onClose }: { target: UpgradeTarget | null; onClose: () => void }) {
  const { t, tx, lang } = useL()
  const { refetchMe } = useAuth()
  const { push } = useToast()
  const qc = useQueryClient()

  const mut = useMutation({
    mutationFn: () => changePlan(target!.code),
    onSuccess: async () => {
      await refetchMe()
      qc.invalidateQueries({ queryKey: ['classes'] })
      push(lang === 'el' ? 'Το πακέτο ενημερώθηκε' : 'Plan updated', target ? tx(target.name) : undefined)
      onClose()
    },
    onError: () => push(lang === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong', undefined, 'bad'),
  })

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      icon={ArrowUpRight}
      title={t('upgradeTitle')}
      subtitle={lang === 'el' ? 'Το τρέχον πακέτο δεν καλύπτει αυτό το μάθημα.' : 'Your current plan does not cover this class.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('later')}</Button>
          <Button icon={Zap} onClick={() => mut.mutate()} disabled={mut.isPending}>{t('upgradeCta')}</Button>
        </>
      }
    >
      {target && (
        <div className="flex items-baseline justify-between">
          <h4 className="display text-[19px] font-extrabold">{tx(target.name)}</h4>
          {target.price_cents > 0 && (
            <span className="display text-[19px] font-extrabold tnum text-volt">
              €{target.price_cents / 100}<span className="text-[12px] text-dim font-bold"> /{t('perMonth')}</span>
            </span>
          )}
        </div>
      )}
    </Modal>
  )
}

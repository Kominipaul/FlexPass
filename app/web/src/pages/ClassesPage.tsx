import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, MapPin, Plus, X, Clock, Lock, ArrowUpRight } from 'lucide-react'
import { useL } from '../lib/i18n'
import { listClasses, bookClass, cancelBooking } from '../api/endpoints'
import { ApiError } from '../api/client'
import { Card, Meter, inputCls } from '../components/primitives'
import { useToast } from '../components/Toasts'
import { UpgradeModal, type UpgradeTarget } from '../components/UpgradeModal'
import { DisciplineIcon } from '../components/DisciplineIcon'
import type { ClassDTO } from '../api/types'

const DISCIPLINE_ORDER = ['pilates', 'functional', 'crossfit', 'trx', 'zumba', 'spinning']

function formatWhen(iso: string, lang: 'el' | 'en'): { day: string; time: string } {
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  let day: string
  if (isToday) day = lang === 'el' ? 'Σήμερα' : 'Today'
  else if (isTomorrow) day = lang === 'el' ? 'Αύριο' : 'Tomorrow'
  else day = d.toLocaleDateString(lang === 'el' ? 'el-GR' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString(lang === 'el' ? 'el-GR' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  return { day, time }
}

function ClassRow({ cls, onUpgradeNeeded }: { cls: ClassDTO; onUpgradeNeeded: (t: UpgradeTarget) => void }) {
  const { t, tx, lang } = useL()
  const qc = useQueryClient()
  const { push } = useToast()
  const { day, time } = formatWhen(cls.starts_at, lang)
  const mine = cls.my_status
  const full = cls.booked >= cls.capacity && !mine

  const bookMut = useMutation({
    mutationFn: () => bookClass(cls.id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      if (res.status === 'waitlisted') {
        push(lang === 'el' ? 'Μπήκατε σε λίστα αναμονής' : 'Added to waitlist',
          lang === 'el' ? 'Το μάθημα είναι πλήρες — είστε στη σειρά.' : "The class is full — you're in line.", 'warn')
      } else {
        push(lang === 'el' ? 'Η θέση κρατήθηκε' : 'Spot booked', `${tx(cls.discipline.name)} · ${day} ${time}`)
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'PLAN_UPGRADE_REQUIRED' && err.extra) {
        onUpgradeNeeded(err.extra as UpgradeTarget)
      } else {
        push(lang === 'el' ? 'Κάτι πήγε στραβά' : 'Something went wrong', undefined, 'bad')
      }
    },
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelBooking(cls.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classes'] })
      qc.invalidateQueries({ queryKey: ['bookings'] })
      push(lang === 'el' ? 'Η κράτηση ακυρώθηκε' : 'Booking cancelled', undefined, 'warn')
    },
  })

  const busy = bookMut.isPending || cancelMut.isPending
  const fillTone = full ? 'bad' : cls.booked / cls.capacity > 0.8 ? 'warn' : 'volt'

  return (
    <Card className={`p-3.5 transition-colors ${mine ? 'border-voltline' : ''}`}>
      <div className="flex items-start gap-3">
        <span className={`w-9 h-9 rounded-[8px] grid place-items-center shrink-0 border ${mine ? 'bg-voltsoft border-voltline text-volt' : 'bg-raised border-line text-volt'}`}>
          <DisciplineIcon icon={cls.discipline.icon} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="display text-[14px] font-bold leading-tight truncate">{tx(cls.discipline.name)}</h3>
              <p className="text-[12px] text-dim mt-0.5 truncate">{tx(cls.trainer)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="mono text-[13px] font-semibold">{time}</p>
              <p className="text-[11px] text-mute">{day} · {cls.duration_min}′</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
            <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-raised border border-line text-dim">
              <MapPin size={10} />{tx(cls.location.name)}
            </span>
            {mine && (
              <span className="display inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-voltsoft text-volt font-bold uppercase tracking-[.06em] text-[9.5px]">
                {t('bookedTag')}
              </span>
            )}
            {!cls.allowed && (
              <span className="display inline-flex items-center gap-1 px-1.5 h-5 rounded-full bg-embersoft text-ember font-bold uppercase tracking-[.06em] text-[9.5px]">
                <Lock size={10} />{t('upgrade')}
              </span>
            )}
          </div>

          <div className="flex items-end gap-3 mt-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="mono text-dim">{cls.booked}/{cls.capacity} {t('spotsFilled')}</span>
                <span className={full ? 'text-bad font-semibold' : 'text-dim'}>
                  {full ? t('waitlistOnly') : `${cls.capacity - cls.booked} ${t('left')}`}
                </span>
              </div>
              <Meter value={cls.booked} max={cls.capacity} tone={fillTone} />
            </div>
            {cls.allowed ? (
              mine ? (
                <button disabled={busy} onClick={() => cancelMut.mutate()}
                  className="display h-8 px-3 text-[11px] font-bold uppercase tracking-[.08em] rounded-[6px] bg-raised text-ink border border-line hover:border-voltline disabled:opacity-40 inline-flex items-center gap-1.5">
                  <X size={14} />{t('cancel')}
                </button>
              ) : (
                <button disabled={busy} onClick={() => bookMut.mutate()}
                  className="display h-8 px-3 text-[11px] font-bold uppercase tracking-[.08em] rounded-[6px] bg-volt text-voltink hover:shadow-glow disabled:opacity-40 inline-flex items-center gap-1.5">
                  {full ? <Clock size={14} /> : <Plus size={14} />}{full ? t('waitlist') : t('book')}
                </button>
              )
            ) : (
              <button onClick={() => onUpgradeNeeded({ code: '', name: cls.discipline.name, price_cents: 0 })}
                className="display h-8 px-3 text-[11px] font-bold uppercase tracking-[.08em] rounded-[6px] bg-ember text-white hover:brightness-110 inline-flex items-center gap-1.5">
                <ArrowUpRight size={14} />{t('upgrade')}
              </button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ClassesPage() {
  const { t, tx } = useL()
  const [q, setQ] = useState('')
  const [discipline, setDiscipline] = useState<string>('')
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradeTarget | null>(null)

  const { data: classes, isLoading } = useQuery({ queryKey: ['classes'], queryFn: () => listClasses() })

  const filtered = useMemo(() => {
    if (!classes) return []
    return classes.filter((c) => {
      if (discipline && c.discipline.code !== discipline) return false
      if (q.trim()) {
        const hay = `${tx(c.discipline.name)} ${tx(c.trainer)}`.toLowerCase()
        if (!hay.includes(q.trim().toLowerCase())) return false
      }
      return true
    })
  }, [classes, discipline, q, tx])

  const chip = (active: boolean) =>
    `display h-7 px-2.5 rounded-full text-[11px] font-bold uppercase tracking-[.06em] border transition-colors ${active ? 'bg-volt text-voltink border-volt' : 'bg-surface text-dim border-line hover:text-ink hover:border-voltline'}`

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-2.5">
        <div className="relative">
          <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchClasses')} className={`${inputCls} pl-8`} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className={chip(discipline === '')} onClick={() => setDiscipline('')}>{t('all')}</button>
          {DISCIPLINE_ORDER.map((d) => {
            const found = classes?.find((c) => c.discipline.code === d)
            if (!found) return null
            return <button key={d} className={chip(discipline === d)} onClick={() => setDiscipline(d)}>{tx(found.discipline.name)}</button>
          })}
        </div>
      </Card>

      {isLoading && <Card className="p-8 text-center text-dim text-[13px]">{t('loading')}</Card>}

      {!isLoading && filtered.length === 0 && (
        <Card className="p-8 text-center text-dim text-[13px]">{t('noClasses')}</Card>
      )}

      <div className="space-y-2">
        {filtered.map((c) => <ClassRow key={c.id} cls={c} onUpgradeNeeded={setUpgradeTarget} />)}
      </div>

      <UpgradeModal target={upgradeTarget} onClose={() => setUpgradeTarget(null)} />
    </div>
  )
}

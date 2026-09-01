import { useQuery } from '@tanstack/react-query'
import { Megaphone, Zap, Activity } from 'lucide-react'
import { useL } from '../lib/i18n'
import { listAnnouncements } from '../api/endpoints'
import { Card } from './primitives'

export function Announcements() {
  const { t, tx } = useL()
  const { data } = useQuery({ queryKey: ['announcements'], queryFn: listAnnouncements })

  if (!data || data.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-linesoft flex items-center gap-2">
        <Megaphone size={14} className="text-volt" />
        <h3 className="display text-[12px] font-bold uppercase tracking-[.1em]">{t('announcements')}</h3>
      </div>
      {data.map((a) => (
        <div key={a.id} className={`p-4 flex items-start gap-3 ${a.kind === 'offer' ? 'bg-embersoft border-b border-emberline' : ''}`}>
          <span className={`w-9 h-9 rounded-[8px] grid place-items-center shrink-0 ${a.kind === 'offer' ? 'bg-ember text-white' : 'bg-voltsoft border border-voltline text-volt'}`}>
            {a.kind === 'offer' ? <Zap size={17} strokeWidth={2.4} /> : <Activity size={16} />}
          </span>
          <div className="min-w-0">
            <span className={`display text-[9.5px] font-bold uppercase tracking-[.14em] ${a.kind === 'offer' ? 'text-ember' : 'text-volt'}`}>
              {a.kind === 'offer' ? t('offerTag') : t('newsTag')}
            </span>
            <h4 className="display text-[14px] font-extrabold leading-tight mt-1">{tx(a.title)}</h4>
            <p className="text-[12px] text-dim mt-1.5 leading-snug">{tx(a.body)}</p>
          </div>
        </div>
      ))}
    </Card>
  )
}

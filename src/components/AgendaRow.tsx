import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TONES, toneOf } from '@/lib/colors'
import { formatAgendaDate } from '@/lib/format'
import type { AgendaItem } from '@/lib/upcoming'

export function AgendaRow({
  item,
  onCancel,
}: {
  item: AgendaItem
  onCancel?: (bookingId: string) => void
}) {
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 py-3 first:pt-0 last:pb-0">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${TONES[toneOf(item.activity.color)].dot}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[13px] font-semibold text-ink">{item.activity.name}</p>
          <Badge size="sm" tone={item.kind === 'group' ? 's3' : 'volt'}>
            {item.kind === 'group' ? 'Group' : 'Class'}
          </Badge>
          {item.status === 'waitlisted' && (
            <Badge size="sm" tone="warn">
              Waitlisted
            </Badge>
          )}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-mute">
          <MapPin className="h-3 w-3 shrink-0" />
          {item.activity.location} · {item.activity.instructor}
        </p>
      </div>
      <span className="font-mono shrink-0 text-[11.5px] font-semibold text-dim">{formatAgendaDate(item.date)}</span>
      {onCancel && item.kind === 'class' && item.bookingId && (
        <Button
          size="sm"
          variant="ghost"
          className="shrink-0 text-bad hover:bg-badsoft"
          onClick={() => onCancel(item.bookingId!)}
        >
          Cancel
        </Button>
      )}
    </li>
  )
}

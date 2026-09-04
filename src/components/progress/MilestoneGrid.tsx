import { Flame, Medal, Moon, Sunrise, Target, Trophy, Zap, type LucideIcon } from 'lucide-react'
import type { Milestone, MilestoneIcon } from '@/lib/progress'

const ICONS: Record<MilestoneIcon, LucideIcon> = {
  flame: Flame,
  trophy: Trophy,
  medal: Medal,
  sunrise: Sunrise,
  moon: Moon,
  target: Target,
  zap: Zap,
}

export function MilestoneGrid({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {milestones.map((m) => {
        const Icon = ICONS[m.icon]
        const pct = Math.min(100, (m.value / m.goal) * 100)
        return (
          <div
            key={m.id}
            className={`flex flex-col gap-2 rounded-[10px] border p-3 transition-colors ${
              m.earned ? 'border-voltline bg-voltsoft' : 'border-line bg-sunk'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] ${
                  m.earned ? 'bg-volt text-voltink' : 'bg-raised text-mute'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </span>
              <p className={`min-w-0 truncate text-[11.5px] font-bold ${m.earned ? 'text-volt' : 'text-dim'}`}>
                {m.name}
              </p>
            </div>
            <p className="text-[10.5px] leading-snug text-mute">{m.description}</p>
            {!m.earned && (
              <div className="mt-auto flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-voltline" style={{ width: `${pct}%` }} />
                </div>
                <span className="font-mono tnum shrink-0 text-[9.5px] text-mute">
                  {Math.min(m.value, m.goal)}/{m.goal}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

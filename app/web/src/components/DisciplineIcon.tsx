import { Flower2, Dumbbell, Hexagon, Cable, Music4, Bike, Activity, type LucideIcon } from 'lucide-react'

// Maps the icon codes the API sends (internal/db/seed/reference.sql) to
// their lucide-react components. Activity is the fallback for any future
// discipline added server-side before its icon is wired up here.
const REGISTRY: Record<string, LucideIcon> = {
  'flower-2': Flower2,
  dumbbell: Dumbbell,
  hexagon: Hexagon,
  cable: Cable,
  'music-4': Music4,
  bike: Bike,
}

export function DisciplineIcon({ icon, size = 17 }: { icon: string; size?: number }) {
  const Icon = REGISTRY[icon] ?? Activity
  return <Icon size={size} />
}

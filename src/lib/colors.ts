/**
 * Central tone → Tailwind class map. Classes are written out as full
 * literal strings (never templated) so Tailwind's content scanner can find
 * them — see tailwind.config.js `content`.
 */
export type Tone = 'brand' | 'lime' | 'rose' | 'amber' | 'cyan' | 'violet' | 'orange' | 'stone' | 'slate'

interface ToneClasses {
  /** soft background + text, for badges/chips */
  soft: string
  /** icon chip background + text */
  chip: string
  /** solid background + white text, for progress bars / strong accents */
  solid: string
  /** border only */
  border: string
  /** text only */
  text: string
  /** dot background, for legends */
  dot: string
}

export const TONES: Record<Tone, ToneClasses> = {
  brand: {
    soft: 'bg-brand-50 text-brand-700',
    chip: 'bg-brand-100 text-brand-700',
    solid: 'bg-brand-600 text-white',
    border: 'border-brand-200',
    text: 'text-brand-600',
    dot: 'bg-brand-500',
  },
  lime: {
    soft: 'bg-lime-100 text-lime-700',
    chip: 'bg-lime-100 text-lime-700',
    solid: 'bg-lime-500 text-ink-950',
    border: 'border-lime-300',
    text: 'text-lime-700',
    dot: 'bg-lime-500',
  },
  rose: {
    soft: 'bg-rose-50 text-rose-700',
    chip: 'bg-rose-100 text-rose-700',
    solid: 'bg-rose-500 text-white',
    border: 'border-rose-200',
    text: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  amber: {
    soft: 'bg-amber-50 text-amber-700',
    chip: 'bg-amber-100 text-amber-700',
    solid: 'bg-amber-500 text-white',
    border: 'border-amber-200',
    text: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  cyan: {
    soft: 'bg-cyan-50 text-cyan-700',
    chip: 'bg-cyan-100 text-cyan-700',
    solid: 'bg-cyan-500 text-white',
    border: 'border-cyan-200',
    text: 'text-cyan-600',
    dot: 'bg-cyan-500',
  },
  violet: {
    soft: 'bg-violet-50 text-violet-700',
    chip: 'bg-violet-100 text-violet-700',
    solid: 'bg-violet-500 text-white',
    border: 'border-violet-200',
    text: 'text-violet-600',
    dot: 'bg-violet-500',
  },
  orange: {
    soft: 'bg-orange-50 text-orange-700',
    chip: 'bg-orange-100 text-orange-700',
    solid: 'bg-orange-500 text-white',
    border: 'border-orange-200',
    text: 'text-orange-600',
    dot: 'bg-orange-500',
  },
  stone: {
    soft: 'bg-stone-100 text-stone-700',
    chip: 'bg-stone-200 text-stone-700',
    solid: 'bg-stone-600 text-white',
    border: 'border-stone-300',
    text: 'text-stone-600',
    dot: 'bg-stone-500',
  },
  slate: {
    soft: 'bg-slate-100 text-slate-700',
    chip: 'bg-slate-200 text-slate-700',
    solid: 'bg-slate-600 text-white',
    border: 'border-slate-300',
    text: 'text-slate-600',
    dot: 'bg-slate-500',
  },
}

export function toneOf(value: string | undefined): Tone {
  if (value && value in TONES) return value as Tone
  return 'slate'
}

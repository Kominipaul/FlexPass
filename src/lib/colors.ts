/**
 * Central tone → Tailwind class map. Classes are written out as full
 * literal strings (never templated) so Tailwind's content scanner can find
 * them — see tailwind.config.js `content`.
 *
 * `volt` and `ember` are the two brand accents (volt = primary/CTA, ember =
 * premium/urgent). `good`/`warn`/`bad`/`froze` are reserved for status
 * meaning (membership, booking, door-scan state) — never used decoratively.
 * `s1`-`s5` are decorative-only, used for activity categories and chart
 * series so status colors keep a single, unambiguous meaning.
 */
export type Tone = 'volt' | 'ember' | 'good' | 'warn' | 'bad' | 'froze' | 's1' | 's2' | 's3' | 's4' | 's5' | 'slate'

interface ToneClasses {
  /** soft tinted background + text, for badges/chips */
  soft: string
  /** icon chip background + text + border */
  chip: string
  /** solid background + high-contrast text, for meters/strong accents */
  solid: string
  /** border only */
  border: string
  /** text only */
  text: string
  /** dot background, for legends */
  dot: string
}

export const TONES: Record<Tone, ToneClasses> = {
  volt: {
    soft: 'bg-voltsoft text-volt',
    chip: 'bg-voltsoft text-volt border border-voltline',
    solid: 'bg-volt text-voltink',
    border: 'border-voltline',
    text: 'text-volt',
    dot: 'bg-volt',
  },
  ember: {
    soft: 'bg-embersoft text-ember',
    chip: 'bg-embersoft text-ember border border-emberline',
    solid: 'bg-ember text-white',
    border: 'border-emberline',
    text: 'text-ember',
    dot: 'bg-ember',
  },
  good: {
    soft: 'bg-goodsoft text-good',
    chip: 'bg-goodsoft text-good border border-goodsoft',
    solid: 'bg-good text-voltink',
    border: 'border-goodsoft',
    text: 'text-good',
    dot: 'bg-good',
  },
  warn: {
    soft: 'bg-warnsoft text-warn',
    chip: 'bg-warnsoft text-warn border border-warnsoft',
    solid: 'bg-warn text-voltink',
    border: 'border-warnsoft',
    text: 'text-warn',
    dot: 'bg-warn',
  },
  bad: {
    soft: 'bg-badsoft text-bad',
    chip: 'bg-badsoft text-bad border border-badsoft',
    solid: 'bg-bad text-white',
    border: 'border-badsoft',
    text: 'text-bad',
    dot: 'bg-bad',
  },
  froze: {
    soft: 'bg-frozesoft text-froze',
    chip: 'bg-frozesoft text-froze border border-frozesoft',
    solid: 'bg-froze text-voltink',
    border: 'border-frozesoft',
    text: 'text-froze',
    dot: 'bg-froze',
  },
  s1: {
    soft: 'bg-s1soft text-s1',
    chip: 'bg-s1soft text-s1 border border-s1line',
    solid: 'bg-s1 text-white',
    border: 'border-s1line',
    text: 'text-s1',
    dot: 'bg-s1',
  },
  s2: {
    soft: 'bg-s2soft text-s2',
    chip: 'bg-s2soft text-s2 border border-s2line',
    solid: 'bg-s2 text-white',
    border: 'border-s2line',
    text: 'text-s2',
    dot: 'bg-s2',
  },
  s3: {
    soft: 'bg-s3soft text-s3',
    chip: 'bg-s3soft text-s3 border border-s3line',
    solid: 'bg-s3 text-white',
    border: 'border-s3line',
    text: 'text-s3',
    dot: 'bg-s3',
  },
  s4: {
    soft: 'bg-s4soft text-s4',
    chip: 'bg-s4soft text-s4 border border-s4line',
    solid: 'bg-s4 text-white',
    border: 'border-s4line',
    text: 'text-s4',
    dot: 'bg-s4',
  },
  s5: {
    soft: 'bg-s5soft text-s5',
    chip: 'bg-s5soft text-s5 border border-s5line',
    solid: 'bg-s5 text-voltink',
    border: 'border-s5line',
    text: 'text-s5',
    dot: 'bg-s5',
  },
  slate: {
    soft: 'bg-raised text-dim',
    chip: 'bg-raised text-dim border border-line',
    solid: 'bg-line text-ink',
    border: 'border-line',
    text: 'text-dim',
    dot: 'bg-mute',
  },
}

export function toneOf(value: string | undefined): Tone {
  if (value && value in TONES) return value as Tone
  return 'slate'
}

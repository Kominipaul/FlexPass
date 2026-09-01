/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: 'var(--surface)', raised: 'var(--raised)', sunk: 'var(--sunk)',
        line: 'var(--line)', linesoft: 'var(--line-soft)', grid: 'var(--grid)',
        ink: 'var(--ink)', dim: 'var(--dim)', mute: 'var(--mute)',
        volt: 'var(--volt)', voltink: 'var(--volt-ink)', voltsoft: 'var(--volt-soft)', voltline: 'var(--volt-line)',
        ember: 'var(--ember)', embersoft: 'var(--ember-soft)', emberline: 'var(--ember-line)',
        good: 'var(--good)', goodsoft: 'var(--good-soft)', warn: 'var(--warn)', warnsoft: 'var(--warn-soft)',
        bad: 'var(--bad)', badsoft: 'var(--bad-soft)', froze: 'var(--froze)', frozesoft: 'var(--froze-soft)',
      },
      fontFamily: {
        display: ['Geologica', 'IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: 'var(--shadow)', lift: 'var(--shadow-lift)', glow: 'var(--glow)',
      },
    },
  },
  plugins: [],
}

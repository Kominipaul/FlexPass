/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Geologica"', '"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        sunk: 'var(--sunk)',
        line: 'var(--line)',
        linesoft: 'var(--line-soft)',
        grid: 'var(--grid)',

        ink: 'var(--ink)',
        dim: 'var(--dim)',
        mute: 'var(--mute)',

        volt: 'var(--volt)',
        voltink: 'var(--volt-ink)',
        voltsoft: 'var(--volt-soft)',
        voltline: 'var(--volt-line)',

        ember: 'var(--ember)',
        embersoft: 'var(--ember-soft)',
        emberline: 'var(--ember-line)',

        good: 'var(--good)',
        goodsoft: 'var(--good-soft)',
        warn: 'var(--warn)',
        warnsoft: 'var(--warn-soft)',
        bad: 'var(--bad)',
        badsoft: 'var(--bad-soft)',
        froze: 'var(--froze)',
        frozesoft: 'var(--froze-soft)',

        s1: 'var(--s1)',
        s1soft: 'var(--s1-soft)',
        s1line: 'var(--s1-line)',
        s2: 'var(--s2)',
        s2soft: 'var(--s2-soft)',
        s2line: 'var(--s2-line)',
        s3: 'var(--s3)',
        s3soft: 'var(--s3-soft)',
        s3line: 'var(--s3-line)',
        s4: 'var(--s4)',
        s4soft: 'var(--s4-soft)',
        s4line: 'var(--s4-line)',
        s5: 'var(--s5)',
        s5soft: 'var(--s5-soft)',
        s5line: 'var(--s5-line)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        lift: 'var(--shadow-lift)',
        glow: 'var(--shadow-glow)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}

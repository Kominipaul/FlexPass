/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#0b0e14',
          900: '#12161f',
          800: '#1a202c',
          700: '#242b38',
          600: '#333d4f',
        },
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        lime: {
          50: '#f7fee7',
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 8px -2px rgba(15, 23, 42, 0.08)',
        pop: '0 12px 32px -8px rgba(79, 70, 229, 0.35)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(4px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: 0, transform: 'translateX(12px)' },
          '100%': { opacity: 1, transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: 0.6 },
          '80%, 100%': { transform: 'scale(1.6)', opacity: 0 },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out',
        'slide-in': 'slide-in 0.35s ease-out',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.2,0.6,0.4,1) infinite',
      },
    },
  },
  plugins: [],
}

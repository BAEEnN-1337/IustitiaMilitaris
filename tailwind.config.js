/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: Object.fromEntries(
          [600, 700, 750, 800, 850, 900, 950].map((n) => [
            n,
            `rgb(var(--navy-${n}) / <alpha-value>)`
          ])
        ),
        ...Object.fromEntries(
          [
            'slate',
            'emerald',
            'amber',
            'rose',
            'cyan',
            'indigo',
            'purple',
            'blue'
          ].map((p) => [
            p,
            Object.fromEntries(
              [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map(
                (n) => [n, `rgb(var(--${p}-${n}) / <alpha-value>)`]
              )
            )
          ])
        ),
        integrity: {
          gold: '#f59e0b',
          emerald: '#10b981',
          danger: '#ef4444',
          cyan: '#06b6d4',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      }
    }
  },
  plugins: []
};

/** @type {import('tailwindcss').Config} */
const rgb = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const palette = (name, shades) =>
  Object.fromEntries(shades.map((shade) => [shade, rgb(`${name}-${shade}`)]));

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: palette('obsidian', [800, 850, 900, 950]),
        steel: palette('steel', [100, 300, 400, 600, 700]),
        justice: {
          gold: rgb('justice-gold'),
          'gold-light': rgb('justice-gold-light'),
          'gold-dark': rgb('justice-gold-dark')
        },
        tactical: { ice: rgb('tactical-ice') },
        status: Object.fromEntries(
          ['success', 'warning', 'danger', 'info'].map((name) => [
            name,
            rgb(`status-${name}-rgb`)
          ])
        ),
        // Existing score helpers and SVG colours keep their semantic aliases.
        navy: palette('navy', [600, 700, 750, 800, 850, 900, 950]),
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
          ].map((name) => [
            name,
            palette(
              name,
              [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950]
            )
          ])
        ),
        integrity: {
          gold: '#C8A456',
          emerald: '#2E9E75',
          danger: '#C84B4B',
          cyan: '#6BAEC4',
          indigo: '#5B9BD5'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: [
          '"IBM Plex Sans"',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      borderRadius: {
        DEFAULT: '2px',
        none: '0px',
        sm: '2px',
        md: '2px',
        lg: '2px',
        xl: '3px',
        '2xl': '2px',
        '3xl': '2px'
      },
      boxShadow: {
        panel:
          'inset 0 1px 0 0 rgba(255, 255, 255, 0.06), 0 10px 30px -10px rgba(4, 8, 14, 0.75)',
        'gold-glow': '0 0 18px rgba(200, 164, 86, 0.22)'
      }
    }
  },
  plugins: []
};

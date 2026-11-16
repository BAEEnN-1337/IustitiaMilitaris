/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14',
          900: '#0c1424',
          850: '#111b2f',
          800: '#17233c',
          700: '#223456',
          600: '#324a77',
        },
        integrity: {
          gold: '#f59e0b',
          emerald: '#10b981',
          danger: '#ef4444',
          cyan: '#06b6d4',
          indigo: '#6366f1'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

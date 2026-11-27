import containerQueries from '@tailwindcss/container-queries'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        royal: {
          50: '#eff6ff',
          100: '#E2E8F0',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3B82F6',
          600: '#2563EB', // Primary accent token
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#0f172a',
        },
        gold: {
          300: '#fde68a',
          400: '#fbbf24',
          500: '#D4AF37', // Subtle Gold Embroidery Accent
          600: '#b48a1e',
        },
        crimson: {
          500: '#E11D48',
          600: '#be123c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      fontSize: {
        'fluid-hero': ['clamp(2.5rem, 1.6rem + 4.5vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'fluid-h2': ['clamp(1.875rem, 1.5rem + 1.6vw, 2.5rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'hero': ['3.5rem', { lineHeight: '1.08', fontWeight: '800', letterSpacing: '-0.02em' }],
        'h1': ['2.25rem', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.015em' }],
        'h2': ['1.375rem', { lineHeight: '1.35', fontWeight: '700', letterSpacing: '-0.01em' }],
        'h3': ['1.125rem', { lineHeight: '1.4', fontWeight: '700' }],
        'body': ['1rem', { lineHeight: '1.65', fontWeight: '400' }],
        'caption': ['0.875rem', { lineHeight: '1.5', fontWeight: '500' }],
      },
      keyframes: {
        equalizer: {
          '0%, 100%': { height: '25%' },
          '50%': { height: '100%' },
        },
      },
      animation: {
        'eq-1': 'equalizer 0.8s ease-in-out infinite',
        'eq-2': 'equalizer 0.6s ease-in-out infinite 0.2s',
        'eq-3': 'equalizer 0.9s ease-in-out infinite 0.4s',
        'eq-4': 'equalizer 0.7s ease-in-out infinite 0.1s',
      }
    },
  },
  plugins: [containerQueries],
}

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9f4',
          100: '#dcf2e5',
          200: '#bbe5ce',
          300: '#8dd1af',
          400: '#58b589',
          500: '#35976b',
          600: '#267857',
          700: '#1f6047',
          800: '#1c4d3a',
          900: '#193f30',
          950: '#0d2420',
        },
        surface: {
          DEFAULT: '#0f1117',
          card:    '#161b24',
          hover:   '#1c2333',
          border:  '#252d3d',
        },
        income:  '#22d3a4',
        expense: '#f87171',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-glow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(53,151,107,0.25), transparent)',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(37,45,61,1), 0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 24px rgba(53,151,107,0.25)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out',
        'slide-up':   'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                     to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config

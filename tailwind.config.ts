import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Background layers
        background: 'hsl(0 0% 7%)',
        'background-secondary': 'hsl(0 0% 10%)',

        // Text hierarchy
        foreground: 'hsl(0 0% 98%)',
        'foreground-muted': 'hsl(0 0% 70%)',
        'foreground-subtle': 'hsl(0 0% 50%)',

        // Brand accent
        accent: {
          DEFAULT: 'hsl(24 100% 50%)',
          hover: 'hsl(24 100% 45%)',
          muted: 'hsl(24 100% 50% / 0.1)',
        },

        // Borders & dividers
        border: 'hsl(0 0% 15%)',
        'border-strong': 'hsl(0 0% 20%)',
      },
      fontSize: {
        // Display
        'display-xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-lg': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.02em' }],
        'display-md': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.01em' }],

        // Headings
        'h1': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h2': ['1.875rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3': ['1.5rem', { lineHeight: '1.3', letterSpacing: '0' }],
        'h4': ['1.25rem', { lineHeight: '1.4', letterSpacing: '0' }],

        // Body
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        'body': ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],

        // UI
        'caption': ['0.75rem', { lineHeight: '1.4' }],
      },
      borderRadius: {
        'lg': '0.5rem',
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config

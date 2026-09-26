import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1200px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'UberMoveText',
          'system-ui',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        display: [
          'UberMove',
          'UberMoveText',
          'system-ui',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        soft: 'hsl(var(--canvas-soft))',
        softer: 'hsl(var(--canvas-softer))',
        mute: 'hsl(var(--mute))',
        'hairline-mid': 'hsl(var(--hairline-mid))',
        elevated: 'hsl(var(--black-elevated))',
        link: 'hsl(var(--link))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '1rem',
        pill: '999px',
      },
      boxShadow: {
        'elev-1': 'rgba(0, 0, 0, 0.12) 0px 4px 16px 0px',
        'elev-2': 'rgba(0, 0, 0, 0.16) 0px 4px 16px 0px',
        'elev-3': 'rgba(0, 0, 0, 0.16) 0px 2px 8px 0px',
      },
      fontSize: {
        'display-xxl': ['3.25rem', { lineHeight: '4rem', fontWeight: '700' }],
        'display-xl': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700' }],
        'display-lg': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'display-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'display-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700' }],
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
}

export default config

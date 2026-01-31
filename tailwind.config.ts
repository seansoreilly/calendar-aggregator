import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'min-h-screen',
    'bg-background',
    'py-8',
    'px-4',
    'max-w-6xl',
    'mx-auto',
    'space-y-8',
    'text-center',
    'space-y-4',
    'text-4xl',
    'font-bold',
    'tracking-tight',
    'text-2xl',
    'text-muted-foreground',
    'inline-flex',
    'items-center',
    'gap-2',
    'text-sm',
    'bg-gray-900',
    'text-gray-100',
    'p-4',
    'rounded-lg',
    'font-mono',
    'overflow-x-auto',
    'text-green-400',
    'bg-blue-50',
    'dark:bg-blue-900/20',
    'mb-2',
    'font-semibold',
    'grid',
    'grid-cols-1',
    'md:grid-cols-2',
    'gap-6',
    'border',
    'rounded-md',
    'shadow-sm',
  ],
  theme: {
    extend: {
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
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-space)', 'sans-serif'],
      },
    },
  },
  plugins: [tailwindcssAnimate],
}

export default config

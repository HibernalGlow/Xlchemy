import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['index.html', './src/**/*.{svelte,ts,js}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        /* GitButler semantic tokens */
        'bg-1': 'var(--bg-1)',
        'bg-2': 'var(--bg-2)',
        'bg-3': 'var(--bg-3)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'border-2': 'var(--border-2)',
        'fill-pop': 'var(--fill-pop-bg)',

        /* Warm gray neutral scale */
        'ntrl-10': 'var(--ntrl-10)',
        'ntrl-15': 'var(--ntrl-15)',
        'ntrl-20': 'var(--ntrl-20)',
        'ntrl-25': 'var(--ntrl-25)',
        'ntrl-30': 'var(--ntrl-30)',
        'ntrl-35': 'var(--ntrl-35)',
        'ntrl-40': 'var(--ntrl-40)',
        'ntrl-45': 'var(--ntrl-45)',
        'ntrl-50': 'var(--ntrl-50)',
        'ntrl-55': 'var(--ntrl-55)',
        'ntrl-60': 'var(--ntrl-60)',
        'ntrl-65': 'var(--ntrl-65)',
        'ntrl-70': 'var(--ntrl-70)',
        'ntrl-75': 'var(--ntrl-75)',
        'ntrl-80': 'var(--ntrl-80)',
        'ntrl-85': 'var(--ntrl-85)',
        'ntrl-90': 'var(--ntrl-90)',
        'ntrl-95': 'var(--ntrl-95)',
        'ntrl-100': 'var(--ntrl-100)',

        /* Teal accent (pop) scale */
        'pop-50': 'var(--pop-50)',
        'pop-100': 'var(--pop-100)',
        'pop-200': 'var(--pop-200)',
        'pop-300': 'var(--pop-300)',
        'pop-400': 'var(--pop-400)',
        'pop-500': 'var(--pop-500)',
        'pop-600': 'var(--pop-600)',
        'pop-700': 'var(--pop-700)',
        'pop-800': 'var(--pop-800)',
        'pop-900': 'var(--pop-900)',

        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar-background)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        'progress-text': 'var(--progress-text)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        gb: '6px',
        'gb-lg': '10px',
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '0.875rem' }],
        xs: ['0.75rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

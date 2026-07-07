/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Multi-theme system (2026-07-05): every token below reads a CSS
        // custom property (defined per-theme in src/styles/themes.js, applied
        // to :root by ThemeProvider) instead of a static hex, so switching
        // the active theme in Settings retints the whole app at runtime with
        // no rebuild. See src/styles/themes.js for the 8 theme definitions.
        bg:      'var(--color-bg)',
        bg2:     'var(--color-bg2)',
        bg3:     'var(--color-bg3)',
        border:  'var(--color-border)',
        gold:    'var(--color-gold)',
        gold2:   'var(--color-gold2)',
        accent:  'var(--color-accent)',
        accent2: 'var(--color-accent2)',
        muted:   'var(--color-muted)',
        dim:     'var(--color-dim)',
        text:    'var(--color-text)',
        danger:  'var(--color-danger)',
        // Overrides Tailwind's built-in "white" so raw text-white usages
        // (127 of them, hardcoded directly in components rather than routed
        // through a token) resolve to whichever value is correct for the
        // active theme — dark ink for the two light themes, warm off-white
        // for the six dark ones.
        white: 'var(--color-white)',
        // Static (not theme-reactive) — used only by EloRoadmapPage.jsx's
        // 6-tier gray/green/blue/yellow/orange/red progression. Difficulty
        // badges/level indicators elsewhere use the theme-aware accent2/
        // gold/danger tokens instead (see FavouritesPage, OpeningsPage, etc).
        gray: {
          400: '#9c8f74',
          600: '#6b5f4a',
          900: '#2b241c',
        },
        green: {
          400: '#7a9a6d',
          700: '#4a6440',
          800: '#3a5032',
          900: '#2a3a24',
        },
        yellow: {
          400: '#dbb45a',
          600: '#b8872f',
          700: '#96702a',
          800: '#6b5220',
          900: '#3d2e14',
        },
        red: {
          400: '#c25454',
          600: '#8a3030',
          700: '#733030',
          800: '#5c2020',
          900: '#3a1616',
        },
        blue: {
          400: '#7a97ab',
          700: '#3d5568',
          900: '#20303a',
        },
        orange: {
          400: '#cc7a35',
          600: '#a35f28',
          900: '#3d2410',
        },
      },
      fontFamily: {
        // Body font varies by visual mode: EB Garamond for the 8 medieval
        // themes, IBM Plex Sans for Tempo — see src/styles/tempo.js and
        // AppLayout.jsx, same --font-body mechanism as --font-heading below.
        sans: ['var(--font-body)', 'Georgia', 'serif'],
        // Heading font varies per theme (Cinzel for most, IM Fell English SC
        // for the two manuscript-style themes; IBM Plex Mono for Tempo) —
        // see src/styles/themes.js and src/styles/tempo.js.
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        // Left as monospace so chess move notation stays aligned/legible.
        mono: ['JetBrains Mono', 'monospace'],
      },
      // Tightened from Tailwind's defaults (xl=12px, 2xl=16px, 3xl=24px) to a
      // restrained 6-10px scale — sm/md/lg/full are left at their defaults.
      borderRadius: {
        xl: '0.5rem',     // 8px
        '2xl': '0.625rem', // 10px
        '3xl': '0.625rem', // 10px
      },
      boxShadow: {
        // Tight, low-opacity elevation shadow for floating UI (toasts, the
        // coach panel) — replaces a much heavier, diffuse one.
        card: '0 1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}

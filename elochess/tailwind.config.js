/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0f1117',
        bg2:     '#181c27',
        bg3:     '#1e2335',
        border:  '#2a3045',
        gold:    '#f5b731',
        gold2:   '#e8a520',
        accent:  '#3b82f6',
        accent2: '#10b981',
        muted:   '#6b7280',
        dim:     '#4b5563',
        text:    '#f1f5f9',
        danger:  '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        gold: '0 0 20px rgba(245,183,49,0.15)',
        card: '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}

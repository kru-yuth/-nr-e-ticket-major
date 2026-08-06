/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        dark: '#0b0514',
        neon: {
          pink: '#ff2ec4',
          cyan: '#00e5ff',
          purple: '#a855f7',
          yellow: '#ffe600',
        },
      },
      fontFamily: {
        kanit: ['Kanit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'neon-pink': '0 0 12px rgba(255, 46, 196, 0.8), 0 0 24px rgba(255, 46, 196, 0.5)',
        'neon-cyan': '0 0 12px rgba(0, 229, 255, 0.8), 0 0 24px rgba(0, 229, 255, 0.5)',
        'neon-purple': '0 0 12px rgba(168, 85, 247, 0.8), 0 0 24px rgba(168, 85, 247, 0.5)',
        'neon-yellow': '0 0 12px rgba(255, 230, 0, 0.8), 0 0 24px rgba(255, 230, 0, 0.4)',
      },
    },
  },
  plugins: [],
};

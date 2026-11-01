/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          900: '#1a1a1a',
          800: '#242424',
          700: '#2d2d2d',
          500: '#4a4a4a',
          400: '#6b6b6b',
          300: '#8a8a8a',
          100: '#e8e8e8',
        },
        vermilion: '#c94043',
        'vermilion-light': '#e85a5d',
        rattan: '#d4a84b',
        'rattan-light': '#f0c86c',
        paper: '#faf8f5',
        'paper-dark': '#f0ece4',
        'paper-accent': '#f5f0e6',
        success: '#5a9a6e',
        warning: '#d4a84b',
        danger: '#c94043',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        crimson: ['"Crimson Pro"', 'Georgia', 'serif'],
      },
      borderRadius: {
        'md': '8px',
      },
      boxShadow: {
        'paper': '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'paper-lg': '0 6px 20px -4px rgba(0, 0, 0, 0.10), 0 2px 6px rgba(0, 0, 0, 0.05)',
        'paper-xl': '0 12px 32px -8px rgba(0, 0, 0, 0.14), 0 4px 12px rgba(0, 0, 0, 0.06)',
        'lift': '0 10px 30px -10px rgba(0, 0, 0, 0.18), 0 4px 10px -4px rgba(0, 0, 0, 0.08)',
        'glow-vermilion': '0 0 0 3px rgba(201, 64, 67, 0.15), 0 2px 8px rgba(201, 64, 67, 0.18)',
        'glow-rattan': '0 0 0 3px rgba(214, 168, 75, 0.18), 0 2px 8px rgba(214, 168, 75, 0.15)',
        'inset-paper': 'inset 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(0, 0, 0, 0.02)',
      },
      transitionTimingFunction: {
        'zen': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090A0F',
        surface: {
          50: '#1e2230',
          100: '#171a25',
          200: '#12141d',
          300: '#0d0f17',
          400: '#08090e'
        },
        brand: {
          primary: '#6366f1',
          hover: '#4f46e5',
          accent: '#06b6d4',
          glow: 'rgba(99, 102, 241, 0.2)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        senai: {
          red: '#E31E24',
          dark: '#1A1A2E',
          blue: '#16213E',
          accent: '#0F3460',
        },
      },
    },
  },
  plugins: [],
}

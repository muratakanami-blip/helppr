/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f5f5f3',
        navy: {
          DEFAULT: '#1a2540',
          mid: '#2c3e60',
          light: '#e8ecf4',
        },
        gold: {
          DEFAULT: '#b8923a',
          light: '#d4a84b',
          bg: '#fdf6ec',
          border: '#e8d5b0',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'sans-serif'],
        outfit: ['Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

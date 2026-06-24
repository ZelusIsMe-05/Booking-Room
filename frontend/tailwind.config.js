/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './services/**/*.{js,ts,jsx,tsx,mdx}',
    './store/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        booking: {
          surface: '#faf8ff',
          text: '#191b23',
          muted: '#434655',
          border: '#c3c6d7',
          primary: '#004ac6',
          primaryDark: '#003f9e',
          teal: '#006a61',
        },
      },
      fontFamily: {
        sans: ['var(--font-booking)', 'Be Vietnam Pro', 'Inter', 'sans-serif'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 12s linear infinite',
      },
    },
  },
  plugins: [],
};

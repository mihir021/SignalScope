/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        warm: {
          bg: '#F8F6F1',
          card: '#FFFFFF',
          subtle: '#F2EEE5',
          border: '#E8E4DC',
          'border-light': '#EFECE5',
        },
        ink: {
          900: '#20232A',
          700: '#3C404A',
          500: '#6B6F78',
          400: '#9499A3',
          300: '#C2C6CF',
        },
        accent: {
          gold: '#E7B83C',
          light: '#F4D878',
          soft: '#FBF4DB',
          deep: '#C2931D',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        hand: ['"Patrick Hand"', 'cursive'],
      },
      boxShadow: {
        'card': '0 1px 4px rgba(32, 35, 42, 0.04), 0 1px 2px rgba(32, 35, 42, 0.02)',
        'float': '0 4px 16px rgba(32, 35, 42, 0.06)',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '22px',
      }
    },
  },
  plugins: [],
}

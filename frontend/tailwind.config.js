/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          50: '#FAFBFD',
          100: '#F4F6FA',
          200: '#E9EEF5',
          300: '#D6DFEC',
        },
        slate: {
          850: '#151E2E',
          900: '#0F172A',
          950: '#090D16',
        },
        bento: {
          blue: {
            bg: '#EFF6FF',
            border: '#DBEAFE',
            text: '#1E40AF',
            accent: '#3B82F6',
          },
          purple: {
            bg: '#FAF5FF',
            border: '#F3E8FF',
            text: '#6B21A8',
            accent: '#A855F7',
          },
          emerald: {
            bg: '#ECFDF5',
            border: '#D1FAE5',
            text: '#065F46',
            accent: '#10B981',
          },
          amber: {
            bg: '#FFFBEB',
            border: '#FEF3C7',
            text: '#92400E',
            accent: '#F59E0B',
          },
          coral: {
            bg: '#FFF7ED',
            border: '#FFEDD5',
            text: '#9A3412',
            accent: '#F97316',
          },
          rose: {
            bg: '#FFF1F2',
            border: '#FFE4E6',
            text: '#9F1239',
            accent: '#F43F5E',
          },
          cyan: {
            bg: '#ECFEFF',
            border: '#CFFAFE',
            text: '#155E75',
            accent: '#06B6D4',
          },
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'bento': '0 2px 8px -2px rgba(15, 23, 42, 0.04), 0 1px 3px -1px rgba(15, 23, 42, 0.02)',
        'bento-hover': '0 12px 30px -8px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'floating': '0 16px 40px -12px rgba(15, 23, 42, 0.1)',
        'pill': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
      },
      borderRadius: {
        '2xl': '18px',
        '3xl': '24px',
        '4xl': '32px',
      }
    },
  },
  plugins: [],
}

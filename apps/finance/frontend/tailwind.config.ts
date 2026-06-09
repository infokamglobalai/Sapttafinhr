import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          500: '#343a40',
          600: '#000000',
          700: '#212529',
          900: '#000000',
        },
        ink: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          150: 'rgba(0, 0, 0, 0.08)',
          200: '#E5E5E5',
          300: '#CCCCCC',
          400: '#AAAAAA',
          500: '#888888',
          600: '#777777',
          700: '#555555',
          800: '#333333',
          900: '#1A1A1A',
          950: '#111111',
        },
      },
      borderRadius: {
        sm: '2px',
        md: '4px',
        lg: '6px',
        xl: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config;


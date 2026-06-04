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
      },
    },
  },
  plugins: [],
} satisfies Config;

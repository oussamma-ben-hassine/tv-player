/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        tv: {
          dark: '#0b0f19',
          card: '#111827',
          surface: '#1f2937',
          accent: '#3b82f6',
          accentHover: '#2563eb',
          danger: '#ef4444',
          success: '#10b981',
          textMuted: '#9ca3af',
        },
      },
      aspectRatio: {
        '16/9': '16 / 9',
      },
    },
  },
  plugins: [],
};

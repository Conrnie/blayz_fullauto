/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-dark-section': 'linear-gradient(to bottom, #0F172A, #000000)',
        'gradient-orange-section': 'linear-gradient(to bottom, #000000, #442400)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-auth-page': 'linear-gradient(to bottom right, #000000 60%, #FE8401)',
      },
      colors: {
        primary: '#FE8401',
        secondary: '#1E293B',
        background: {
          DEFAULT: '#000000',  // Black background
          secondary: '#111827' // Dark gray for cards (Tailwind gray-900)
        },
        card: {
          DEFAULT: '#1E293B',
          darker: '#0F172A'
        },
        text: {
          primary: '#F9FAFB',
          secondary: '#CBD5E1',
          accent: '#FE8401'
        },
        tremor: {
          brand: {
            faint: '#FFF7EB',
            muted: '#FFEDD5',
            subtle: '#FED7AA',
            DEFAULT: '#FE8401',
            emphasis: '#EA580C',
            inverted: '#FFFFFF',
          },
          background: {
            muted: '#F9FAFB',
            subtle: '#F1F5F9',
            DEFAULT: '#FFFFFF',
            emphasis: '#EFF6FF',
          },
          border: {
            DEFAULT: '#E2E8F0',
          },
          ring: {
            DEFAULT: '#FE8401',
          },
          content: {
            subtle: '#94A3B8',
            DEFAULT: '#1E293B',
            emphasis: '#0F172A',
            strong: '#0F172A',
            inverted: '#FFFFFF',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 10s ease-in-out infinite',
        'orbit': 'orbit 12s linear infinite',
        'fadeIn': 'fadeIn 0.5s ease-out forwards',
        'bounce': 'bounce 2s infinite',
        'ping': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(40px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(40px) rotate(-360deg)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        ping: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      boxShadow: {
        'solid': '0 0 0 2px currentColor',
        'button': '0 3px 5px -1px rgba(0, 0, 0, 0.09), 0 2px 3px -1px rgba(0, 0, 0, 0.07)',
        'card': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.01)',
        'feature': '0 0 20px rgba(254, 132, 1, 0.15)',
      },
      zIndex: {
        '-10': '-10',
      },
    },
  },
  safelist: [
    {
      pattern: /^bg-(orange|indigo)-/,
    },
    {
      pattern: /^text-(orange|indigo)-/,
    },
    {
      pattern: /^glow-(orange|indigo)/,
    },
  ],
  plugins: [
    require('@tailwindcss/forms'),
  ],
}

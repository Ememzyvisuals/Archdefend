/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#000000',
        'bg-1':   '#0a0a0a',
        'bg-2':   '#111111',
        'bg-3':   '#1a1a1a',
        border:   '#222222',
        'border-2': '#2a2a2a',
        'border-3': '#333333',
        fg:       '#ededed',
        'fg-2':   '#a1a1a1',
        'fg-3':   '#666666',
        'fg-4':   '#444444',
        accent:   '#0070f3',
        success:  '#00b341',
        warning:  '#f5a623',
        error:    '#e00000',
        cyan:     '#22d3ee',
        purple:   '#7c3aed',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['13px', { lineHeight: '18px' }],
        base:  ['14px', { lineHeight: '20px' }],
        md:    ['15px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '26px' }],
        '2xl': ['20px', { lineHeight: '28px' }],
        '3xl': ['24px', { lineHeight: '32px' }],
        '4xl': ['30px', { lineHeight: '38px' }],
        '5xl': ['36px', { lineHeight: '44px' }],
        '6xl': ['48px', { lineHeight: '56px' }],
      },
      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '8px',
        lg:  '12px',
        xl:  '16px',
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease both',
        'spin':    'spin 0.8s linear infinite',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.6)',
        DEFAULT: '0 2px 8px rgba(0,0,0,0.5)',
        'md': '0 4px 16px rgba(0,0,0,0.5)',
        'lg': '0 8px 32px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};

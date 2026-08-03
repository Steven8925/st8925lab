/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0E14',
        surface: '#131A24',
        'surface-hover': '#1a2332',
        blue: {
          DEFAULT: '#2563EB',
          deep: '#0F2A47',
          light: '#3B82F6',
        },
        gold: {
          DEFAULT: '#C9A227',
          dim: '#8B7118',
        },
        text: {
          DEFAULT: '#E6EDF5',
          dim: '#8B98A9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'monospace'],
      },
      maxWidth: {
        content: '72rem',
      },
    },
  },
  plugins: [],
};

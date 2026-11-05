import animate from 'tailwindcss-animate';

const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fixed brand colours
        navy: token('navy'),
        orange: token('orange'),
        cream: token('cream'),
        'grey-light': token('grey-light'),
        'grey-navy': token('grey-navy'),
        // Theme-aware colours
        background: token('background'),
        foreground: token('foreground'),
        card: token('card'),
        muted: token('muted'),
        'muted-foreground': token('muted-foreground'),
        border: token('border'),
      },
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        label: '0.24em',
        tagline: '0.32em',
      },
      boxShadow: {
        card: '0 1px 2px rgb(27 25 52 / 0.04), 0 8px 24px rgb(27 25 52 / 0.06)',
      },
    },
  },
  plugins: [animate],
};

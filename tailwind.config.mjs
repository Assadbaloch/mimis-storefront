/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0e0906',
        cream: '#f5ebd7',
        gold: '#e6b95c',
        brick: '#b41d24',
      },
      fontFamily: {
        serif: ['var(--font-fraunces)', 'Georgia', 'serif'],
      },
      borderRadius: {
        full: '9999px',
      },
    },
  },
  plugins: [],
};

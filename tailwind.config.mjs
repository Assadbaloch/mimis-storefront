/** @type {import('tailwindcss').Config} */
export default {
  // lib/ included because TIER_CLASS (lib/loyalty.js) carries utility class
  // names that appear nowhere else — without it Tailwind never generates them.
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ------------------------------------------------------------------
        // Semantic tokens — the ONLY colours shop pages may use. Each is a
        // plain CSS variable (full colour value, set by the active theme;
        // defaults in globals.css). No Tailwind alpha modifiers on these —
        // washes/tints are pre-mixed via color-mix so they follow any theme.
        // ------------------------------------------------------------------
        surface: 'var(--mimis-surface)',
        'surface-strong': 'var(--mimis-surface-strong)',
        app: 'var(--mimis-text)',
        'app-soft': 'var(--mimis-text-soft)',
        'app-faint': 'color-mix(in srgb, var(--mimis-text) 38%, transparent)',
        'app-wash': 'color-mix(in srgb, var(--mimis-text) 10%, transparent)',
        'app-tint': 'color-mix(in srgb, var(--mimis-text) 18%, transparent)',
        line: 'var(--mimis-line)',
        accent: 'var(--mimis-accent)',
        'on-accent': 'var(--mimis-accent-contrast)',
        highlight: 'var(--mimis-highlight)',
        'on-highlight': 'var(--mimis-highlight-contrast)',
        'highlight-wash': 'color-mix(in srgb, var(--mimis-highlight) 8%, transparent)',
        'highlight-tint': 'color-mix(in srgb, var(--mimis-highlight) 18%, transparent)',
        'highlight-line': 'color-mix(in srgb, var(--mimis-highlight) 40%, transparent)',
        danger: 'var(--mimis-danger)',
        'danger-wash': 'color-mix(in srgb, var(--mimis-danger) 12%, transparent)',
        // Neutral media scrim — sits over photos/videos, independent of theme.
        scrim: 'rgba(0, 0, 0, 0.6)',

        // ------------------------------------------------------------------
        // Legacy fixed palette — ADMIN SCREENS ONLY. Never themed; the --c-*
        // channels are constants in globals.css. Do not use in shop pages.
        // ------------------------------------------------------------------
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        cream: 'rgb(var(--c-cream) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        brick: 'rgb(var(--c-brick) / <alpha-value>)',
      },
      fontFamily: {
        serif: ['var(--mimis-font-display)'],
        sans: ['var(--mimis-font-body)'],
      },
      borderRadius: {
        app: 'var(--mimis-radius)',
        'app-sm': 'calc(var(--mimis-radius) * 0.75)',
        'app-lg': 'calc(var(--mimis-radius) * 1.5)',
        full: '9999px',
      },
    },
  },
  plugins: [],
};

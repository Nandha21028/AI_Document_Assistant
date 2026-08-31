/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        chat: {
          bg: 'rgb(var(--color-bg) / <alpha-value>)',
          sidebar: 'rgb(var(--color-sidebar) / <alpha-value>)',
          card: 'rgb(var(--color-card) / <alpha-value>)',
          cardSubtle: 'rgb(var(--color-card-subtle) / <alpha-value>)',
          well: 'rgb(var(--color-well) / <alpha-value>)',
          hover: 'rgb(var(--color-hover) / <alpha-value>)',
          border: 'rgb(var(--color-border) / <alpha-value>)',
          borderSubtle: 'rgb(var(--color-border-subtle) / <alpha-value>)',
          text: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-muted) / <alpha-value>)',
          accent: 'rgb(var(--color-accent) / <alpha-value>)',
          accentHover: 'rgb(var(--color-accent-hover) / <alpha-value>)',
          accentText: 'rgb(var(--color-accent-text) / <alpha-value>)',
          telemetry: 'rgb(var(--color-telemetry) / <alpha-value>)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'skeuo-card': 'var(--skeuo-bevel-top), var(--skeuo-drop-shadow)',
        'skeuo-well': 'var(--skeuo-inset-shadow)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
        'message-entrance': 'messageSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'modal-pop': 'modalPop 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}

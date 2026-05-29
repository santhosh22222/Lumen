/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: {
          50: "#fdfcf8",
          100: "#f7f3ea",
          200: "#ede6d4",
          300: "#ddd2b6",
          400: "#c4b794",
        },
        ink: {
          50: "#f4f3ef",
          100: "#e3e1d9",
          200: "#c4c1b4",
          300: "#9a9789",
          400: "#6b6960",
          500: "#454339",
          600: "#2c2b25",
          700: "#1d1c18",
          800: "#121110",
          900: "#0a0908",
        },
        forest: {
          50: "#eef4ef",
          100: "#d4e4d8",
          200: "#a8c8b1",
          300: "#6f9e7d",
          400: "#3f7553",
          500: "#235a3c",
          600: "#1a4332",
          700: "#143426",
          800: "#0e241b",
        },
        coral: {
          400: "#e88563",
          500: "#d96847",
          600: "#bb4f30",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          '"Instrument Serif"',
          "ui-serif",
          "Georgia",
          "serif",
        ],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      letterSpacing: {
        label: "0.18em",
      },
      boxShadow: {
        soft: "0 1px 0 rgba(12,12,10,0.04), 0 12px 28px -16px rgba(12,12,10,0.18)",
        lift: "0 1px 0 rgba(12,12,10,0.04), 0 24px 48px -24px rgba(12,12,10,0.28)",
      },
      keyframes: {
        riseIn: {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        riseIn: "riseIn 0.5s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

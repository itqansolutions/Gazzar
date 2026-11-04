import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48", // Athletic Crimson Red (Approved GX Brand)
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519",
        },
        gx: {
          red: "#e11d48",
          "red-hover": "#be123c",
          dark: "#090a0f",
          surface: "#121620",
          "surface-light": "#161c28",
          border: "#1f2937",
          "border-light": "#e2e8f0",
        },
        accent: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        // DESIGN.md Semantic Design Tokens (Single Source of Truth)
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          soft: "var(--brand-soft)",
          text: "var(--brand-text)",
          contrast: "var(--brand-contrast)"
        },
        app: "var(--bg)",
        card: "var(--surface)",
        raised: "var(--surface-raised)",
        line: "var(--border-subtle)",
        fg: "var(--text)",
        muted: "var(--text-muted)"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-cairo)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Impact", "sans-serif"],
        brand: ["var(--font-brand)", "sans-serif"],
        script: ["var(--font-script)", "cursive"]
      },
      borderRadius: {
        card: "var(--r-card)",
        control: "var(--r-control)",
        chip: "var(--r-chip)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)"
      }
    },
  },
  plugins: [],
};
export default config;

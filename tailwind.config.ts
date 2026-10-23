import type { Config } from "tailwindcss";

// Design tokens for Cash Flow Quest — a gamified cash flow tracker for
// gig workers. Ink-navy base (not the default SaaS cream/terracotta),
// teal for "healthy" states, amber for streak/gamification accents,
// coral for warnings. See globals.css for the CSS-variable mirrors.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0F1A",
          900: "#0F1626",
          800: "#161F35",
          700: "#202C47",
          600: "#2C3B5C",
        },
        mist: {
          100: "#F5F7FA",
          300: "#C7CEDB",
          500: "#8C97AD",
        },
        quest: {
          teal: "#2DD4BF",
          "teal-dim": "#1B8F82",
          amber: "#F2B705",
          "amber-dim": "#B88A04",
          coral: "#FF6B5E",
        },
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "ui-sans-serif", "system-ui"],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        quest: "10px",
      },
    },
  },
  plugins: [],
};

export default config;

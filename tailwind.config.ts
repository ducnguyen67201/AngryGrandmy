import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#151515",
        paper: "#f7f3ea",
        brass: "#b48135",
        mint: "#62c49b",
        tomato: "#df5a47",
        grape: "#6b5bd2"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "SFMono-Regular", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;

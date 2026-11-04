import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        ink: { DEFAULT: "#111113", 700: "#2a2a2e", 500: "#5b5b63", 400: "#8a8a93", 300: "#b9b9c0" },
        line: "#e8e8ec",
        canvas: "#f7f7f8",
        brand: { DEFAULT: "#1f1f23", accent: "#b08d57", soft: "#f4efe7" },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,16,20,.04), 0 1px 3px rgba(16,16,20,.06)",
        pop: "0 10px 30px -10px rgba(16,16,20,.25)",
      },
      borderRadius: { xl: "14px", "2xl": "18px" },
    },
  },
  plugins: [],
} satisfies Config;

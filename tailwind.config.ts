import type { Config } from "tailwindcss";

/**
 * Tailwind CSS configuration with warm color palette
 * Uses warm earth tones for the record collection UI
 */
const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm color palette for the UI
        warmBg: {
          primary: "#FFF8F0", // Warm off-white
          secondary: "#F5E6D3", // Light tan
          tertiary: "#E8D4BA", // Beige
        },
        warmAccent: {
          orange: "#D97742", // Burnt orange
          copper: "#B85C38", // Copper
          bronze: "#8B4513", // Bronze
          gold: "#DAA520", // Goldenrod
        },
        warmText: {
          primary: "#3E2723", // Dark brown
          secondary: "#5D4037", // Medium brown
          tertiary: "#795548", // Light brown
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

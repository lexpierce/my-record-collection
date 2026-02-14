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
        // Warm green palette for the UI
        warmBg: {
          primary: "#F7F9F2", // Warm cream with green tint
          secondary: "#ECF0E3", // Light sage cream
          tertiary: "#D8DECC", // Warm sage beige
        },
        warmAccent: {
          orange: "#6B8E5A", // Warm sage
          copper: "#527542", // Forest
          bronze: "#3E5C2F", // Dark moss
          gold: "#8B9E4A", // Olive gold
        },
        warmText: {
          primary: "#2F3327", // Dark olive-brown
          secondary: "#4A5040", // Medium olive
          tertiary: "#687060", // Light olive
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

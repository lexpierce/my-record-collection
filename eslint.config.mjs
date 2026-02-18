import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Extends Next.js recommended lint rules (core-web-vitals preset)
export default defineConfig([
  {
    // Ignore generated output directories
    ignores: ["coverage/**", ".next/**", "drizzle/**"],
  },
  {
    extends: [...nextCoreWebVitals],
  },
]);
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: [
      "coverage/**",
      "dist/**",
      ".astro/**",
      "drizzle/**",
      "src/**/*.astro",
      "src/env.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
]);

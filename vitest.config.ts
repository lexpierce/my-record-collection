/**
 * Vitest configuration for the record collection app.
 *
 * Uses jsdom as the test environment so React components can render and
 * interact with a simulated DOM. Path aliases mirror tsconfig.json so
 * imports like "@/lib/..." resolve correctly in tests.
 *
 * Coverage is collected via V8 (no Babel transform needed) targeting
 * all source files under app/, components/, and lib/.
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Simulate a browser DOM so React components can render
    environment: "jsdom",

    // Expose vitest globals (describe, it, expect, etc.) without importing them
    globals: true,

    // Run this setup file before each test suite to configure jest-dom matchers
    setupFiles: ["./vitest.setup.ts"],

    // Collect coverage using Node's built-in V8 instrumentation
    coverage: {
      provider: "v8",
      include: ["app/**/*.ts", "app/**/*.tsx", "components/**/*.tsx", "lib/**/*.ts"],
      exclude: [
        // Next.js generated files and type stubs
        "app/layout.tsx",
        "**/*.d.ts",
        // Config/schema files that are purely declarative
        "lib/db/schema.ts",
        "lib/db/client.ts",
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 80,
        statements: 90,
      },
    },
  },
  resolve: {
    alias: {
      // Mirror the "@/*" path alias from tsconfig.json
      "@": path.resolve(__dirname, "."),
    },
  },
});

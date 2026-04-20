import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const nextCoreWebVitalsWithoutReactRules = nextCoreWebVitals.map((config) => {
  const rules = Object.fromEntries(
    Object.entries(config.rules ?? {}).filter(([ruleName]) => !ruleName.startsWith("react/"))
  );

  if (!config.plugins?.react) {
    return {
      ...config,
      rules,
    };
  }

  const { react: _reactPlugin, ...plugins } = config.plugins;

  return {
    ...config,
    plugins,
    rules,
  };
});

// Extends Next.js recommended lint rules (core-web-vitals preset)
export default defineConfig([
  {
    // Ignore generated output directories
    ignores: ["coverage/**", ".next/**", "drizzle/**"],
  },
  ...nextCoreWebVitalsWithoutReactRules,
]);

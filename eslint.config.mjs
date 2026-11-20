import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // setState-in-effect is genuinely required for the app's legitimate
      // external-sync patterns: creating/revoking object URLs from a Blob,
      // the ticking clock, hydration-safe time reads, and the count-up
      // animation. Disable this rule.
      "react-hooks/set-state-in-effect": "off",
      // Purity rule disallows Date.now() in render, but it's essential for
      // computing relative timestamps (backup staleness). Disable.
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "tests/fixtures/authenticated-app/.next-authenticated/**",
    "playwright-report/**",
    "test-results/**",
    "docs/**/*.html",
  ]),
]);

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
    },
    // Several integration suites boot the real PGlite migration graph. Running
    // those files concurrently causes CPU-bound false timeouts on ordinary
    // developer machines, while one-file-at-a-time runs are stable and faster
    // than replaying failures.
    fileParallelism: false,
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    passWithNoTests: false,
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname,
    },
  },
});

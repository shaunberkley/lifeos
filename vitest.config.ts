import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@lifeos/logging": fileURLToPath(new URL("./packages/logging/src/index.ts", import.meta.url)),
      "@lifeos/security": fileURLToPath(new URL("./packages/security/src/index.ts", import.meta.url)),
      "@lifeos/testing": fileURLToPath(new URL("./packages/testing/src/index.ts", import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: "node",
    globals: true,
    hookTimeout: 10000,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    coverage: {
      provider: "v8",
      // These thresholds are the current measured baseline; raise them as H4 adds test surface.
      thresholds: {
        branches: 70,
        functions: 36,
        lines: 54,
        statements: 54
      },
      include: [
        "apps/**/*.ts",
        "apps/**/*.tsx",
        "packages/**/*.ts",
        "packages/**/*.tsx",
        "convex/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/dist/**",
        "**/coverage/**",
        "**/node_modules/**",
        "convex/_generated/**",
      ],
      reporter: ["text-summary", "json-summary", "lcov"],
      reportsDirectory: "./coverage"
    },
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000
  }
});

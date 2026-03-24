import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
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
    mockReset: true,
    restoreMocks: true,
    testTimeout: 10000
  }
});

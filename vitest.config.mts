import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts", "scripts/**/*.test.mjs"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

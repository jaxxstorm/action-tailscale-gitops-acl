import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    clearMocks: true,
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
  },
});

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.{ts,mts,mjs}"],
    exclude: ["node_modules", ".next", "out"],
  },
});

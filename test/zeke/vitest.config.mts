import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/zeke/**/*.test.ts"],
    environment: "node",
  },
});

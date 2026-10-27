import { defineConfig } from "vitest/config";

export default defineConfig({
  server: { fs: { strict: false } },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx,js,mjs}", "test/zeke/**/*.test.ts"],
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost/" } },
    globals: true,
    setupFiles: ["./test/setupFiles.ts"],
    taskTitleValueFormatTruncate: Infinity,
    cache: false,
  },
});

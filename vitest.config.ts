import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "**/*.spec.ts"],
    },
  },
  resolve: {
    alias: {
      "@visitor-analytics/core": path.resolve(__dirname, "packages/core/src"),
      "@visitor-analytics/collectors": path.resolve(
        __dirname,
        "packages/collectors/src"
      ),
      "@visitor-analytics/storage": path.resolve(
        __dirname,
        "packages/storage/src"
      ),
      "@visitor-analytics/uploader": path.resolve(
        __dirname,
        "packages/uploader/src"
      ),
      "@visitor-analytics/plugins": path.resolve(
        __dirname,
        "packages/plugins/src"
      ),
      "@visitor-analytics/framework": path.resolve(
        __dirname,
        "packages/framework/src"
      ),
      "@visitor-analytics/utils": path.resolve(
        __dirname,
        "packages/utils/src"
      ),
    },
  },
});

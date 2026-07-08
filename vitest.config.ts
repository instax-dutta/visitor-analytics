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
      "@visitor-analytics-sdk/core": path.resolve(__dirname, "packages/core/src"),
      "@visitor-analytics-sdk/collectors": path.resolve(
        __dirname,
        "packages/collectors/src"
      ),
      "@visitor-analytics-sdk/storage": path.resolve(
        __dirname,
        "packages/storage/src"
      ),
      "@visitor-analytics-sdk/uploader": path.resolve(
        __dirname,
        "packages/uploader/src"
      ),
      "@visitor-analytics-sdk/plugins": path.resolve(
        __dirname,
        "packages/plugins/src"
      ),
      "@visitor-analytics-sdk/framework": path.resolve(
        __dirname,
        "packages/framework/src"
      ),
      "@visitor-analytics-sdk/utils": path.resolve(
        __dirname,
        "packages/utils/src"
      ),
    },
  },
});

import { defineConfig } from "tsup";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

// M5: Auto-discover framework entry points from src/*/index.{ts,tsx}
const srcDir = join(import.meta.dirname ?? process.cwd(), "src");
const frameworkDirs = readdirSync(srcDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "node_modules")
  .map((d) => {
    const tsxPath = join(srcDir, d.name, "index.tsx");
    const tsPath = join(srcDir, d.name, "index.ts");
    if (existsSync(tsxPath)) return { [d.name]: tsxPath };
    return { [d.name]: tsPath };
  });

// Build the entry map: { index: src/index.ts, react: src/react/index.tsx, ... }
const entry: Record<string, string> = {
  index: join(srcDir, "index.ts"),
};
for (const dir of frameworkDirs) {
  const [name, path] = Object.entries(dir)[0]!;
  entry[name] = path;
}

export default defineConfig({
  entry,
  format: ["esm"],
  dts: true,
  treeshake: true,
  clean: true,
});

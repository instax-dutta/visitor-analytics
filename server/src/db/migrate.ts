import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";

/**
 * Applies SQL migrations in src/db/migrations in lexical filename order.
 * Run with: `npm run migrate` (requires DATABASE_URL / STORAGE=postgres).
 */
async function main(): Promise<void> {
  if (config.storage !== "postgres") {
    logger.warn("STORAGE is not postgres; skipping migrations.");
    return;
  }
  const pool = new Pool({ connectionString: config.databaseUrl });
  const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");
  const { readdirSync } = await import("node:fs");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of sqlFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    logger.info(`Applying migration ${file}`);
    await pool.query(sql);
  }
  logger.info(`Applied ${sqlFiles.length} migration(s).`);
  await pool.end();
}

main().catch((err) => {
  logger.error("Migration failed", { error: err });
  process.exit(1);
});

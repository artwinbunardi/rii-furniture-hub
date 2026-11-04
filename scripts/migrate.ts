import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { loadEnv } from "./env";

loadEnv();

export async function migrate(url: string, opts: { reset?: boolean; log?: boolean } = {}) {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    if (opts.reset) {
      await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    }
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const dir = path.join(process.cwd(), "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    const done = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = fs.readFileSync(path.join(dir, f), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations(name) VALUES ($1)", [f]);
        await client.query("COMMIT");
        if (opts.log !== false) console.log(`applied ${f}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${f} failed: ${(e as Error).message}`);
      }
    }
    // privileges for objects created by later migrations
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rii_app;
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rii_app;
      REVOKE UPDATE, DELETE ON audit_logs, inventory_movements, reservation_status_history, website_versions FROM rii_app;`);
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is not set");
  migrate(url, { reset: process.argv.includes("--reset") })
    .then(() => console.log("migrations complete"))
    .catch((e) => { console.error(e.message); process.exit(1); });
}

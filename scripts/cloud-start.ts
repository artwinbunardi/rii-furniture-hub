/* eslint-disable no-console */
/**
 * One-container start for PaaS hosts (Railway, Render, Fly…), used by Dockerfile.cloud.
 *
 *  1. DATABASE_ADMIN_URL defaults to the host-provided DATABASE_URL (the database owner).
 *  2. Runs migrations, then sets the `rii_app` role password from RII_APP_PASSWORD
 *     (or a random one) so the default 'rii_app' password is never live on the internet.
 *  3. Seeds DEMO data only when the database has no users yet (SEED_DEMO=false skips it).
 *  4. Starts Next.js with DATABASE_URL pointing at the non-owner `rii_app` role, so RLS applies.
 */
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { Client } from "pg";
import { migrate } from "./migrate";
import { seed } from "./seed";

async function main() {
  const adminUrl = process.env.DATABASE_ADMIN_URL || process.env.DATABASE_URL;
  if (!adminUrl) throw new Error("Set DATABASE_URL (the database owner connection string).");
  await migrate(adminUrl);

  const appPassword = process.env.RII_APP_PASSWORD || crypto.randomBytes(24).toString("hex");
  const db = new Client({ connectionString: adminUrl });
  await db.connect();
  const lit = (await db.query(`SELECT quote_literal($1) AS q`, [appPassword])).rows[0].q;
  await db.query(`ALTER ROLE rii_app WITH LOGIN PASSWORD ${lit}`);
  const users = (await db.query(`SELECT count(*)::int AS n FROM users`)).rows[0].n as number;
  await db.end();

  if (users === 0 && process.env.SEED_DEMO !== "false") {
    console.log("Empty database: loading DEMO data…");
    await seed({ adminUrl });
    const { closePool } = await import("../src/lib/db");
    await closePool();
  }

  const appUrl = new URL(adminUrl);
  appUrl.username = "rii_app";
  appUrl.password = appPassword;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: appUrl.toString(),
    APP_URL: process.env.APP_URL || (domain ? `https://${domain}` : "http://localhost:3000"),
    SESSION_SECRET: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  };
  delete env.DATABASE_ADMIN_URL;
  if (!process.env.SESSION_SECRET) console.warn("SESSION_SECRET not set: generated one for this run (users are signed out on each redeploy).");

  const port = process.env.PORT || "3000";
  const child = spawn("node_modules/.bin/next", ["start", "-H", "0.0.0.0", "-p", port], { stdio: "inherit", env });
  for (const sig of ["SIGTERM", "SIGINT"] as const) process.on(sig, () => child.kill(sig));
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((e) => { console.error(e); process.exit(1); });

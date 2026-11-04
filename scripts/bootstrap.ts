/* eslint-disable no-console */
/**
 * Production bootstrap — NO demo data.
 *   ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='…' npm run db:bootstrap
 * Applies migrations, then (only where still empty) creates settings, roles & permissions, the first
 * administrator, the 50 website templates and a primary website. Safe to re-run; never truncates.
 */
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { loadEnv } from "./env";
import { migrate } from "./migrate";
import { seedWebsite } from "./seed-website";

loadEnv();

async function main() {
  const url = process.env.DATABASE_ADMIN_URL;
  if (!url) throw new Error("DATABASE_ADMIN_URL is required");
  await migrate(url);
  const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = await import("../src/lib/rbac");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query("BEGIN");
    const defaults: Record<string, unknown> = { turnaround_days: 1, company_name: process.env.COMPANY_NAME ?? "PT RII", default_locale: "id", timezone: "Asia/Jakarta", currency: "IDR", low_availability_threshold: 0.2, require_reservation_approval: true };
    for (const [k, v] of Object.entries(defaults)) await db.query(`INSERT INTO app_settings(key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING`, [k, JSON.stringify(v)]);
    for (const r of ROLES) await db.query(`INSERT INTO roles(code,name_id,name_en,description,sort) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`, [r.code, r.name_id, r.name_en, r.description, r.sort]);
    for (const [code, p] of Object.entries(PERMISSIONS)) await db.query(`INSERT INTO permissions(code,description,module) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, p.description, p.module]);
    await db.query(`INSERT INTO permissions(code,description,module) VALUES ('*','All permissions (administrator)','admin') ON CONFLICT (code) DO NOTHING`);
    const hasRolePerms = (await db.query(`SELECT count(*)::int n FROM role_permissions`)).rows[0].n > 0;
    if (!hasRolePerms) for (const [role, perms] of Object.entries(ROLE_PERMISSIONS)) for (const p of perms) await db.query(`INSERT INTO role_permissions VALUES ($1,$2) ON CONFLICT DO NOTHING`, [role, p]);

    let adminId = (await db.query(`SELECT u.id FROM users u JOIN user_roles r ON r.user_id = u.id WHERE r.role_code = 'admin' AND u.status = 'active' LIMIT 1`)).rows[0]?.id as string | undefined;
    if (!adminId) {
      const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), name = process.env.ADMIN_NAME?.trim(), pw = process.env.ADMIN_PASSWORD ?? "";
      if (!email || !name) throw new Error("No administrator exists yet: set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD");
      if (!/^(?=.*[A-Za-z])(?=.*\d).{12,}$/.test(pw)) throw new Error("ADMIN_PASSWORD must be at least 12 characters with letters and digits");
      adminId = (await db.query(`INSERT INTO users(email, name, password_hash, is_demo) VALUES ($1,$2,$3,false) RETURNING id`, [email, name, await bcrypt.hash(pw, 12)])).rows[0].id;
      await db.query(`INSERT INTO user_roles(user_id, role_code) VALUES ($1,'admin')`, [adminId]);
      console.log(`created administrator ${email}`);
    }
    await db.query("COMMIT");

    const hasSite = (await db.query(`SELECT count(*)::int n FROM websites`)).rows[0].n > 0;
    if (!hasSite) {
      await db.query(`DELETE FROM website_templates`);
      await seedWebsite(db, adminId!, console.log, { demoBranding: false });
    } else console.log("website already exists — templates and pages left untouched");
    console.log("bootstrap complete. Set SHOW_DEMO_ACCOUNTS=false and change the rii_app database password (see docs/DEPLOYMENT.md).");
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resetData, actor, admin } from "./helpers";
import * as adm from "../src/lib/services/admin";
import { createProject, updateProject } from "../src/lib/services/projects";
import { withTx, closePool } from "../src/lib/db";
import type { CurrentUser } from "../src/lib/auth/user";

let decor: CurrentUser, staff: CurrentUser, manager: CurrentUser, adminU: CurrentUser, management: CurrentUser;

beforeAll(async () => {
  await resetData();
  [decor, staff, manager, adminU, management] = await Promise.all(
    ["decor@rii.demo", "staff@rii.demo", "manager@rii.demo", "admin@rii.demo", "management@rii.demo"].map(actor),
  );
});
afterAll(async () => { await closePool(); });

describe("Admin — users & roles", () => {
  it("invites a user: invited status, roles, one-time token and an outbox email", async () => {
    const { user, link } = await adm.inviteUser(adminU, { email: "New.Person@rii.demo", name: "New Person", roles: ["warehouse_staff"] });
    expect(link).toMatch(/\/invite\?token=/);
    const row = await admin(async (c) => (await c.query(`SELECT status, (SELECT array_agg(role_code) FROM user_roles WHERE user_id = u.id) roles FROM users u WHERE id = $1`, [user.id])).rows[0]);
    expect(row.status).toBe("invited");
    expect(row.roles).toEqual(["warehouse_staff"]);
    const mail = await admin(async (c) => (await c.query(`SELECT count(*)::int n FROM email_outbox WHERE to_email = 'new.person@rii.demo'`)).rows[0].n);
    expect(mail).toBe(1);
    await expect(adm.inviteUser(adminU, { email: "new.person@rii.demo", name: "Dup", roles: ["decor"] })).rejects.toThrow(/sudah terdaftar|already/);
  });

  it("only users.manage may invite or change roles", async () => {
    await expect(adm.inviteUser(manager, { email: "x@rii.demo", name: "X", roles: ["decor"] })).rejects.toThrow();
    await expect(adm.updateUser(management, decor.id, { name: "Hack", roles: ["admin"], status: "active" })).rejects.toThrow();
  });

  it("the database itself refuses role escalation without users.manage (RLS on user_roles)", async () => {
    await expect(withTx(decor.ctx, (tx) => tx.query(`INSERT INTO user_roles VALUES ($1, 'admin')`, [decor.id]))).rejects.toThrow(/row-level security/);
    await expect(withTx(manager.ctx, (tx) => tx.query(`INSERT INTO role_permissions VALUES ('decor', 'users.manage')`))).rejects.toThrow(/row-level security/);
    const del = await withTx(staff.ctx, (tx) => tx.query(`DELETE FROM user_roles WHERE user_id = $1`, [adminU.id]));
    expect(del.rowCount).toBe(0);
  });

  it("keeps at least one active administrator and blocks self-disable", async () => {
    await expect(adm.updateUser(adminU, adminU.id, { name: "Admin", roles: ["management"], status: "active" })).rejects.toThrow(/administrator/);
    await expect(adm.updateUser(adminU, adminU.id, { name: "Admin", roles: ["admin"], status: "disabled" })).rejects.toThrow();
  });

  it("disabling a user removes all their sessions", async () => {
    await admin((c) => c.query(`INSERT INTO sessions(token_hash, user_id, expires_at) VALUES ('t-test', $1, now() + interval '1 day')`, [staff.id]));
    await adm.updateUser(adminU, staff.id, { name: "Staff", roles: ["warehouse_staff"], status: "disabled" });
    const n = await admin(async (c) => (await c.query(`SELECT count(*)::int n FROM sessions WHERE user_id = $1`, [staff.id])).rows[0].n);
    expect(n).toBe(0);
    await adm.updateUser(adminU, staff.id, { name: "Staff", roles: ["warehouse_staff"], status: "active" });
  });

  it("role permission matrix changes are persisted and audited; admin is locked", async () => {
    await adm.setRolePermission(adminU, "warehouse_staff", "reports.view", true);
    const has = await admin(async (c) => (await c.query(`SELECT 1 FROM role_permissions WHERE role_code = 'warehouse_staff' AND permission_code = 'reports.view'`)).rowCount);
    expect(has).toBe(1);
    await adm.setRolePermission(adminU, "warehouse_staff", "reports.view", false);
    await expect(adm.setRolePermission(adminU, "admin", "reports.view", false)).rejects.toThrow();
    const audits = await admin(async (c) => (await c.query(`SELECT count(*)::int n FROM audit_logs WHERE action IN ('role.grant','role.revoke')`)).rows[0].n);
    expect(audits).toBe(2);
  });
});

describe("Admin — settings, catalog structure, locations, projects", () => {
  it("validates settings server-side and audits changes", async () => {
    await expect(adm.saveSettings(adminU, { turnaround_days: "99" })).rejects.toThrow();
    await expect(adm.saveSettings(adminU, { turnaround_days: "1.5" })).rejects.toThrow();
    await expect(adm.saveSettings(manager, { turnaround_days: "2" })).rejects.toThrow();
    await adm.saveSettings(adminU, { turnaround_days: "2", require_reservation_approval: false });
    const rows = await admin(async (c) => (await c.query(`SELECT key, value FROM app_settings WHERE key IN ('turnaround_days','require_reservation_approval')`)).rows);
    expect(Object.fromEntries(rows.map((r) => [r.key, r.value]))).toEqual({ turnaround_days: 2, require_reservation_approval: true });
    await adm.saveSettings(adminU, { turnaround_days: "1" });
  });

  it("categories: unique slug, max two levels, cannot delete while in use", async () => {
    const rugs = await adm.saveCategory(adminU, null, { name_id: "Karpet", name_en: "Rugs" });
    expect(rugs.slug).toBe("rugs");
    await expect(adm.saveCategory(adminU, null, { name_id: "Karpet 2", name_en: "Rugs" })).rejects.toThrow(/Slug/);
    const sub = await adm.saveCategory(adminU, null, { name_id: "Karpet Bulat", name_en: "Round rugs", parent_id: rugs.id });
    await expect(adm.saveCategory(adminU, null, { name_id: "x", name_en: "Too deep", parent_id: sub.id })).rejects.toThrow(/two|dua/);
    const used = await admin(async (c) => (await c.query(`SELECT category_id FROM products LIMIT 1`)).rows[0].category_id);
    await expect(adm.deleteCategory(adminU, used)).rejects.toThrow(/dipakai|used/);
    await expect(adm.saveCategory(decor, null, { name_id: "x", name_en: "Nope" })).rejects.toThrow();
  });

  it("collections keep product order; decor cannot write official collections even via SQL", async () => {
    const ids = await admin(async (c) => (await c.query(`SELECT id FROM products ORDER BY sku LIMIT 3`)).rows.map((r) => r.id));
    const col = await adm.saveCollection(adminU, null, { name: "Test Collection", product_ids: [ids[2], ids[0], ids[1]] });
    const order = await admin(async (c) => (await c.query(`SELECT product_id FROM collection_products WHERE collection_id = $1 ORDER BY sort`, [col.id])).rows.map((r) => r.product_id));
    expect(order).toEqual([ids[2], ids[0], ids[1]]);
    const upd = await withTx(decor.ctx, (tx) => tx.query(`UPDATE collections SET name = 'hacked' WHERE id = $1`, [col.id]));
    expect(upd.rowCount).toBe(0);
    await expect(withTx(decor.ctx, (tx) => tx.query(`INSERT INTO collection_products VALUES ($1, $2, 99)`, [col.id, ids[1]]))).rejects.toThrow();
  });

  it("locations: unique per warehouse, cannot delete while products are stored there", async () => {
    const wh = await admin(async (c) => (await c.query(`SELECT id FROM warehouses ORDER BY code LIMIT 1`)).rows[0].id);
    const loc = await adm.saveLocation(manager, null, { warehouse_id: wh, code: "z-01", name: "Test rack" });
    expect(loc.code).toBe("Z-01");
    await expect(adm.saveLocation(manager, null, { warehouse_id: wh, code: "Z-01", name: "dup" })).rejects.toThrow();
    const busy = await admin(async (c) => (await c.query(`SELECT location_id FROM products WHERE location_id IS NOT NULL LIMIT 1`)).rows[0].location_id);
    await expect(adm.deleteLocation(manager, busy)).rejects.toThrow(/produk|products/);
    await adm.deleteLocation(manager, loc.id);
    await expect(adm.saveLocation(staff, null, { warehouse_id: wh, code: "Z-02", name: "x" })).rejects.toThrow();
  });

  it("projects: decor can create, only project.manage can edit (service + RLS)", async () => {
    const p = await createProject(decor, { name: "Decor Project", start_date: "2026-12-01", end_date: "2026-12-03" });
    expect(p.code).toMatch(/^PRJ-\d{4}-\d{3}$/);
    await expect(updateProject(decor, p.id, { name: "Renamed" })).rejects.toThrow();
    const r = await withTx(decor.ctx, (tx) => tx.query(`UPDATE projects SET name = 'x' WHERE id = $1`, [p.id]));
    expect(r.rowCount).toBe(0);
    await updateProject(manager, p.id, { name: "Renamed by manager" });
  });
});

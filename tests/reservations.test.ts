import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resetData, actor, productId, projectId, balance, day, admin } from "./helpers";
import * as svc from "../src/lib/services/reservations";
import { withTx, closePool } from "../src/lib/db";
import { getAvailability } from "../src/lib/services/availability";
import { moveStock } from "../src/lib/services/inventory";
import type { CurrentUser } from "../src/lib/auth/user";

let decor: CurrentUser, decor2: CurrentUser, staff: CurrentUser, manager: CurrentUser, adminU: CurrentUser, management: CurrentUser;
let SOFA: string, PROJ: string;

async function avail(pid: string, from: string, to: string) {
  return withTx(manager.ctx, async (tx) => (await getAvailability(tx, [pid], from, to)).get(pid)!);
}

async function request(user: CurrentUser, pid: string, qty: number, from: string, to: string) {
  const id = await svc.addToCart(user, pid, qty);
  await svc.updateDraft(user, id, { project_id: PROJ, loading_date: from, return_date: to });
  return id;
}

beforeAll(async () => {
  await resetData();
  [decor, decor2, staff, manager, adminU, management] = await Promise.all(
    ["decor@rii.demo", "decor2@rii.demo", "staff@rii.demo", "manager@rii.demo", "admin@rii.demo", "management@rii.demo"].map(actor),
  );
  SOFA = await productId("SOF-001"); // 20 units in demo seed
  PROJ = await projectId();
});
afterAll(async () => { await closePool(); });

describe("Test A — reservation submission", () => {
  it("decor team selects project + dates, adds furniture and submits", async () => {
    const id = await request(decor, SOFA, 8, day(30), day(38));
    const r = await svc.submitReservation(decor, id);
    expect(r.number).toMatch(/^RES-\d{4}-\d{4}$/);
    const st = await admin(async (c) => (await c.query(`SELECT status, is_cart FROM reservations WHERE id = $1`, [id])).rows[0]);
    expect(st).toEqual({ status: "pending_approval", is_cart: false });
  });

  it("pending requests are soft holds: they do not reduce bookable availability", async () => {
    const a = await avail(SOFA, day(30), day(38));
    expect(a.available).toBe(20);
    expect(a.pending).toBe(8);
  });

  it("rejects submission without project or dates", async () => {
    const id = await svc.addToCart(decor2, SOFA, 1);
    await expect(svc.submitReservation(decor2, id)).rejects.toThrow(/proyek|project/i);
    await svc.deleteDraft(decor2, id);
  });
});

describe("Test B — warehouse approval", () => {
  it("manager approves; bookable availability for the affected dates drops 20 → 12 without touching physical stock", async () => {
    const pending = await admin(async (c) => (await c.query(`SELECT id FROM reservations WHERE status = 'pending_approval' LIMIT 1`)).rows[0].id);
    await svc.approveReservation(manager, pending);
    const a = await avail(SOFA, day(30), day(38));
    expect(a.reserved).toBe(8);
    expect(a.available).toBe(12);
    const b = await balance("SOF-001");
    expect(b.owned).toBe(20);
    expect(b.in_warehouse).toBe(20);
    // non-overlapping window is unaffected
    expect((await avail(SOFA, day(60), day(65))).available).toBe(20);
  });
});

describe("Test C — double booking prevention", () => {
  it("blocks a request for 15 units when only 12 are available on overlapping dates", async () => {
    const id = await request(decor2, SOFA, 15, day(32), day(40));
    await expect(svc.submitReservation(decor2, id)).rejects.toThrow(/tersedia\/available 12/);
    await svc.setItemQty(decor2, id, SOFA, 12);
    await expect(svc.submitReservation(decor2, id)).resolves.toBeTruthy();
  });

  it("allows 15 units on non-overlapping dates", async () => {
    const id = await request(decor2, SOFA, 15, day(50), day(52));
    await expect(svc.submitReservation(decor2, id)).resolves.toBeTruthy();
  });

  it("respects the turnaround buffer (1 day) after a return date", async () => {
    // existing approved hold: day30..day38 (+1 buffer = day39). 12 left; a new 13-unit booking starting day39 conflicts, day40 is fine.
    const c1 = await request(decor, SOFA, 13, day(39), day(39));
    await expect(svc.submitReservation(decor, c1)).rejects.toThrow(/available/);
    await svc.updateDraft(decor, c1, { project_id: PROJ, loading_date: day(41), return_date: day(42) });
    // day41..43 overlaps the 15-unit pending at day50? no. overlaps 12 pending (day32..41) only as soft hold → allowed
    await expect(svc.submitReservation(decor, c1)).resolves.toBeTruthy();
  });

  it("approval re-validates: two pending requests that together exceed stock cannot both be approved", async () => {
    const other = await productId("SOF-004"); // 4 units
    const r1 = await request(decor, other, 3, day(70), day(72));
    await svc.submitReservation(decor, r1);
    const r2 = await request(decor2, other, 3, day(71), day(73));
    await svc.submitReservation(decor2, r2); // allowed: r1 is only a soft hold
    await svc.approveReservation(manager, r1);
    await expect(svc.approveReservation(manager, r2)).rejects.toThrow(/overbooking/);
    await expect(svc.approveReservation(manager, r2, { approvedQty: { [other]: 1 } })).resolves.toBeUndefined();
    expect((await avail(other, day(71), day(72))).available).toBe(0);
  });
});

describe("Test J — concurrent approvals", () => {
  it("two simultaneous approvals never oversubscribe stock", async () => {
    const pid = await productId("LNG-003"); // 6 units
    const a = await request(decor, pid, 4, day(90), day(92));
    await svc.submitReservation(decor, a);
    const b = await request(decor2, pid, 4, day(91), day(93));
    await svc.submitReservation(decor2, b);
    const results = await Promise.allSettled([svc.approveReservation(manager, a), svc.approveReservation(adminU, b)]);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(1);
    const av = await avail(pid, day(90), day(93));
    expect(av.reserved).toBe(4);
    expect(av.available).toBe(2);
    expect(av.available).toBeGreaterThanOrEqual(0);
  });

  it("stress: 6 concurrent approvals of 2 units on 6-unit stock → at most 3 succeed", async () => {
    const pid = await productId("CON-001"); // 8 units
    await admin((c) => c.query(`UPDATE inventory_balances SET owned = 6, in_warehouse = 6 WHERE product_id = $1`, [pid]));
    const users = [decor, decor2, decor, decor2, decor, decor2];
    const ids: string[] = [];
    for (const u of users) {
      const id = await request(u, pid, 2, day(100), day(101));
      await svc.submitReservation(u, id);
      ids.push(id);
    }
    const res = await Promise.allSettled(ids.map((id, i) => svc.approveReservation(i % 2 ? adminU : manager, id)));
    expect(res.filter((r) => r.status === "fulfilled").length).toBe(3);
    expect((await avail(pid, day(100), day(101))).available).toBe(0);
  });
});

describe("Tests D, E, F — dispatch, return, inspection & damage", () => {
  let resId: string;
  const DIN = "DTB-003"; // 25 units
  it("D: picking + dispatch move units from warehouse to checked-out", async () => {
    const pid = await productId(DIN);
    resId = await request(decor, pid, 10, day(0), day(3));
    await svc.submitReservation(decor, resId);
    await svc.approveReservation(manager, resId);
    await svc.startPreparing(staff, resId);
    await svc.confirmPicking(staff, resId, { [pid]: 10 });
    await expect(svc.dispatchReservation(staff, resId, { [pid]: 11 })).rejects.toThrow(/melebihi|exceeds/i);
    await svc.dispatchReservation(staff, resId, { [pid]: 10 });
    const b = await balance(DIN);
    expect(b).toMatchObject({ owned: 25, in_warehouse: 15, checked_out: 10 });
    const st = await admin(async (c) => (await c.query(`SELECT count(*)::int n FROM inventory_movements m JOIN products p ON p.id = m.product_id WHERE p.sku = $1 AND m.movement_type = 'checkout'`, [DIN])).rows[0].n);
    expect(st).toBe(1);
  });

  it("E: returned items wait for inspection before becoming bookable again", async () => {
    const pid = await productId(DIN);
    await svc.registerReturn(staff, resId, { [pid]: { returned: 10 } });
    let b = await balance(DIN);
    expect(b).toMatchObject({ checked_out: 0, pending_inspection: 10, in_warehouse: 15 });
    expect((await avail(pid, day(10), day(11))).usable).toBe(15);
    // F: 2 damaged, 8 good
    await expect(svc.inspectReturn(staff, resId, pid, { good: 8, damaged: 2, lost: 0 })).rejects.toThrow(/deskripsi|description/i);
    await svc.inspectReturn(staff, resId, pid, { good: 8, damaged: 2, lost: 0, damageDescription: "Top tergores", severity: "minor" });
    b = await balance(DIN);
    expect(b).toMatchObject({ pending_inspection: 0, in_warehouse: 23, damaged: 2 });
    const st = await admin(async (c) => (await c.query(`SELECT status FROM reservations WHERE id = $1`, [resId])).rows[0].status);
    expect(st).toBe("completed");
  });

  it("F: damaged furniture stays unavailable until repaired / released", async () => {
    const pid = await productId(DIN);
    expect((await avail(pid, day(10), day(11))).available).toBe(23);
    await withTx(manager.ctx, (tx) => moveStock(tx, manager, { productId: pid, type: "repair_start", qty: 2, from: "damaged", to: "under_repair" }));
    expect((await avail(pid, day(10), day(11))).available).toBe(23);
    await withTx(manager.ctx, (tx) => moveStock(tx, manager, { productId: pid, type: "repair_done", qty: 2, from: "under_repair", to: "in_warehouse" }));
    expect((await avail(pid, day(10), day(11))).available).toBe(25);
  });

  it("never allows negative stock", async () => {
    const pid = await productId(DIN);
    await expect(withTx(manager.ctx, (tx) => moveStock(tx, manager, { productId: pid, type: "write_off", qty: 999, from: "in_warehouse", to: "external" }))).rejects.toThrow(/tidak mencukupi|insufficient/i);
    // DB constraint as last line of defence
    await expect(admin((c) => c.query(`UPDATE inventory_balances SET in_warehouse = -1 WHERE product_id = $1`, [pid]))).rejects.toThrow();
  });
});

describe("Test I — permissions (service layer AND database layer)", () => {
  it("decor team cannot approve reservations", async () => {
    const pid = await productId("BAR-002");
    const id = await request(decor, pid, 1, day(120), day(121));
    await svc.submitReservation(decor, id);
    await expect(svc.approveReservation(decor, id)).rejects.toThrow(/izin|permission/i);
    await expect(svc.approveReservation(staff, id)).rejects.toThrow(/izin|permission/i);
    await expect(svc.approveReservation(management, id)).rejects.toThrow(/izin|permission/i);
  });

  it("database trigger blocks status changes without permission even with direct SQL", async () => {
    const id = await admin(async (c) => (await c.query(`SELECT id FROM reservations WHERE status = 'pending_approval' AND requester_id = $1 LIMIT 1`, [decor.id])).rows[0].id);
    await expect(withTx(decor.ctx, (tx) => tx.query(`UPDATE reservations SET status = 'approved' WHERE id = $1`, [id]))).rejects.toThrow(/permission denied/);
  });

  it("RLS blocks direct inventory modification by decor / management roles", async () => {
    const pid = await productId("BAR-002");
    const r1 = await withTx(decor.ctx, (tx) => tx.query(`UPDATE inventory_balances SET owned = owned + 5, in_warehouse = in_warehouse + 5 WHERE product_id = $1`, [pid]));
    expect(r1.rowCount).toBe(0);
    const r2 = await withTx(management.ctx, (tx) => tx.query(`UPDATE inventory_balances SET owned = owned + 5, in_warehouse = in_warehouse + 5 WHERE product_id = $1`, [pid]));
    expect(r2.rowCount).toBe(0);
    await expect(withTx(decor.ctx, (tx) => moveStock(tx, decor, { productId: pid, type: "receive", qty: 1, from: "external", to: "in_warehouse" }))).rejects.toThrow();
  });

  it("decor users only see their own reservations (RLS)", async () => {
    const mine = await withTx(decor2.ctx, async (tx) => (await tx.query(`SELECT DISTINCT requester_id FROM reservations`)).rows);
    expect(mine.every((r) => r.requester_id === decor2.id)).toBe(true);
    const all = await withTx(manager.ctx, async (tx) => (await tx.query(`SELECT count(DISTINCT requester_id)::int n FROM reservations`)).rows[0].n);
    expect(all).toBeGreaterThan(1);
  });

  it("only users with website.publish can publish website versions", async () => {
    await expect(withTx(manager.ctx, (tx) => tx.query(`INSERT INTO website_versions(website_id, version_no, snapshot, published_by) SELECT id, 999, '{}', $1 FROM websites LIMIT 1`, [manager.id]))).rejects.toThrow(/row-level security|permission/);
  });
});

import { withTx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { hasPerm } from "../rbac";
import { audit } from "./audit";
import { moveStock, type Endpoint, type MovementType } from "./inventory";
import type { Actor } from "./reservations";

function need(actor: Actor, p: string) {
  if (!hasPerm(actor.perms, p)) throw new ForbiddenError();
}
function posInt(n: number) {
  if (!Number.isInteger(n) || n <= 0) throw new AppError("Jumlah harus bilangan bulat positif. / Quantity must be a positive whole number.");
}
function reasonReq(r: string) {
  if (!r || r.trim().length < 3) throw new AppError("Alasan wajib diisi (min. 3 karakter). / A reason is required.");
}

export async function receiveStock(actor: Actor, productId: string, qty: number, reason: string) {
  need(actor, "inventory.receive"); posInt(qty); reasonReq(reason);
  return withTx(actor.ctx, async (tx) => {
    await moveStock(tx, actor, { productId, type: "receive", qty, from: "external", to: "in_warehouse", reason, approvedBy: actor.id });
    await audit(tx, actor.id, "inventory.receive", "product", productId, `Received ${qty} units: ${reason}`);
  });
}

const ADJ: Record<string, { from: Endpoint; to: Endpoint; type: MovementType }> = {
  increase: { from: "external", to: "in_warehouse", type: "adjustment" },
  decrease: { from: "in_warehouse", to: "external", type: "adjustment" },
  write_off: { from: "lost", to: "external", type: "write_off" },
  found: { from: "lost", to: "in_warehouse", type: "found" },
};

export async function requestAdjustment(actor: Actor, productId: string, kind: string, qty: number, reason: string) {
  need(actor, "inventory.adjust_request");
  if (!ADJ[kind]) throw new AppError("Jenis penyesuaian tidak valid.");
  posInt(qty); reasonReq(reason);
  return withTx(actor.ctx, async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO stock_adjustments(product_id, kind, quantity, reason, requested_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [productId, kind, qty, reason.trim(), actor.id],
    );
    await audit(tx, actor.id, "adjustment.request", "stock_adjustment", rows[0].id, `Requested ${kind} ${qty}: ${reason}`);
    return rows[0].id as string;
  });
}

export async function decideAdjustment(actor: Actor, id: string, approve: boolean, note: string) {
  need(actor, "inventory.adjust_approve");
  return withTx(actor.ctx, async (tx) => {
    const a = (await tx.query(`SELECT * FROM stock_adjustments WHERE id = $1 FOR UPDATE`, [id])).rows[0];
    if (!a) throw new NotFoundError();
    if (a.status !== "pending") throw new AppError("Penyesuaian sudah diputuskan. / Already decided.");
    let movementId: number | null = null;
    if (approve) {
      const spec = ADJ[a.kind];
      movementId = (await moveStock(tx, actor, { productId: a.product_id, type: spec.type, qty: a.quantity, from: spec.from, to: spec.to, reason: `${a.reason}${note ? ` — ${note}` : ""}`, approvedBy: actor.id })).movementId;
    } else if (!note?.trim()) throw new AppError("Alasan penolakan wajib diisi. / Rejection reason required.");
    await tx.query(`UPDATE stock_adjustments SET status = $2, decided_by = $3, decided_at = now(), decision_note = $4, movement_id = $5 WHERE id = $1`,
      [id, approve ? "approved" : "rejected", actor.id, note || null, movementId]);
    await audit(tx, actor.id, approve ? "adjustment.approve" : "adjustment.reject", "stock_adjustment", id, `${approve ? "Approved" : "Rejected"} ${a.kind} ${a.quantity}`);
  });
}

export async function reportDamage(actor: Actor, productId: string, qty: number, severity: string, description: string) {
  need(actor, "warehouse.damage_report"); posInt(qty); reasonReq(description);
  if (!["minor", "moderate", "severe"].includes(severity)) throw new AppError("Tingkat kerusakan tidak valid.");
  return withTx(actor.ctx, async (tx) => {
    await moveStock(tx, actor, { productId, type: "inspect_damaged", qty, from: "in_warehouse", to: "damaged", reason: description });
    const { rows } = await tx.query(
      `INSERT INTO damage_reports(product_id, quantity, remaining_qty, severity, description, reported_by) VALUES ($1,$2,$2,$3,$4,$5) RETURNING id`,
      [productId, qty, severity, description.trim(), actor.id],
    );
    await audit(tx, actor.id, "damage.report", "damage_report", rows[0].id, `Damage reported: ${qty} units — ${description}`);
  });
}

type DamageOp = "start_repair" | "complete_repair" | "release" | "write_off";

export async function damageAction(actor: Actor, reportId: string, op: DamageOp, qty: number, note: string) {
  need(actor, "inventory.repair"); posInt(qty);
  return withTx(actor.ctx, async (tx) => {
    const d = (await tx.query(`SELECT * FROM damage_reports WHERE id = $1 FOR UPDATE`, [reportId])).rows[0];
    if (!d) throw new NotFoundError();
    if (d.status === "resolved") throw new AppError("Laporan sudah selesai. / Report already resolved.");
    if (qty > d.remaining_qty) throw new AppError(`Maksimal ${d.remaining_qty} unit. / Max ${d.remaining_qty} units.`);
    const base = { productId: d.product_id, qty, reservationId: d.reservation_id, reason: note || d.description, approvedBy: actor.id };
    let remaining = d.remaining_qty;
    let status = d.status;
    if (op === "start_repair") {
      await moveStock(tx, actor, { ...base, type: "repair_start", from: "damaged", to: "under_repair" });
      status = "in_repair";
    } else if (op === "complete_repair") {
      await moveStock(tx, actor, { ...base, type: "repair_done", from: "under_repair", to: "in_warehouse" });
      remaining -= qty;
    } else if (op === "release") {
      await moveStock(tx, actor, { ...base, type: "release_damaged", from: "damaged", to: "in_warehouse" });
      remaining -= qty;
    } else if (op === "write_off") {
      const src = status === "in_repair" ? "under_repair" : "damaged";
      reasonReq(note);
      await moveStock(tx, actor, { ...base, type: "write_off", from: src, to: "external" });
      remaining -= qty;
    } else throw new AppError("Unknown operation");
    if (remaining === 0) status = "resolved";
    await tx.query(`UPDATE damage_reports SET remaining_qty = $2, status = $3, resolved_by = CASE WHEN $3 = 'resolved' THEN $4::uuid ELSE resolved_by END, resolved_at = CASE WHEN $3 = 'resolved' THEN now() ELSE resolved_at END WHERE id = $1`,
      [reportId, remaining, status, actor.id]);
    await audit(tx, actor.id, `damage.${op}`, "damage_report", reportId, `${op} ${qty} units`);
  });
}

export async function resolveDiscrepancy(actor: Actor, id: string, resolution: string) {
  need(actor, "inventory.adjust_approve"); reasonReq(resolution);
  return withTx(actor.ctx, async (tx) => {
    const r = await tx.query(`UPDATE stock_discrepancies SET status = 'resolved', resolved_by = $2, resolution = $3, resolved_at = now() WHERE id = $1 AND status = 'open' RETURNING id`, [id, actor.id, resolution.trim()]);
    if (!r.rowCount) throw new AppError("Selisih tidak ditemukan atau sudah selesai.");
    await audit(tx, actor.id, "discrepancy.resolve", "stock_discrepancy", id, resolution);
  });
}

export async function reportCountMismatch(actor: Actor, productId: string, expected: number, actual: number, notes: string) {
  need(actor, "inventory.adjust_request");
  if (!Number.isInteger(actual) || actual < 0) throw new AppError("Jumlah aktual tidak valid.");
  return withTx(actor.ctx, async (tx) => {
    const { rows } = await tx.query(
      `INSERT INTO stock_discrepancies(product_id, kind, expected_qty, actual_qty, notes, reported_by) VALUES ($1,'count_mismatch',$2,$3,$4,$5) RETURNING id`,
      [productId, expected, actual, notes || null, actor.id],
    );
    await audit(tx, actor.id, "discrepancy.report", "stock_discrepancy", rows[0].id, `Count mismatch: expected ${expected}, counted ${actual}`);
  });
}

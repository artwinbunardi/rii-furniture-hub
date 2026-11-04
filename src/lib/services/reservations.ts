import { withTx, type Tx, type DbCtx } from "../db";
import { AppError, ForbiddenError, NotFoundError } from "../errors";
import { hasPerm } from "../rbac";
import { isIsoDate, todayJakarta } from "../utils";
import { getAvailability } from "./availability";
import { lockBalances, moveStock } from "./inventory";
import { audit } from "./audit";

export type Actor = { id: string; perms: string[]; ctx: DbCtx };

export const STATUSES = [
  "draft", "pending_approval", "approved", "rejected", "preparing", "ready_for_dispatch",
  "checked_out", "partially_returned", "returned", "completed", "cancelled",
] as const;
export type ReservationStatus = (typeof STATUSES)[number];
export const ACTIVE_HOLD_STATUSES: ReservationStatus[] = ["approved", "preparing", "ready_for_dispatch", "checked_out", "partially_returned"];

async function history(tx: Tx, reservationId: string, from: string | null, to: string, by: string, note?: string | null) {
  await tx.query(
    `INSERT INTO reservation_status_history(reservation_id, from_status, to_status, changed_by, note) VALUES ($1,$2,$3,$4,$5)`,
    [reservationId, from, to, by, note ?? null],
  );
}

async function lockReservation(tx: Tx, id: string) {
  const { rows } = await tx.query(`SELECT * FROM reservations WHERE id = $1 FOR UPDATE`, [id]);
  if (!rows[0]) throw new NotFoundError("Reservasi tidak ditemukan. / Reservation not found.");
  return rows[0];
}

async function setStatus(tx: Tx, actor: Actor, r: { id: string; status: string }, to: ReservationStatus, note?: string | null, extra = "") {
  await tx.query(`UPDATE reservations SET status = $2, updated_at = now() ${extra} WHERE id = $1`, [r.id, to]);
  await history(tx, r.id, r.status, to, actor.id, note);
}

async function items(tx: Tx, reservationId: string) {
  const { rows } = await tx.query(
    `SELECT ri.*, p.sku, p.name FROM reservation_items ri JOIN products p ON p.id = ri.product_id
      WHERE ri.reservation_id = $1 ORDER BY p.name`,
    [reservationId],
  );
  return rows;
}

// ---------------------------------------------------------------------------
// Cart (= the user's current draft reservation)
// ---------------------------------------------------------------------------
export async function getOrCreateCart(tx: Tx, actor: Actor) {
  const { rows } = await tx.query(`SELECT * FROM reservations WHERE requester_id = $1 AND is_cart`, [actor.id]);
  if (rows[0]) return rows[0];
  const u = (await tx.query(`SELECT department FROM users WHERE id = $1`, [actor.id])).rows[0];
  const ins = await tx.query(
    `INSERT INTO reservations(requester_id, status, is_cart, department) VALUES ($1,'draft',true,$2) RETURNING *`,
    [actor.id, u?.department ?? null],
  );
  return ins.rows[0];
}

export async function addToCart(actor: Actor, productId: string, qty: number) {
  if (!hasPerm(actor.perms, "reservation.create")) throw new ForbiddenError();
  if (!Number.isInteger(qty) || qty < 1 || qty > 9999) throw new AppError("Jumlah tidak valid. / Invalid quantity.");
  return withTx(actor.ctx, async (tx) => {
    const p = (await tx.query(`SELECT id FROM products WHERE id = $1 AND is_active`, [productId])).rows[0];
    if (!p) throw new NotFoundError("Produk tidak ditemukan. / Product not found.");
    const cart = await getOrCreateCart(tx, actor);
    await tx.query(
      `INSERT INTO reservation_items(reservation_id, product_id, qty_requested) VALUES ($1,$2,$3)
       ON CONFLICT (reservation_id, product_id) DO UPDATE SET qty_requested = reservation_items.qty_requested + EXCLUDED.qty_requested`,
      [cart.id, productId, qty],
    );
    await tx.query(`UPDATE reservations SET updated_at = now() WHERE id = $1`, [cart.id]);
    return cart.id as string;
  });
}

async function editableDraft(tx: Tx, actor: Actor, reservationId: string) {
  const r = await lockReservation(tx, reservationId);
  if (r.requester_id !== actor.id) throw new ForbiddenError();
  if (r.status !== "draft") throw new AppError("Hanya draf yang dapat diubah. / Only drafts can be edited.");
  return r;
}

export async function setItemQty(actor: Actor, reservationId: string, productId: string, qty: number) {
  return withTx(actor.ctx, async (tx) => {
    await editableDraft(tx, actor, reservationId);
    if (qty <= 0) {
      await tx.query(`DELETE FROM reservation_items WHERE reservation_id = $1 AND product_id = $2`, [reservationId, productId]);
    } else {
      if (!Number.isInteger(qty) || qty > 9999) throw new AppError("Jumlah tidak valid. / Invalid quantity.");
      await tx.query(`UPDATE reservation_items SET qty_requested = $3 WHERE reservation_id = $1 AND product_id = $2`, [reservationId, productId, qty]);
    }
    await tx.query(`UPDATE reservations SET updated_at = now() WHERE id = $1`, [reservationId]);
  });
}

export type DraftMeta = {
  project_id?: string | null;
  loading_date?: string | null;
  return_date?: string | null;
  event_location?: string | null;
  department?: string | null;
  special_instructions?: string | null;
};

export async function updateDraft(actor: Actor, reservationId: string, meta: DraftMeta) {
  for (const d of [meta.loading_date, meta.return_date]) if (d && !isIsoDate(d)) throw new AppError("Format tanggal tidak valid. / Invalid date.");
  if (meta.loading_date && meta.return_date && meta.return_date < meta.loading_date)
    throw new AppError("Tanggal kembali harus setelah tanggal loading. / Return date must be on/after loading date.");
  return withTx(actor.ctx, async (tx) => {
    await editableDraft(tx, actor, reservationId);
    if (meta.project_id) {
      const p = (await tx.query(`SELECT id, location FROM projects WHERE id = $1 AND status IN ('planning','active')`, [meta.project_id])).rows[0];
      if (!p) throw new AppError("Proyek tidak valid atau sudah ditutup. / Project invalid or closed.");
    }
    await tx.query(
      `UPDATE reservations SET project_id = $2, loading_date = $3, return_date = $4, event_location = $5,
              department = $6, special_instructions = $7, updated_at = now() WHERE id = $1`,
      [reservationId, meta.project_id || null, meta.loading_date || null, meta.return_date || null,
       meta.event_location || null, meta.department || null, meta.special_instructions || null],
    );
  });
}

/** Moves the cart into the saved-drafts list (a new empty cart is created on next add). */
export async function saveCartAsDraft(actor: Actor, reservationId: string) {
  return withTx(actor.ctx, async (tx) => {
    const r = await editableDraft(tx, actor, reservationId);
    if (!r.is_cart) return;
    await tx.query(`UPDATE reservations SET is_cart = false, updated_at = now() WHERE id = $1`, [reservationId]);
  });
}

/** Makes a saved draft the active cart again. */
export async function resumeDraft(actor: Actor, reservationId: string) {
  return withTx(actor.ctx, async (tx) => {
    const r = await editableDraft(tx, actor, reservationId);
    if (r.is_cart) return;
    const cur = (await tx.query(`SELECT id FROM reservations WHERE requester_id = $1 AND is_cart FOR UPDATE`, [actor.id])).rows[0];
    if (cur) {
      const n = (await tx.query(`SELECT count(*)::int AS n FROM reservation_items WHERE reservation_id = $1`, [cur.id])).rows[0].n;
      if (n === 0) await tx.query(`DELETE FROM reservations WHERE id = $1`, [cur.id]);
      else await tx.query(`UPDATE reservations SET is_cart = false WHERE id = $1`, [cur.id]);
    }
    await tx.query(`UPDATE reservations SET is_cart = true WHERE id = $1`, [reservationId]);
  });
}

export async function deleteDraft(actor: Actor, reservationId: string) {
  return withTx(actor.ctx, async (tx) => {
    await editableDraft(tx, actor, reservationId);
    await tx.query(`DELETE FROM reservations WHERE id = $1`, [reservationId]);
  });
}

export type AvailabilityIssue = { product_id: string; sku: string; name: string; requested: number; available: number };

async function checkHardAvailability(tx: Tx, reservationId: string, loading: string, ret: string, qtyField: "qty_requested" | "qty_approved") {
  const its = await items(tx, reservationId);
  const avail = await getAvailability(tx, its.map((i) => i.product_id), loading, ret, reservationId);
  const issues: AvailabilityIssue[] = [];
  for (const it of its) {
    const a = avail.get(it.product_id);
    const need = it[qtyField];
    if (!a || a.available < need) issues.push({ product_id: it.product_id, sku: it.sku, name: it.name, requested: need, available: a?.available ?? 0 });
  }
  return { its, issues };
}

function issueText(issues: AvailabilityIssue[]) {
  return issues.map((i) => `${i.sku} ${i.name}: diminta/requested ${i.requested}, tersedia/available ${i.available}`).join("; ");
}

async function nextNumber(tx: Tx) {
  const { rows } = await tx.query(`SELECT nextval('reservation_number_seq') AS n, to_char(now() AT TIME ZONE 'Asia/Jakarta', 'YYYY') AS y`);
  return `RES-${rows[0].y}-${String(rows[0].n).padStart(4, "0")}`;
}

export async function submitReservation(actor: Actor, reservationId: string) {
  if (!hasPerm(actor.perms, "reservation.create")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await editableDraft(tx, actor, reservationId);
    if (!r.project_id) throw new AppError("Pilih proyek terlebih dahulu. / Select a project first.");
    if (!r.loading_date || !r.return_date) throw new AppError("Tanggal loading dan pengembalian wajib diisi. / Loading and return dates are required.");
    if (r.loading_date < todayJakarta()) throw new AppError("Tanggal loading tidak boleh di masa lalu. / Loading date cannot be in the past.");
    const { its, issues } = await checkHardAvailability(tx, r.id, r.loading_date, r.return_date, "qty_requested");
    if (its.length === 0) throw new AppError("Keranjang reservasi kosong. / The reservation has no items.");
    if (issues.length) throw new AppError(`Stok tidak cukup untuk tanggal ini: ${issueText(issues)}`, "unavailable");
    const number = r.number ?? (await nextNumber(tx));
    await tx.query(`UPDATE reservations SET number = $2, is_cart = false, submitted_at = now() WHERE id = $1`, [r.id, number]);
    await setStatus(tx, actor, r, "pending_approval", "Diajukan / Submitted");
    await audit(tx, actor.id, "reservation.submit", "reservation", r.id, `Submitted ${number}`);
    return { id: r.id as string, number };
  });
}

// ---------------------------------------------------------------------------
// Approval (atomic, overbooking-safe)
// ---------------------------------------------------------------------------
export async function approveReservation(actor: Actor, reservationId: string, opts: { note?: string; approvedQty?: Record<string, number> } = {}) {
  if (!hasPerm(actor.perms, "reservation.approve")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (r.status !== "pending_approval") throw new AppError("Reservasi tidak dalam status menunggu persetujuan. / Reservation is not pending approval.");
    if (r.requester_id === actor.id && !hasPerm(actor.perms, "*")) throw new ForbiddenError("Tidak dapat menyetujui reservasi sendiri. / You cannot approve your own reservation.");
    let its = await items(tx, r.id);
    // Serialise all approvals touching these products: row locks on their inventory balances.
    await lockBalances(tx, its.map((i) => i.product_id));
    for (const it of its) {
      const q = opts.approvedQty?.[it.product_id] ?? it.qty_requested;
      if (!Number.isInteger(q) || q < 0 || q > it.qty_requested) throw new AppError(`Jumlah disetujui tidak valid untuk ${it.sku}. / Invalid approved quantity.`);
      await tx.query(`UPDATE reservation_items SET qty_approved = $2 WHERE id = $1`, [it.id, q]);
    }
    its = await items(tx, r.id);
    if (its.every((i) => i.qty_approved === 0)) throw new AppError("Minimal satu item harus disetujui. Gunakan Tolak. / Approve at least one item or reject.");
    // Re-validate availability AFTER acquiring locks (sees all committed approvals).
    const { issues } = await checkHardAvailability(tx, r.id, r.loading_date, r.return_date, "qty_approved");
    if (issues.length) throw new AppError(`Tidak dapat menyetujui — akan terjadi overbooking: ${issueText(issues)}`, "overbooking");
    await tx.query(`UPDATE reservations SET approved_by = $2, approved_at = now(), approval_note = $3 WHERE id = $1`, [r.id, actor.id, opts.note?.trim() || null]);
    await setStatus(tx, actor, r, "approved", opts.note ?? null);
    await audit(tx, actor.id, "reservation.approve", "reservation", r.id, `Approved ${r.number}`, null, its.map((i) => ({ sku: i.sku, qty: i.qty_approved })));
  });
}

export async function rejectReservation(actor: Actor, reservationId: string, reason: string) {
  if (!hasPerm(actor.perms, "reservation.approve")) throw new ForbiddenError();
  if (!reason?.trim()) throw new AppError("Alasan penolakan wajib diisi. / A rejection reason is required.");
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (r.status !== "pending_approval") throw new AppError("Reservasi tidak dalam status menunggu persetujuan. / Not pending approval.");
    await tx.query(`UPDATE reservations SET rejection_reason = $2, approved_by = $3, approved_at = now() WHERE id = $1`, [r.id, reason.trim(), actor.id]);
    await setStatus(tx, actor, r, "rejected", reason.trim());
    await audit(tx, actor.id, "reservation.reject", "reservation", r.id, `Rejected ${r.number}: ${reason.trim()}`);
  });
}

export async function cancelReservation(actor: Actor, reservationId: string, reason: string) {
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    const own = r.requester_id === actor.id;
    const any = hasPerm(actor.perms, "reservation.cancel_any");
    const ownAllowed = ["draft", "pending_approval", "approved"];
    const anyAllowed = ["draft", "pending_approval", "approved", "preparing", "ready_for_dispatch"];
    if (!((own && ownAllowed.includes(r.status)) || (any && anyAllowed.includes(r.status)))) {
      throw new AppError("Reservasi ini tidak dapat dibatalkan pada status saat ini. / This reservation cannot be cancelled in its current status.");
    }
    await tx.query(`UPDATE reservations SET is_cart = false WHERE id = $1`, [r.id]);
    await setStatus(tx, actor, r, "cancelled", reason?.trim() || null);
    await audit(tx, actor.id, "reservation.cancel", "reservation", r.id, `Cancelled ${r.number ?? "draft"}`);
  });
}

// ---------------------------------------------------------------------------
// Warehouse flow: preparing -> ready (picking) -> checked_out (dispatch) -> returns -> inspection
// ---------------------------------------------------------------------------
export async function startPreparing(actor: Actor, reservationId: string) {
  if (!hasPerm(actor.perms, "warehouse.pick")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (r.status !== "approved") throw new AppError("Hanya reservasi yang disetujui dapat disiapkan. / Only approved reservations can be prepared.");
    await setStatus(tx, actor, r, "preparing", "Picking dimulai / Picking started");
  });
}

export async function confirmPicking(actor: Actor, reservationId: string, picked: Record<string, number>, note?: string) {
  if (!hasPerm(actor.perms, "warehouse.pick")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (r.status !== "preparing" && r.status !== "approved") throw new AppError("Reservasi belum siap untuk picking. / Not ready for picking.");
    const its = await items(tx, r.id);
    const bal = await lockBalances(tx, its.map((i) => i.product_id));
    for (const it of its) {
      const q = picked[it.product_id] ?? it.qty_approved;
      if (!Number.isInteger(q) || q < 0 || q > it.qty_approved) throw new AppError(`Jumlah picking tidak valid untuk ${it.sku} (maks ${it.qty_approved}). / Invalid picked quantity.`);
      if (q > (bal.get(it.product_id)?.in_warehouse ?? 0)) throw new AppError(`Stok fisik di gudang untuk ${it.sku} tidak mencukupi. / Not enough physical stock in warehouse.`);
      await tx.query(`UPDATE reservation_items SET qty_picked = $2 WHERE id = $1`, [it.id, q]);
      if (q < it.qty_approved) {
        await tx.query(
          `INSERT INTO stock_discrepancies(product_id, reservation_id, kind, expected_qty, actual_qty, notes, reported_by)
           VALUES ($1,$2,'picking_short',$3,$4,$5,$6)`,
          [it.product_id, r.id, it.qty_approved, q, note ?? null, actor.id],
        );
      }
    }
    if (r.status === "approved") await setStatus(tx, actor, r, "preparing", "Picking dimulai / Picking started");
    await setStatus(tx, actor, { id: r.id, status: "preparing" }, "ready_for_dispatch", note ?? "Picking dikonfirmasi / Picking confirmed");
  });
}

export async function dispatchReservation(actor: Actor, reservationId: string, qtys: Record<string, number>, note?: string) {
  if (!hasPerm(actor.perms, "warehouse.checkout")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (r.status !== "ready_for_dispatch") throw new AppError("Reservasi belum siap dikirim. / Reservation is not ready for dispatch.");
    const its = await items(tx, r.id);
    let total = 0;
    for (const it of its) {
      const q = qtys[it.product_id] ?? it.qty_picked;
      if (!Number.isInteger(q) || q < 0 || q > it.qty_picked) throw new AppError(`Jumlah keluar untuk ${it.sku} melebihi jumlah picking (${it.qty_picked}). / Dispatch exceeds picked quantity.`);
      if (q > 0) {
        await moveStock(tx, actor, { productId: it.product_id, type: "checkout", qty: q, from: "in_warehouse", to: "checked_out", reservationId: r.id, projectId: r.project_id, reason: note ?? `Dispatch ${r.number}` });
      }
      await tx.query(`UPDATE reservation_items SET qty_checked_out = $2 WHERE id = $1`, [it.id, q]);
      total += q;
    }
    if (total === 0) throw new AppError("Tidak ada item yang dikeluarkan. / Nothing to dispatch.");
    await tx.query(`UPDATE reservations SET dispatched_at = now() WHERE id = $1`, [r.id]);
    await setStatus(tx, actor, r, "checked_out", note ?? null);
    await audit(tx, actor.id, "reservation.dispatch", "reservation", r.id, `Dispatched ${r.number} (${total} units)`);
  });
}

export async function registerReturn(
  actor: Actor,
  reservationId: string,
  lines: Record<string, { returned: number; missing?: number }>,
  note?: string,
) {
  if (!hasPerm(actor.perms, "warehouse.checkin")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    if (!["checked_out", "partially_returned"].includes(r.status)) throw new AppError("Reservasi tidak sedang di luar gudang. / Reservation is not checked out.");
    const its = await items(tx, r.id);
    let any = 0;
    for (const it of its) {
      const l = lines[it.product_id];
      if (!l) continue;
      const ret = l.returned ?? 0;
      const miss = l.missing ?? 0;
      const outstanding = it.qty_checked_out - it.qty_returned - it.qty_missing;
      if (!Number.isInteger(ret) || !Number.isInteger(miss) || ret < 0 || miss < 0) throw new AppError("Jumlah tidak valid. / Invalid quantity.");
      if (ret + miss > outstanding) throw new AppError(`Jumlah kembali + hilang untuk ${it.sku} melebihi yang masih di luar (${outstanding}). / Exceeds outstanding quantity.`);
      if (ret > 0) await moveStock(tx, actor, { productId: it.product_id, type: "checkin", qty: ret, from: "checked_out", to: "pending_inspection", reservationId: r.id, projectId: r.project_id, reason: note ?? `Return ${r.number}` });
      if (miss > 0) {
        await moveStock(tx, actor, { productId: it.product_id, type: "missing", qty: miss, from: "checked_out", to: "lost", reservationId: r.id, projectId: r.project_id, reason: note ?? `Missing on return ${r.number}` });
        await tx.query(
          `INSERT INTO stock_discrepancies(product_id, reservation_id, kind, expected_qty, actual_qty, notes, reported_by)
           VALUES ($1,$2,'return_missing',$3,$4,$5,$6)`,
          [it.product_id, r.id, outstanding, outstanding - miss, note ?? null, actor.id],
        );
      }
      await tx.query(`UPDATE reservation_items SET qty_returned = qty_returned + $2, qty_missing = qty_missing + $3 WHERE id = $1`, [it.id, ret, miss]);
      any += ret + miss;
    }
    if (any === 0) throw new AppError("Masukkan jumlah barang yang kembali. / Enter returned quantities.");
    const after = await items(tx, r.id);
    const allBack = after.every((i) => i.qty_returned + i.qty_missing >= i.qty_checked_out);
    const to = allBack ? "returned" : "partially_returned";
    if (to !== r.status) await setStatus(tx, actor, r, to, note ?? null);
    await audit(tx, actor.id, "reservation.return", "reservation", r.id, `Return registered for ${r.number} (${any} units)`);
    await maybeComplete(tx, actor, r.id);
  });
}

/**
 * Inspection decides where returned units go. Only 'good' units become bookable again.
 * Damaged units stay unavailable (damaged bucket) until repaired or released by a manager.
 */
export async function inspectReturn(
  actor: Actor,
  reservationId: string,
  productId: string,
  res: { good: number; damaged: number; lost: number; notes?: string; severity?: "minor" | "moderate" | "severe"; damageDescription?: string },
) {
  if (!hasPerm(actor.perms, "warehouse.inspect")) throw new ForbiddenError();
  return withTx(actor.ctx, async (tx) => {
    const r = await lockReservation(tx, reservationId);
    const it = (await tx.query(`SELECT ri.*, p.sku FROM reservation_items ri JOIN products p ON p.id = ri.product_id WHERE reservation_id = $1 AND product_id = $2 FOR UPDATE OF ri`, [r.id, productId])).rows[0];
    if (!it) throw new NotFoundError();
    const pending = it.qty_returned - it.qty_inspected_good - it.qty_inspected_damaged - it.qty_inspected_lost;
    const { good, damaged, lost } = res;
    for (const v of [good, damaged, lost]) if (!Number.isInteger(v) || v < 0) throw new AppError("Jumlah tidak valid. / Invalid quantity.");
    if (good + damaged + lost === 0) throw new AppError("Masukkan hasil inspeksi. / Enter inspection results.");
    if (good + damaged + lost > pending) throw new AppError(`Hanya ${pending} unit ${it.sku} yang menunggu inspeksi. / Only ${pending} units pending inspection.`);
    if (damaged > 0 && !res.damageDescription?.trim()) throw new AppError("Deskripsi kerusakan wajib diisi. / Damage description is required.");
    const base = { productId, reservationId: r.id, projectId: r.project_id };
    if (good) await moveStock(tx, actor, { ...base, type: "inspect_good", qty: good, from: "pending_inspection", to: "in_warehouse", reason: res.notes ?? "Inspeksi OK / Inspection OK" });
    if (damaged) {
      await moveStock(tx, actor, { ...base, type: "inspect_damaged", qty: damaged, from: "pending_inspection", to: "damaged", reason: res.damageDescription });
      await tx.query(
        `INSERT INTO damage_reports(product_id, reservation_id, quantity, remaining_qty, severity, description, reported_by)
         VALUES ($1,$2,$3,$3,$4,$5,$6)`,
        [productId, r.id, damaged, res.severity ?? "minor", res.damageDescription!.trim(), actor.id],
      );
    }
    if (lost) await moveStock(tx, actor, { ...base, type: "inspect_lost", qty: lost, from: "pending_inspection", to: "lost", reason: res.notes ?? "Tidak layak / lost at inspection" });
    await tx.query(
      `UPDATE reservation_items SET qty_inspected_good = qty_inspected_good + $2, qty_inspected_damaged = qty_inspected_damaged + $3,
              qty_inspected_lost = qty_inspected_lost + $4 WHERE id = $1`,
      [it.id, good, damaged, lost],
    );
    await tx.query(
      `INSERT INTO return_inspections(reservation_id, product_id, qty_good, qty_damaged, qty_lost, notes, inspected_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.id, productId, good, damaged, lost, res.notes ?? null, actor.id],
    );
    await maybeComplete(tx, actor, r.id);
  });
}

async function maybeComplete(tx: Tx, actor: Actor, reservationId: string) {
  const r = (await tx.query(`SELECT id, status FROM reservations WHERE id = $1`, [reservationId])).rows[0];
  if (r.status !== "returned") return;
  const its = await items(tx, reservationId);
  const done = its.every((i) => i.qty_inspected_good + i.qty_inspected_damaged + i.qty_inspected_lost >= i.qty_returned);
  if (done) await setStatus(tx, actor, r, "completed", "Semua item diinspeksi / All items inspected", ", completed_at = now()");
}

export { statusTone } from "../status";

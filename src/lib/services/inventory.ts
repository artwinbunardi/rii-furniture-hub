import type { Tx } from "../db";
import { AppError } from "../errors";

export const BUCKETS = ["in_warehouse", "checked_out", "pending_inspection", "damaged", "under_repair", "lost"] as const;
export type Bucket = (typeof BUCKETS)[number];
/** 'external' = stock entering (receiving) or leaving (write-off) RII ownership. */
export type Endpoint = Bucket | "external";

export type MovementType =
  | "initial" | "receive" | "adjustment" | "checkout" | "checkin" | "inspect_good" | "inspect_damaged" | "inspect_lost"
  | "missing" | "repair_start" | "repair_done" | "release_damaged" | "write_off" | "found" | "relocate";

export type Balance = {
  product_id: string;
  owned: number;
  in_warehouse: number;
  checked_out: number;
  pending_inspection: number;
  damaged: number;
  under_repair: number;
  lost: number;
};

export type Actor = { id: string; perms: string[] };

const BUCKET_LABEL: Record<Endpoint, string> = {
  in_warehouse: "di gudang / in warehouse",
  checked_out: "keluar / checked out",
  pending_inspection: "menunggu inspeksi / pending inspection",
  damaged: "rusak / damaged",
  under_repair: "diperbaiki / under repair",
  lost: "hilang / lost",
  external: "external",
};

export async function lockBalances(tx: Tx, productIds: string[]): Promise<Map<string, Balance>> {
  const ids = [...new Set(productIds)].sort();
  const { rows } = await tx.query<Balance>(
    `SELECT product_id, owned, in_warehouse, checked_out, pending_inspection, damaged, under_repair, lost
       FROM inventory_balances WHERE product_id = ANY($1::uuid[]) ORDER BY product_id FOR UPDATE`,
    [ids],
  );
  return new Map(rows.map((r) => [r.product_id, r]));
}

/**
 * The ONLY way inventory balances change. Locks the balance row, validates that the source
 * bucket holds enough units (never negative), applies the change and appends an immutable
 * movement ledger row with before/after state. DB CHECK constraints are the last safety net.
 */
export async function moveStock(
  tx: Tx,
  actor: Actor,
  m: {
    productId: string;
    type: MovementType;
    qty: number;
    from: Endpoint;
    to: Endpoint;
    reservationId?: string | null;
    projectId?: string | null;
    reason?: string | null;
    approvedBy?: string | null;
  },
): Promise<{ movementId: number; before: Balance; after: Balance }> {
  if (!Number.isInteger(m.qty) || m.qty <= 0) throw new AppError("Jumlah harus bilangan bulat positif. / Quantity must be a positive integer.");
  if (m.from === m.to) throw new AppError("Asal dan tujuan stok sama. / Source and destination are identical.");
  const map = await lockBalances(tx, [m.productId]);
  const before = map.get(m.productId);
  if (!before) throw new AppError("Saldo inventaris produk tidak ditemukan. / Inventory balance not found.");
  const after: Balance = { ...before };
  if (m.from === "external") after.owned += m.qty;
  else {
    if (before[m.from] < m.qty) {
      const { rows } = await tx.query(`SELECT sku FROM products WHERE id = $1`, [m.productId]);
      throw new AppError(
        `Stok ${rows[0]?.sku ?? ""} tidak mencukupi: ${BUCKET_LABEL[m.from]} = ${before[m.from]}, dibutuhkan ${m.qty}. / Insufficient stock.`,
        "insufficient_stock",
      );
    }
    after[m.from] -= m.qty;
  }
  if (m.to === "external") after.owned -= m.qty;
  else after[m.to] += m.qty;

  await tx.query(
    `UPDATE inventory_balances SET owned=$2, in_warehouse=$3, checked_out=$4, pending_inspection=$5, damaged=$6,
            under_repair=$7, lost=$8, updated_at=now() WHERE product_id=$1`,
    [m.productId, after.owned, after.in_warehouse, after.checked_out, after.pending_inspection, after.damaged, after.under_repair, after.lost],
  );
  const strip = (b: Balance) => ({ owned: b.owned, in_warehouse: b.in_warehouse, checked_out: b.checked_out, pending_inspection: b.pending_inspection, damaged: b.damaged, under_repair: b.under_repair, lost: b.lost });
  const { rows } = await tx.query(
    `INSERT INTO inventory_movements(product_id, movement_type, quantity, from_bucket, to_bucket, before_state, after_state,
                                     reservation_id, project_id, reason, performed_by, approved_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [m.productId, m.type, m.qty, m.from, m.to, JSON.stringify(strip(before)), JSON.stringify(strip(after)),
     m.reservationId ?? null, m.projectId ?? null, m.reason ?? null, actor.id, m.approvedBy ?? null],
  );
  return { movementId: rows[0].id, before, after };
}

export function usableOf(b: Balance) {
  return b.owned - b.pending_inspection - b.damaged - b.under_repair - b.lost;
}

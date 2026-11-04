import { isIsoDate } from "@/lib/utils";

export const MOVEMENT_TYPES = ["initial", "receive", "adjustment", "checkout", "checkin", "inspect_good", "inspect_damaged", "inspect_lost", "missing", "repair_start", "repair_done", "release_damaged", "write_off", "found", "relocate"];
export type MovementSP = { product?: string; type?: string; from?: string; to?: string; q?: string; page?: string };
const UUID = /^[0-9a-f-]{36}$/i;
export const isUuid = (s?: string) => !!s && UUID.test(s);

/** Builds a parameterised WHERE clause (aliases: m = inventory_movements, p = products, r = reservations). */
export function movementFilters(sp: MovementSP) {
  const params: unknown[] = [];
  const where = ["true"];
  if (isUuid(sp.product)) { params.push(sp.product); where.push(`m.product_id = $${params.length}`); }
  if (sp.type && MOVEMENT_TYPES.includes(sp.type)) { params.push(sp.type); where.push(`m.movement_type = $${params.length}`); }
  if (sp.from && isIsoDate(sp.from)) { params.push(sp.from); where.push(`(m.created_at AT TIME ZONE 'Asia/Jakarta')::date >= $${params.length}::date`); }
  if (sp.to && isIsoDate(sp.to)) { params.push(sp.to); where.push(`(m.created_at AT TIME ZONE 'Asia/Jakarta')::date <= $${params.length}::date`); }
  if (sp.q) { params.push(`%${sp.q}%`); const n = params.length; where.push(`(p.sku ILIKE $${n} OR p.name ILIKE $${n} OR r.number ILIKE $${n} OR m.reason ILIKE $${n})`); }
  return { where: where.join(" AND "), params };
}

export const MOVEMENT_BASE = (where: string) => `FROM inventory_movements m JOIN products p ON p.id = m.product_id LEFT JOIN users u ON u.id = m.performed_by
  LEFT JOIN users a ON a.id = m.approved_by LEFT JOIN reservations r ON r.id = m.reservation_id WHERE ${where}`;

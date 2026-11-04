import type { Tx } from "../db";
import { addDays } from "../utils";

export type Availability = { product_id: string; usable: number; reserved: number; pending: number; available: number };

/** Turnaround buffer (days) applied after each return date before the item can go out again. */
export async function turnaroundDays(tx: Tx): Promise<number> {
  const { rows } = await tx.query(`SELECT setting_int('turnaround_days', 1) AS d`);
  return rows[0].d;
}

/**
 * Bookable availability for an inclusive loading..return window.
 * The window requested by a booking is expanded by the turnaround buffer, the same way
 * existing holds are (see reservation_holds view), so back-to-back bookings respect it.
 */
export async function getAvailability(
  tx: Tx,
  productIds: string[],
  loading: string,
  ret: string,
  excludeReservationId: string | null = null,
): Promise<Map<string, Availability>> {
  if (productIds.length === 0) return new Map();
  const { rows } = await tx.query<Availability & { turnaround: number }>(
    `SELECT a.*, coalesce(p.turnaround_days, setting_int('turnaround_days', 1)) AS turnaround
       FROM products p, LATERAL product_availability(ARRAY[p.id], $2::date,
            ($3::date + coalesce(p.turnaround_days, setting_int('turnaround_days', 1))), $4::uuid) a
      WHERE p.id = ANY($1::uuid[])`,
    [productIds, loading, ret, excludeReservationId],
  );
  return new Map(rows.map((r) => [r.product_id, r]));
}

export async function getDailyAvailability(tx: Tx, productId: string, from: string, days = 42) {
  const { rows } = await tx.query<{ day: string; usable: number; reserved: number; pending: number; available: number }>(
    `SELECT * FROM product_daily_availability($1, $2::date, $3::date)`,
    [productId, from, addDays(from, days - 1)],
  );
  return rows;
}

/** Current physical + today's availability snapshot for many products (for lists). */
export async function getTodayAvailability(tx: Tx, productIds: string[], today: string) {
  return getAvailability(tx, productIds, today, today);
}

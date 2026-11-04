import { withTx, type DbCtx, type Tx } from "../db";
import { getAvailability } from "./availability";
import { mediaUrl } from "./catalog";

const IMG = `(SELECT m.storage_key FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort LIMIT 1)`;

export async function reservationItems(tx: Tx, reservationId: string) {
  const { rows } = await tx.query(
    `SELECT ri.*, p.sku, p.name, p.slug, ${IMG} AS image_key, p.location_id, sl.code AS location_code, b.in_warehouse, b.owned
       FROM reservation_items ri JOIN products p ON p.id = ri.product_id
       JOIN inventory_balances b ON b.product_id = p.id
       LEFT JOIN storage_locations sl ON sl.id = p.location_id
      WHERE ri.reservation_id = $1 ORDER BY p.name`,
    [reservationId],
  );
  return rows.map((r) => ({ ...r, image: mediaUrl(r.image_key) }));
}

export async function getCartView(ctx: DbCtx) {
  return withTx(ctx, async (tx) => {
    const r = (await tx.query(
      `SELECT r.*, pr.code AS project_code, pr.name AS project_name FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id
        WHERE r.requester_id = $1 AND r.is_cart`,
      [ctx.userId],
    )).rows[0];
    const projects = (await tx.query(
      `SELECT id, code, name, client_name, event_name, location, start_date, end_date FROM projects WHERE status IN ('planning','active') ORDER BY start_date NULLS LAST, code`,
    )).rows;
    if (!r) return { cart: null, projects };
    const items = await reservationItems(tx, r.id);
    let availability: Record<string, { available: number; pending: number; usable: number }> = {};
    if (r.loading_date && r.return_date && items.length) {
      const a = await getAvailability(tx, items.map((i) => i.product_id), r.loading_date, r.return_date, r.id);
      availability = Object.fromEntries([...a.entries()].map(([k, v]) => [k, { available: v.available, pending: v.pending, usable: v.usable }]));
    }
    return { cart: { ...r, items, availability }, projects };
  });
}

export async function listMyReservations(ctx: DbCtx) {
  return withTx(ctx, async (tx) => {
    const { rows } = await tx.query(
      `SELECT r.id, r.number, r.status, r.loading_date, r.return_date, r.created_at, r.submitted_at, r.is_cart,
              pr.name AS project_name, pr.code AS project_code,
              (SELECT coalesce(sum(qty_requested),0) FROM reservation_items ri WHERE ri.reservation_id = r.id)::int AS units,
              (SELECT count(*) FROM reservation_items ri WHERE ri.reservation_id = r.id)::int AS lines
         FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id
        WHERE r.requester_id = $1 AND NOT r.is_cart
        ORDER BY coalesce(r.submitted_at, r.created_at) DESC`,
      [ctx.userId],
    );
    return rows;
  });
}

export async function getReservationView(ctx: DbCtx, id: string) {
  return withTx(ctx, async (tx) => {
    const r = (await tx.query(
      `SELECT r.*, pr.code AS project_code, pr.name AS project_name, pr.client_name, pr.event_name, pr.location AS project_location,
              u.name AS requester_name, u.email::text AS requester_email, a.name AS approver_name
         FROM reservations r
         LEFT JOIN projects pr ON pr.id = r.project_id
         JOIN users u ON u.id = r.requester_id
         LEFT JOIN users a ON a.id = r.approved_by
        WHERE r.id::text = $1 OR r.number = $1`,
      [id],
    )).rows[0];
    if (!r) return null;
    const items = await reservationItems(tx, r.id);
    const history = (await tx.query(
      `SELECT h.*, u.name AS user_name FROM reservation_status_history h LEFT JOIN users u ON u.id = h.changed_by WHERE h.reservation_id = $1 ORDER BY h.created_at`,
      [r.id],
    )).rows;
    let availability: Record<string, { available: number; pending: number; usable: number; reserved: number }> = {};
    if (r.loading_date && r.return_date && items.length) {
      const a = await getAvailability(tx, items.map((i) => i.product_id), r.loading_date, r.return_date, r.id);
      availability = Object.fromEntries([...a.entries()].map(([k, v]) => [k, v]));
    }
    return { ...r, items, history, availability };
  });
}

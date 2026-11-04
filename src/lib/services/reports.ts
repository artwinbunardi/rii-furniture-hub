import { q, q1, type DbCtx } from "../db";
import { addDays, todayJakarta } from "../utils";

/** Headline KPIs, all computed live from the database. */
export async function dashboardKpis(ctx: DbCtx) {
  const today = todayJakarta();
  const row = await q1(ctx, `
    WITH bal AS (SELECT sum(owned)::int owned, sum(in_warehouse)::int in_wh, sum(checked_out)::int out, sum(pending_inspection)::int insp,
                        sum(damaged)::int dmg, sum(under_repair)::int rep, sum(lost)::int lost,
                        sum(owned - pending_inspection - damaged - under_repair - lost)::int usable FROM inventory_balances),
         held AS (SELECT coalesce(sum(qty) FILTER (WHERE is_hard), 0)::int hard FROM reservation_holds WHERE $1::date BETWEEN hold_start AND hold_end)
    SELECT bal.*, held.hard AS reserved_today,
      (SELECT count(*)::int FROM products WHERE is_active) AS skus,
      (SELECT count(*)::int FROM reservations WHERE status = 'pending_approval') AS pending,
      (SELECT count(*)::int FROM reservations WHERE status IN ('approved','preparing','ready_for_dispatch')) AS upcoming,
      (SELECT count(*)::int FROM reservations WHERE status IN ('checked_out','partially_returned')) AS active_out,
      (SELECT count(*)::int FROM reservations WHERE status IN ('checked_out','partially_returned') AND return_date < $1::date) AS overdue,
      (SELECT count(*)::int FROM reservations WHERE NOT is_cart AND submitted_at >= date_trunc('month', now() AT TIME ZONE 'Asia/Jakarta')) AS submitted_month,
      (SELECT count(*)::int FROM stock_adjustments WHERE status = 'pending') AS pending_adjustments,
      (SELECT count(*)::int FROM stock_discrepancies WHERE status = 'open') AS open_discrepancies,
      (SELECT count(*)::int FROM damage_reports WHERE status <> 'resolved') AS open_damage
    FROM bal, held`, [today]);
  return row!;
}

/** Fleet-wide daily holds (units) for a date window: hard = confirmed, soft = awaiting approval. */
export async function fleetUtilization(ctx: DbCtx, from: string, to: string) {
  const usable = (await q1<{ u: number }>(ctx, `SELECT coalesce(sum(owned - pending_inspection - damaged - under_repair - lost),0)::int u FROM inventory_balances`))!.u;
  const days = await q<{ day: string; hard: number; soft: number }>(ctx, `
    SELECT d::date::text AS day, coalesce(sum(h.qty) FILTER (WHERE h.is_hard),0)::int hard, coalesce(sum(h.qty) FILTER (WHERE NOT h.is_hard),0)::int soft
      FROM generate_series($1::date, $2::date, interval '1 day') d
      LEFT JOIN reservation_holds h ON d::date BETWEEN h.hold_start AND h.hold_end
     GROUP BY d ORDER BY d`, [from, to]);
  return { usable, days: days.map((d) => ({ ...d, pct: usable ? Math.round((1000 * d.hard) / usable) / 10 : 0 })) };
}

/** Reservations submitted per ISO week. */
export async function weeklySubmissions(ctx: DbCtx, weeks = 12) {
  return q<{ week: string; n: number; approved: number }>(ctx, `
    WITH w AS (SELECT generate_series(date_trunc('week', (now() AT TIME ZONE 'Asia/Jakarta')::date - ($1::int - 1) * 7), date_trunc('week', (now() AT TIME ZONE 'Asia/Jakarta')::date), interval '1 week')::date AS week)
    SELECT w.week::text, count(r.id)::int AS n, count(r.id) FILTER (WHERE r.approved_at IS NOT NULL)::int AS approved
      FROM w LEFT JOIN reservations r ON NOT r.is_cart AND r.submitted_at IS NOT NULL AND date_trunc('week', r.submitted_at AT TIME ZONE 'Asia/Jakarta')::date = w.week
     GROUP BY w.week ORDER BY w.week`, [weeks]);
}

/** Most-reserved products by approved units over a date window (by loading date). */
export async function topReserved(ctx: DbCtx, from: string, to: string, limit = 8) {
  return q<{ id: string; sku: string; name: string; units: number; bookings: number }>(ctx, `
    SELECT p.id, p.sku, p.name, sum(coalesce(i.qty_approved, 0))::int units, count(DISTINCT r.id)::int bookings
      FROM reservation_items i JOIN reservations r ON r.id = i.reservation_id JOIN products p ON p.id = i.product_id
     WHERE r.status NOT IN ('draft','rejected','cancelled','pending_approval') AND r.loading_date <= $2::date AND r.return_date >= $1::date
     GROUP BY p.id ORDER BY units DESC, bookings DESC LIMIT $3`, [from, to, limit]);
}

/** Products whose peak confirmed holds in the window leave little bookable stock. */
export async function lowAvailability(ctx: DbCtx, from: string, to: string, limit = 8) {
  const thr = (await q1<{ v: number }>(ctx, `SELECT coalesce((SELECT (value #>> '{}')::numeric FROM app_settings WHERE key = 'low_availability_threshold'), 0.2)::float AS v`))!.v;
  return q<{ id: string; sku: string; name: string; usable: number; reserved: number; available: number }>(ctx, `
    SELECT p.id, p.sku, p.name, a.usable, a.reserved, a.available
      FROM products p, LATERAL product_availability(ARRAY[p.id], $1::date, $2::date) a
     WHERE p.is_active AND a.usable > 0 AND a.available::float / a.usable <= $3
     ORDER BY a.available::float / a.usable, p.sku LIMIT $4`, [from, to, thr, limit]);
}

export async function loadingSchedule(ctx: DbCtx, days = 7) {
  const today = todayJakarta();
  return q(ctx, `
    SELECT r.id, r.number, r.status, r.loading_date, r.return_date, pr.name AS project, u.name AS requester,
           (SELECT coalesce(sum(coalesce(i.qty_approved, i.qty_requested)),0)::int FROM reservation_items i WHERE i.reservation_id = r.id) AS units,
           CASE WHEN r.status IN ('checked_out','partially_returned') THEN 'return' ELSE 'loading' END AS kind
      FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id LEFT JOIN users u ON u.id = r.requester_id
     WHERE (r.status IN ('approved','preparing','ready_for_dispatch') AND r.loading_date BETWEEN $1::date AND $2::date)
        OR (r.status IN ('checked_out','partially_returned') AND r.return_date <= $2::date)
     ORDER BY CASE WHEN r.status IN ('checked_out','partially_returned') THEN r.return_date ELSE r.loading_date END, r.number`, [today, addDays(today, days)]);
}

export async function statusBreakdown(ctx: DbCtx, from: string, to: string) {
  return q<{ status: string; n: number }>(ctx, `
    SELECT status, count(*)::int n FROM reservations
     WHERE NOT is_cart AND status <> 'draft' AND loading_date <= $2::date AND return_date >= $1::date
     GROUP BY status ORDER BY n DESC`, [from, to]);
}

export async function damageSummary(ctx: DbCtx, from: string, to: string) {
  return q(ctx, `
    SELECT p.id, p.sku, p.name, count(d.id)::int reports, sum(d.quantity)::int units,
           count(*) FILTER (WHERE d.severity = 'severe')::int severe
      FROM damage_reports d JOIN products p ON p.id = d.product_id
     WHERE (d.created_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
     GROUP BY p.id ORDER BY units DESC LIMIT 20`, [from, to]);
}

export async function projectUsage(ctx: DbCtx, from: string, to: string) {
  return q(ctx, `
    SELECT pr.id, pr.code, pr.name, pr.client_name, count(DISTINCT r.id)::int reservations,
           coalesce(sum(i.qty_approved),0)::int units_approved, coalesce(sum(i.qty_missing),0)::int units_missing
      FROM projects pr JOIN reservations r ON r.project_id = pr.id AND NOT r.is_cart AND r.status NOT IN ('draft','rejected','cancelled')
      LEFT JOIN reservation_items i ON i.reservation_id = r.id
     WHERE r.loading_date <= $2::date AND r.return_date >= $1::date
     GROUP BY pr.id ORDER BY units_approved DESC LIMIT 20`, [from, to]);
}

import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth/session";
import { q } from "@/lib/db";
import { errorMessage, ForbiddenError } from "@/lib/errors";
import { audit } from "@/lib/services/audit";
import { withTx } from "@/lib/db";
import { todayJakarta, isIsoDate } from "@/lib/utils";
import { MOVEMENT_BASE, movementFilters } from "@/lib/services/movement-filters";
import { STATUSES } from "@/lib/services/reservations";

export const dynamic = "force-dynamic";

/** RFC-4180 CSV; leading =,+,-,@ are prefixed with ' to prevent spreadsheet formula injection. */
function toCsv(rows: Record<string, unknown>[], cols: string[]) {
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [cols.join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n");
}

type Sp = URLSearchParams;
const EXPORTS: Record<string, (ctx: Parameters<typeof q>[0], sp: Sp) => Promise<{ rows: Record<string, unknown>[]; cols: string[] }>> = {
  async reservations(ctx, sp) {
    const params: unknown[] = []; const where = ["NOT r.is_cart", "r.status <> 'draft'"];
    const st = sp.get("status");
    if (st && (STATUSES as readonly string[]).includes(st)) { params.push(st); where.push(`r.status = $${params.length}`); }
    const from = sp.get("from"), to = sp.get("to");
    if (from && isIsoDate(from)) { params.push(from); where.push(`r.return_date >= $${params.length}::date`); }
    if (to && isIsoDate(to)) { params.push(to); where.push(`r.loading_date <= $${params.length}::date`); }
    const rows = await q(ctx, `SELECT r.number, r.status, pr.code AS project_code, pr.name AS project_name, pr.client_name, r.event_location,
        r.department, r.loading_date, r.return_date, u.name AS requester, u.email AS requester_email, ap.name AS approver,
        (SELECT count(*) FROM reservation_items i WHERE i.reservation_id = r.id) AS lines,
        (SELECT coalesce(sum(i.qty_requested),0) FROM reservation_items i WHERE i.reservation_id = r.id) AS qty_requested,
        (SELECT coalesce(sum(i.qty_approved),0) FROM reservation_items i WHERE i.reservation_id = r.id) AS qty_approved,
        (SELECT coalesce(sum(i.qty_checked_out),0) FROM reservation_items i WHERE i.reservation_id = r.id) AS qty_checked_out,
        (SELECT coalesce(sum(i.qty_returned),0) FROM reservation_items i WHERE i.reservation_id = r.id) AS qty_returned,
        r.submitted_at, r.approved_at, r.created_at
      FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id LEFT JOIN users u ON u.id = r.requester_id LEFT JOIN users ap ON ap.id = r.approved_by
      WHERE ${where.join(" AND ")} ORDER BY r.loading_date DESC, r.number`, params);
    return { rows, cols: ["number", "status", "project_code", "project_name", "client_name", "event_location", "department", "loading_date", "return_date", "requester", "requester_email", "approver", "lines", "qty_requested", "qty_approved", "qty_checked_out", "qty_returned", "submitted_at", "approved_at", "created_at"] };
  },
  async inventory(ctx) {
    const rows = await q(ctx, `SELECT p.sku, p.name, c.name_en AS category, sl.code AS location, p.is_active, p.min_stock,
        b.owned, b.in_warehouse, b.checked_out, b.pending_inspection, b.damaged, b.under_repair, b.lost,
        a.usable, a.reserved AS reserved_today, a.available AS bookable_today
      FROM products p JOIN categories c ON c.id = p.category_id JOIN inventory_balances b ON b.product_id = p.id
      LEFT JOIN storage_locations sl ON sl.id = p.location_id
      LEFT JOIN LATERAL product_availability(ARRAY[p.id], $1::date, $1::date) a ON true ORDER BY p.sku`, [todayJakarta()]);
    return { rows, cols: ["sku", "name", "category", "location", "is_active", "min_stock", "owned", "in_warehouse", "checked_out", "pending_inspection", "damaged", "under_repair", "lost", "usable", "reserved_today", "bookable_today"] };
  },
  async movements(ctx, sp) {
    const { where, params } = movementFilters(Object.fromEntries(sp));
    const rows = await q(ctx, `SELECT m.id, m.created_at, p.sku, p.name AS product, m.movement_type, m.quantity, m.from_bucket, m.to_bucket,
        m.before_state->>'in_warehouse' AS wh_before, m.after_state->>'in_warehouse' AS wh_after, r.number AS reservation, m.reason,
        u.name AS performed_by, a.name AS approved_by ${MOVEMENT_BASE(where)} ORDER BY m.created_at DESC, m.id DESC LIMIT 50000`, params);
    return { rows, cols: ["id", "created_at", "sku", "product", "movement_type", "quantity", "from_bucket", "to_bucket", "wh_before", "wh_after", "reservation", "reason", "performed_by", "approved_by"] };
  },
  async utilization(ctx, sp) {
    const from = isIsoDate(sp.get("from") ?? "") ? sp.get("from")! : todayJakarta();
    const to = isIsoDate(sp.get("to") ?? "") ? sp.get("to")! : from;
    const rows = await q(ctx, `SELECT p.sku, p.name, a.usable, a.reserved AS peak_reserved, a.available AS min_available,
        CASE WHEN a.usable > 0 THEN round(100.0 * a.reserved / a.usable, 1) ELSE 0 END AS peak_utilization_pct,
        (SELECT coalesce(sum(i.qty_approved),0) FROM reservation_items i JOIN reservations r ON r.id = i.reservation_id
          WHERE i.product_id = p.id AND r.status NOT IN ('draft','rejected','cancelled','pending_approval') AND r.loading_date <= $2::date AND r.return_date >= $1::date) AS units_booked_in_range
      FROM products p LEFT JOIN LATERAL product_availability(ARRAY[p.id], $1::date, $2::date) a ON true ORDER BY peak_utilization_pct DESC, p.sku`, [from, to]);
    return { rows, cols: ["sku", "name", "usable", "peak_reserved", "min_available", "peak_utilization_pct", "units_booked_in_range"] };
  },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const fn = EXPORTS[kind];
  if (!fn) return NextResponse.json({ error: "Unknown export" }, { status: 404 });
  try {
    const user = await authorize("reports.export");
    const { rows, cols } = await fn(user.ctx, req.nextUrl.searchParams);
    await withTx(user.ctx, (db) => audit(db, user.id, "export.csv", "export", null, `Exported ${kind} (${rows.length} rows)`, undefined, { query: req.nextUrl.search }));
    return new NextResponse(toCsv(rows, cols), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="rii-${kind}-${todayJakarta()}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: e instanceof ForbiddenError ? 403 : 500 });
  }
}

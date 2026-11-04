import Link from "next/link";
import { AlertTriangle, ArrowRight, Boxes, CalendarClock, Clock, PackageCheck, Truck, Wrench } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader, Stat, EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { UtilizationChart, WeeklyChart } from "@/components/charts";
import { addDays, fmtDate, fmtDateTime, fmtNum, todayJakarta } from "@/lib/utils";
import { dashboardKpis, fleetUtilization, weeklySubmissions, topReserved, lowAvailability, loadingSchedule } from "@/lib/services/reports";

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("dashboard.view");
  const { t, lang } = await getT();
  const en = lang === "en";
  const today = todayJakarta();
  const [k, util, weekly, top, low, schedule, pending, movements, recent] = await Promise.all([
    dashboardKpis(user.ctx),
    fleetUtilization(user.ctx, addDays(today, -14), addDays(today, 30)),
    weeklySubmissions(user.ctx, 12),
    topReserved(user.ctx, addDays(today, -90), addDays(today, 60), 8),
    lowAvailability(user.ctx, today, addDays(today, 14), 8),
    loadingSchedule(user.ctx, 7),
    q(user.ctx, `SELECT r.id, r.number, r.loading_date, r.return_date, r.submitted_at, pr.name AS project, u.name AS requester,
        (SELECT coalesce(sum(qty_requested),0)::int FROM reservation_items i WHERE i.reservation_id = r.id) AS units
        FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id LEFT JOIN users u ON u.id = r.requester_id
        WHERE r.status = 'pending_approval' ORDER BY r.loading_date, r.submitted_at LIMIT 6`),
    q(user.ctx, `SELECT m.id, m.created_at, m.movement_type, m.quantity, p.sku, p.name, m.product_id FROM inventory_movements m JOIN products p ON p.id = m.product_id ORDER BY m.created_at DESC, m.id DESC LIMIT 8`),
    q(user.ctx, `SELECT r.id, r.number, r.status, r.loading_date, pr.name AS project FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id
        WHERE NOT r.is_cart AND r.status <> 'draft' ORDER BY coalesce(r.submitted_at, r.created_at) DESC LIMIT 6`),
  ]);
  const utilToday = k.usable ? Math.round((100 * k.reserved_today) / k.usable) : 0;
  const maxTop = Math.max(1, ...top.map((x) => x.units));
  return (
    <>
      <PageHeader title={t("nav_dashboard")} subtitle={en ? `Live figures from the inventory and reservation database · ${fmtDate(today, lang)}` : `Angka langsung dari database inventaris dan reservasi · ${fmtDate(today, lang)}`} />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Stat label={en ? "Units owned" : "Unit dimiliki"} value={fmtNum(k.owned)} hint={`${k.skus} SKU ${en ? "active" : "aktif"}`} icon={<Boxes className="h-4 w-4" />} />
        <Stat label={t("in_warehouse")} value={fmtNum(k.in_wh)} icon={<PackageCheck className="h-4 w-4" />} />
        <Stat label={t("checked_out")} value={fmtNum(k.out)} hint={`${k.active_out} ${en ? "reservations" : "reservasi"}`} icon={<Truck className="h-4 w-4" />} />
        <Stat label={en ? "Utilization today" : "Utilisasi hari ini"} value={`${utilToday}%`} hint={`${fmtNum(k.reserved_today)} / ${fmtNum(k.usable)} ${en ? "usable units held" : "unit usable ditahan"}`} />
        <Link href="/app/reservations?status=pending_approval"><Stat label={en ? "Awaiting approval" : "Menunggu persetujuan"} value={k.pending} tone={k.pending ? "warn" : "default"} icon={<Clock className="h-4 w-4" />} /></Link>
        <Stat label={en ? "Upcoming (approved)" : "Akan datang (disetujui)"} value={k.upcoming} icon={<CalendarClock className="h-4 w-4" />} />
        <Link href="/app/warehouse/returns"><Stat label={en ? "Overdue returns" : "Pengembalian terlambat"} value={k.overdue} tone={k.overdue ? "bad" : "default"} icon={<AlertTriangle className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/damaged"><Stat label={`${t("damaged")} + ${t("under_repair")}`} value={fmtNum(k.dmg + k.rep)} hint={`${k.open_damage} ${en ? "open reports" : "laporan terbuka"}`} tone={k.dmg + k.rep ? "warn" : "default"} icon={<Wrench className="h-4 w-4" />} /></Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title={en ? "Fleet utilization" : "Utilisasi armada furnitur"} subtitle={en ? "Units held per day across all products (last 14 days → next 30 days), incl. turnaround buffer." : "Unit yang ditahan per hari untuk semua produk (14 hari lalu → 30 hari ke depan), termasuk buffer perawatan."} />
          <div className="p-4 pt-2"><UtilizationChart data={util.days} usable={util.usable} lang={lang} /></div>
        </Card>
        <Card>
          <CardHeader title={en ? "Reservations per week" : "Reservasi per minggu"} subtitle={en ? "Last 12 weeks, by submission date" : "12 minggu terakhir, berdasarkan tanggal pengajuan"} />
          <div className="p-4 pt-2"><WeeklyChart data={weekly} lang={lang} /></div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader title={en ? "Approval queue" : "Antrean persetujuan"} action={<Link href="/app/reservations?status=pending_approval" className="text-xs text-ink-500 hover:text-ink">{t("view_all")} <ArrowRight className="inline h-3 w-3" /></Link>} />
          {pending.length === 0 ? <div className="p-4"><EmptyState title={en ? "Nothing waiting" : "Tidak ada antrean"} /></div> : (
            <ul className="divide-y divide-line">{pending.map((r) => (
              <li key={r.id}><Link href={`/app/reservations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
                <span className="min-w-0"><span className="font-mono text-xs">{r.number}</span><span className="block truncate text-sm">{r.project}</span><span className="text-xs text-ink-400">{r.requester}</span></span>
                <span className="text-right text-xs text-ink-500">{fmtDate(r.loading_date, lang)}<span className="block tabular-nums">{r.units} unit</span></span>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Loading & return schedule (7 days)" : "Jadwal muat & kembali (7 hari)"} action={<Link href="/app/warehouse" className="text-xs text-ink-500 hover:text-ink">{t("nav_warehouse")} <ArrowRight className="inline h-3 w-3" /></Link>} />
          {schedule.length === 0 ? <div className="p-4"><EmptyState title={en ? "No movements scheduled" : "Tidak ada jadwal"} /></div> : (
            <ul className="divide-y divide-line">{schedule.map((r) => {
              const d = r.kind === "return" ? r.return_date : r.loading_date;
              const late = r.kind === "return" && d < today;
              return (
                <li key={r.id}><Link href={`/app/reservations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
                  <span className="min-w-0"><span className="font-mono text-xs">{r.number}</span> <StatusBadge status={r.status} lang={lang} /><span className="block truncate text-sm">{r.project}</span></span>
                  <span className={`text-right text-xs ${late ? "font-medium text-red-600" : "text-ink-500"}`}>{r.kind === "return" ? (en ? "Return" : "Kembali") : (en ? "Load" : "Muat")} {fmtDate(d, lang)}{late && <span className="block">{en ? "overdue" : "terlambat"}</span>}<span className="block tabular-nums text-ink-400">{r.units} unit</span></span>
                </Link></li>
              );
            })}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Low availability (next 14 days)" : "Ketersediaan rendah (14 hari)"} subtitle={en ? "Peak confirmed holds vs usable stock" : "Puncak penahanan vs stok usable"} />
          {low.length === 0 ? <div className="p-4"><EmptyState title={en ? "All products comfortably available" : "Semua produk tersedia cukup"} /></div> : (
            <ul className="divide-y divide-line">{low.map((p) => (
              <li key={p.id}><Link href={`/app/inventory/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
                <span className="min-w-0"><span className="block truncate text-sm">{p.name}</span><span className="font-mono text-xs text-ink-400">{p.sku}</span></span>
                <span className="text-right text-sm tabular-nums"><span className={p.available === 0 ? "font-semibold text-red-600" : "font-semibold text-amber-600"}>{p.available}</span><span className="text-ink-400"> / {p.usable}</span><span className="block text-xs text-ink-400">{en ? "bookable" : "tersedia"}</span></span>
              </Link></li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Most reserved products" : "Produk paling sering dipesan"} subtitle={en ? "Approved units, loading −90 → +60 days" : "Unit disetujui, muat −90 → +60 hari"} />
          {top.length === 0 ? <div className="p-4"><EmptyState title={t("no_data")} /></div> : (
            <ul className="space-y-2.5 p-4">{top.map((p) => (
              <li key={p.id} className="text-sm">
                <div className="flex justify-between gap-2"><Link href={`/app/inventory/${p.id}`} className="truncate hover:underline">{p.name}</Link><span className="tabular-nums text-ink-700">{p.units} <span className="text-xs text-ink-400">· {p.bookings}×</span></span></div>
                <div className="mt-1 h-1.5 rounded-full bg-canvas"><div className="h-1.5 rounded-full" style={{ width: `${(100 * p.units) / maxTop}%`, background: "#2a78d6" }} /></div>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Recent reservations" : "Reservasi terbaru"} action={<Link href="/app/reservations" className="text-xs text-ink-500 hover:text-ink">{t("view_all")} <ArrowRight className="inline h-3 w-3" /></Link>} />
          <ul className="divide-y divide-line">{recent.map((r) => (
            <li key={r.id}><Link href={`/app/reservations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
              <span className="min-w-0"><span className="font-mono text-xs">{r.number}</span><span className="block truncate text-sm">{r.project}</span></span>
              <span className="text-right"><StatusBadge status={r.status} lang={lang} /><span className="block text-xs text-ink-400">{fmtDate(r.loading_date, lang)}</span></span>
            </Link></li>
          ))}</ul>
        </Card>
        <Card>
          <CardHeader title={en ? "Recent stock movements" : "Pergerakan stok terbaru"} action={<Link href="/app/inventory/movements" className="text-xs text-ink-500 hover:text-ink">{t("view_all")} <ArrowRight className="inline h-3 w-3" /></Link>} />
          <ul className="divide-y divide-line">{movements.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="min-w-0"><Link href={`/app/inventory/${m.product_id}`} className="block truncate hover:underline">{m.name}</Link><span className="text-xs text-ink-400">{m.movement_type} · {fmtDateTime(m.created_at, lang)}</span></span>
              <span className="tabular-nums">{m.quantity}</span>
            </li>
          ))}</ul>
        </Card>
      </div>
      {(k.pending_adjustments > 0 || k.open_discrepancies > 0) && (
        <p className="mt-6 text-sm text-ink-500">
          {k.pending_adjustments > 0 && <Link href="/app/warehouse/adjustments" className="link mr-4">{k.pending_adjustments} {en ? "stock adjustments awaiting approval" : "penyesuaian stok menunggu persetujuan"}</Link>}
          {k.open_discrepancies > 0 && <Link href="/app/warehouse/discrepancies" className="link">{k.open_discrepancies} {en ? "open discrepancies" : "selisih stok terbuka"}</Link>}
        </p>
      )}
    </>
  );
}

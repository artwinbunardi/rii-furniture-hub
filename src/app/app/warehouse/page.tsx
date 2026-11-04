import Link from "next/link";
import { PackageCheck, Undo2, ClipboardCheck, Hammer, SlidersHorizontal, CalendarClock, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q1 } from "@/lib/db";
import { PageHeader, Card, CardHeader, Stat } from "@/components/ui/misc";
import { todayJakarta, addDays } from "@/lib/utils";
import { ReservationQueue } from "@/components/warehouse-queue";

export const metadata = { title: "Warehouse" };

export default async function WarehousePage() {
  const user = await requireUser("warehouse.pick");
  const { t, lang } = await getT();
  const today = todayJakarta();
  const c = await q1(user.ctx, `SELECT
      count(*) FILTER (WHERE status IN ('approved','preparing') AND loading_date <= $2)::int AS to_prepare,
      count(*) FILTER (WHERE status = 'ready_for_dispatch')::int AS to_dispatch,
      count(*) FILTER (WHERE status IN ('checked_out','partially_returned') AND return_date <= $2)::int AS returns_due,
      count(*) FILTER (WHERE status IN ('checked_out','partially_returned') AND return_date < $1)::int AS overdue
    FROM reservations`, [today, addDays(today, 3)]);
  const insp = await q1(user.ctx, `SELECT coalesce(sum(pending_inspection),0)::int AS n FROM inventory_balances`);
  const dmg = await q1(user.ctx, `SELECT count(*)::int AS n FROM damage_reports WHERE status <> 'resolved'`);
  const adj = await q1(user.ctx, `SELECT count(*)::int AS n FROM stock_adjustments WHERE status = 'pending'`);
  const en = lang === "en";
  return (
    <>
      <PageHeader title={t("nav_warehouse")} subtitle={en ? "Today's work queue for the warehouse team." : "Antrian kerja hari ini untuk tim gudang."} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <Link href="/app/warehouse/checkout"><Stat label={en ? "To prepare (≤3 days)" : "Disiapkan (≤3 hari)"} value={c?.to_prepare ?? 0} icon={<CalendarClock className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/checkout"><Stat label={en ? "Ready to dispatch" : "Siap dikirim"} value={c?.to_dispatch ?? 0} icon={<PackageCheck className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/returns"><Stat label={en ? "Returns due (≤3 days)" : "Jatuh tempo kembali"} value={c?.returns_due ?? 0} icon={<Undo2 className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/returns"><Stat label={en ? "Overdue returns" : "Terlambat kembali"} value={c?.overdue ?? 0} tone={c?.overdue ? "bad" : "default"} icon={<AlertTriangle className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/returns"><Stat label={t("pending_inspection")} value={insp?.n ?? 0} icon={<ClipboardCheck className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/damaged"><Stat label={en ? "Open damage reports" : "Laporan rusak terbuka"} value={dmg?.n ?? 0} tone={dmg?.n ? "warn" : "default"} icon={<Hammer className="h-4 w-4" />} /></Link>
        <Link href="/app/warehouse/adjustments"><Stat label={en ? "Pending adjustments" : "Penyesuaian menunggu"} value={adj?.n ?? 0} icon={<SlidersHorizontal className="h-4 w-4" />} /></Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title={en ? "Upcoming loadings" : "Loading mendatang"} subtitle={en ? "Approved reservations to prepare, by loading date" : "Reservasi disetujui untuk disiapkan, per tanggal loading"} />
          <ReservationQueue ctx={user.ctx} where={`r.status IN ('approved','preparing','ready_for_dispatch')`} params={[]} lang={lang} empty={t("no_data")} /></Card>
        <Card><CardHeader title={en ? "Expected returns" : "Pengembalian yang diharapkan"} subtitle={en ? "Items currently out, by return date" : "Barang di luar, per tanggal kembali"} />
          <ReservationQueue ctx={user.ctx} where={`r.status IN ('checked_out','partially_returned')`} params={[]} lang={lang} empty={t("no_data")} dateCol="return_date" /></Card>
      </div>
    </>
  );
}

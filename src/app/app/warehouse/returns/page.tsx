import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/misc";
import { ReservationQueue } from "@/components/warehouse-queue";

export const metadata = { title: "Returns" };
export default async function ReturnsPage() {
  const user = await requireUser(["warehouse.checkin", "warehouse.inspect"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  const pending = await q(user.ctx, `SELECT r.id, r.number, p.sku, p.name, ri.qty_returned - ri.qty_inspected_good - ri.qty_inspected_damaged - ri.qty_inspected_lost AS pending
    FROM reservation_items ri JOIN reservations r ON r.id = ri.reservation_id JOIN products p ON p.id = ri.product_id
    WHERE ri.qty_returned > ri.qty_inspected_good + ri.qty_inspected_damaged + ri.qty_inspected_lost ORDER BY r.number`);
  return (
    <>
      <PageHeader title={t("nav_returns")} subtitle={en ? "Register returned items, then inspect them before they become available again." : "Catat barang kembali, lalu inspeksi sebelum tersedia kembali."} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title={en ? "Out on projects" : "Sedang di proyek"} subtitle={en ? "By expected return date — red = overdue" : "Per tanggal kembali — merah = terlambat"} />
          <ReservationQueue ctx={user.ctx} where={`r.status IN ('checked_out','partially_returned')`} params={[]} lang={lang} empty={t("no_data")} dateCol="return_date" /></Card>
        <Card><CardHeader title={t("pending_inspection")} subtitle={en ? "Returned but not yet inspected (not bookable)" : "Sudah kembali, belum diinspeksi (belum dapat dipesan)"} />
          {pending.length === 0 ? <p className="p-5 text-sm text-ink-400">{t("no_data")}</p> : (
            <table className="tbl"><tbody>{pending.map((p, i) => (
              <tr key={i}><td><Link className="link font-mono" href={`/app/reservations/${p.id}`}>{p.number}</Link></td><td><span className="font-mono text-xs text-ink-400">{p.sku}</span> {p.name}</td><td className="text-right tabular-nums">{p.pending}</td></tr>
            ))}</tbody></table>
          )}
        </Card>
      </div>
    </>
  );
}

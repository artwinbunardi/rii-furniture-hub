import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { hasPerm } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/utils";
import { DamageOps } from "./ops";
import { Hammer } from "lucide-react";

export const metadata = { title: "Damaged items" };
export default async function DamagedPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const user = await requireUser(["warehouse.damage_report", "inventory.repair"]);
  const { t, lang } = await getT();
  const sp = await searchParams;
  const en = lang === "en";
  const rows = await q(user.ctx, `SELECT d.*, p.sku, p.name, p.id AS pid, b.damaged, b.under_repair, u.name AS reporter, r.number
    FROM damage_reports d JOIN products p ON p.id = d.product_id JOIN inventory_balances b ON b.product_id = p.id
    LEFT JOIN users u ON u.id = d.reported_by LEFT JOIN reservations r ON r.id = d.reservation_id
    ${sp.all ? "" : "WHERE d.status <> 'resolved'"} ORDER BY d.created_at DESC LIMIT 200`);
  const canRepair = hasPerm(user.perms, "inventory.repair");
  const tone = (s: string) => (s === "severe" ? "red" : s === "moderate" ? "amber" : "gray") as "red";
  return (
    <>
      <PageHeader title={t("nav_damaged")} subtitle={en ? "Damaged units are excluded from bookable stock until repaired or released by a manager." : "Unit rusak dikecualikan dari stok yang dapat dipesan sampai diperbaiki atau dilepas oleh manajer."}
        actions={<Link href={sp.all ? "/app/warehouse/damaged" : "/app/warehouse/damaged?all=1"} className="text-sm text-ink-500 hover:text-ink">{sp.all ? (en ? "Open only" : "Hanya terbuka") : (en ? "Show resolved" : "Tampilkan selesai")}</Link>} />
      {rows.length === 0 ? <EmptyState icon={<Hammer className="h-5 w-5" />} title={en ? "No open damage reports" : "Tidak ada laporan kerusakan terbuka"} body={en ? "Report damage from a product page or during return inspection." : "Laporkan kerusakan dari halaman produk atau saat inspeksi pengembalian."} /> : (
        <div className="space-y-3">
          {rows.map((d) => (
            <Card key={d.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><Link href={`/app/inventory/${d.pid}`} className="link font-medium">{d.name}</Link><span className="font-mono text-xs text-ink-400">{d.sku}</span><Badge tone={tone(d.severity)}>{d.severity}</Badge><Badge tone={d.status === "resolved" ? "green" : d.status === "in_repair" ? "blue" : "amber"}>{d.status}</Badge></div>
                  <p className="mt-1 text-sm text-ink-700">{d.description}</p>
                  <p className="mt-1 text-xs text-ink-400">{fmtDateTime(d.created_at, lang)} · {d.reporter}{d.number ? <> · <Link className="link font-mono" href={`/app/reservations/${d.reservation_id}`}>{d.number}</Link></> : null}</p>
                </div>
                <div className="text-right text-sm"><p><span className="text-2xl font-semibold tabular-nums">{d.remaining_qty}</span><span className="text-ink-400"> / {d.quantity} {en ? "unresolved" : "belum selesai"}</span></p><p className="text-xs text-ink-400">{t("damaged")}: {d.damaged} · {t("under_repair")}: {d.under_repair}</p></div>
              </div>
              {canRepair && d.status !== "resolved" && <DamageOps id={d.id} remaining={d.remaining_qty} status={d.status} lang={lang} />}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

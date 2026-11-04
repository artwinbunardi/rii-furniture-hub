import Link from "next/link";
import { Download } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader, EmptyState, Stat } from "@/components/ui/misc";
import { Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { UtilizationChart } from "@/components/charts";
import { hasPerm } from "@/lib/rbac";
import { addDays, isIsoDate, todayJakarta, daysBetween } from "@/lib/utils";
import { fleetUtilization, topReserved, statusBreakdown, damageSummary, projectUsage } from "@/lib/services/reports";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const user = await requireUser("reports.view");
  const { t, lang } = await getT();
  const en = lang === "en";
  const sp = await searchParams;
  const today = todayJakarta();
  let from = isIsoDate(sp.from) ? sp.from : addDays(today, -30);
  let to = isIsoDate(sp.to) ? sp.to : addDays(today, 30);
  if (to < from) [from, to] = [to, from];
  if (daysBetween(from, to) > 366) to = addDays(from, 366);
  const [util, top, statuses, damage, projects, perProduct] = await Promise.all([
    fleetUtilization(user.ctx, from, to),
    topReserved(user.ctx, from, to, 15),
    statusBreakdown(user.ctx, from, to),
    damageSummary(user.ctx, from, to),
    projectUsage(user.ctx, from, to),
    q(user.ctx, `SELECT p.id, p.sku, p.name, a.usable, a.reserved, a.available, CASE WHEN a.usable > 0 THEN round(100.0 * a.reserved / a.usable) ELSE 0 END::int AS pct
      FROM products p, LATERAL product_availability(ARRAY[p.id], $1::date, $2::date) a WHERE p.is_active ORDER BY pct DESC, p.sku LIMIT 15`, [from, to]),
  ]);
  const avgUtil = util.days.length ? Math.round(util.days.reduce((a, d) => a + d.pct, 0) / util.days.length) : 0;
  const peak = util.days.reduce((m, d) => (d.pct > m.pct ? d : m), { day: from, pct: 0, hard: 0, soft: 0 });
  const canExport = hasPerm(user.perms, "reports.export");
  const range = `from=${from}&to=${to}`;
  return (
    <>
      <PageHeader title={t("nav_reports")} subtitle={en ? "All figures are calculated live from reservations, holds and the stock ledger for the selected period." : "Semua angka dihitung langsung dari reservasi, penahanan stok, dan buku besar untuk periode terpilih."}
        actions={canExport ? <div className="flex flex-wrap gap-2">
          <LinkButton variant="outline" size="sm" href={`/api/app/export/utilization?${range}`}><Download className="h-4 w-4" />{en ? "Utilization" : "Utilisasi"}</LinkButton>
          <LinkButton variant="outline" size="sm" href={`/api/app/export/reservations?${range}`}><Download className="h-4 w-4" />{en ? "Reservations" : "Reservasi"}</LinkButton>
          <LinkButton variant="outline" size="sm" href={`/api/app/export/movements?${range}`}><Download className="h-4 w-4" />{en ? "Movements" : "Pergerakan"}</LinkButton>
          <LinkButton variant="outline" size="sm" href="/api/app/export/inventory"><Download className="h-4 w-4" />{en ? "Inventory" : "Inventaris"}</LinkButton>
        </div> : null} />
      <form className="mb-6 flex flex-wrap items-end gap-2">
        <label className="text-xs text-ink-500">{en ? "From" : "Dari"}<Input type="date" name="from" defaultValue={from} className="mt-1 w-44" /></label>
        <label className="text-xs text-ink-500">{en ? "To" : "Sampai"}<Input type="date" name="to" defaultValue={to} className="mt-1 w-44" /></label>
        <Button type="submit" variant="outline">{t("filter")}</Button>
        {[[-30, 30, en ? "±30 days" : "±30 hari"], [-90, 0, en ? "Last 90 days" : "90 hari terakhir"], [0, 60, en ? "Next 60 days" : "60 hari ke depan"]].map(([a, b, l]) => (
          <Link key={String(l)} href={`?from=${addDays(today, a as number)}&to=${addDays(today, b as number)}`} className="rounded-lg px-2 py-2 text-xs text-ink-500 hover:bg-canvas hover:text-ink">{l}</Link>
        ))}
      </form>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={en ? "Average utilization" : "Rata-rata utilisasi"} value={`${avgUtil}%`} hint={`${util.usable} ${en ? "usable units" : "unit usable"}`} />
        <Stat label={en ? "Peak utilization" : "Puncak utilisasi"} value={`${Math.round(peak.pct)}%`} hint={peak.hard ? `${peak.hard} unit · ${peak.day}` : "—"} />
        <Stat label={en ? "Reservations in period" : "Reservasi dalam periode"} value={statuses.reduce((a, s) => a + s.n, 0)} />
        <Stat label={en ? "Damaged units reported" : "Unit rusak dilaporkan"} value={damage.reduce((a, d) => a + d.units, 0)} tone={damage.length ? "warn" : "default"} />
      </div>
      <Card className="mb-6"><CardHeader title={en ? "Daily utilization" : "Utilisasi harian"} /><div className="p-4 pt-2"><UtilizationChart data={util.days} usable={util.usable} lang={lang} /></div></Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={en ? "Peak utilization per product" : "Puncak utilisasi per produk"} subtitle={en ? "Highest confirmed holds on any day in the period" : "Penahanan tertinggi pada hari mana pun dalam periode"} />
          <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{en ? "Product" : "Produk"}</th><th className="text-right">Usable</th><th className="text-right">{en ? "Peak held" : "Puncak"}</th><th className="text-right">%</th></tr></thead>
            <tbody>{perProduct.map((p) => (
              <tr key={p.id}><td><Link href={`/app/inventory/${p.id}`} className="link text-sm">{p.name}</Link><div className="font-mono text-xs text-ink-400">{p.sku}</div></td>
                <td className="text-right tabular-nums">{p.usable}</td><td className="text-right tabular-nums">{p.reserved}</td>
                <td className="w-32"><div className="flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-canvas"><div className="h-1.5 rounded-full" style={{ width: `${Math.min(100, p.pct)}%`, background: "#2a78d6" }} /></div><span className="w-9 text-right text-xs tabular-nums">{p.pct}%</span></div></td></tr>
            ))}</tbody></table></div>
        </Card>
        <Card>
          <CardHeader title={en ? "Most reserved products" : "Produk paling sering dipesan"} subtitle={en ? "Approved units overlapping the period" : "Unit disetujui yang beririsan dengan periode"} />
          {top.length === 0 ? <div className="p-4"><EmptyState title={t("no_data")} /></div> : (
            <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{en ? "Product" : "Produk"}</th><th className="text-right">{en ? "Units" : "Unit"}</th><th className="text-right">{en ? "Bookings" : "Pemesanan"}</th></tr></thead>
              <tbody>{top.map((p) => <tr key={p.id}><td><Link href={`/app/inventory/${p.id}`} className="link text-sm">{p.name}</Link><div className="font-mono text-xs text-ink-400">{p.sku}</div></td><td className="text-right tabular-nums">{p.units}</td><td className="text-right tabular-nums">{p.bookings}</td></tr>)}</tbody></table></div>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Reservations by status" : "Reservasi per status"} />
          {statuses.length === 0 ? <div className="p-4"><EmptyState title={t("no_data")} /></div> : (
            <ul className="divide-y divide-line">{statuses.map((s) => <li key={s.status} className="flex items-center justify-between px-4 py-2.5"><Link href={`/app/reservations?status=${s.status}`}><StatusBadge status={s.status} lang={lang} /></Link><span className="tabular-nums">{s.n}</span></li>)}</ul>
          )}
        </Card>
        <Card>
          <CardHeader title={en ? "Usage by project" : "Pemakaian per proyek"} />
          {projects.length === 0 ? <div className="p-4"><EmptyState title={t("no_data")} /></div> : (
            <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{en ? "Project" : "Proyek"}</th><th className="text-right">{en ? "Res." : "Res."}</th><th className="text-right">{en ? "Units" : "Unit"}</th><th className="text-right">{en ? "Missing" : "Hilang"}</th></tr></thead>
              <tbody>{projects.map((p) => <tr key={p.id}><td><Link href={`/app/projects/${p.id}`} className="link text-sm">{p.name}</Link><div className="text-xs text-ink-400">{p.code} · {p.client_name}</div></td><td className="text-right tabular-nums">{p.reservations}</td><td className="text-right tabular-nums">{p.units_approved}</td><td className="text-right tabular-nums text-red-600">{p.units_missing || ""}</td></tr>)}</tbody></table></div>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={en ? "Damage reports" : "Laporan kerusakan"} />
          {damage.length === 0 ? <div className="p-4"><EmptyState title={en ? "No damage reported in this period" : "Tidak ada kerusakan pada periode ini"} /></div> : (
            <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{en ? "Product" : "Produk"}</th><th className="text-right">{en ? "Reports" : "Laporan"}</th><th className="text-right">{en ? "Units" : "Unit"}</th><th className="text-right">Severe</th></tr></thead>
              <tbody>{damage.map((d) => <tr key={d.id}><td><Link href={`/app/inventory/${d.id}`} className="link text-sm">{d.name}</Link><div className="font-mono text-xs text-ink-400">{d.sku}</div></td><td className="text-right tabular-nums">{d.reports}</td><td className="text-right tabular-nums">{d.units}</td><td className="text-right tabular-nums">{d.severe || ""}</td></tr>)}</tbody></table></div>
          )}
        </Card>
      </div>
    </>
  );
}

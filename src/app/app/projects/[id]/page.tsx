import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader, Card, CardHeader, Stat, EmptyState } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { hasPerm } from "@/lib/rbac";
import { fmtDate } from "@/lib/utils";
import { ProjectForm } from "../project-form";

export const metadata = { title: "Project" };
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["project.manage", "project.create"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const p = await q1(user.ctx, `SELECT * FROM projects WHERE id = $1`, [id]);
  if (!p) notFound();
  const [reservations, items, users] = await Promise.all([
    q(user.ctx, `SELECT r.id, r.number, r.status, r.loading_date, r.return_date, u.name AS requester,
        (SELECT coalesce(sum(coalesce(i.qty_approved, i.qty_requested)),0)::int FROM reservation_items i WHERE i.reservation_id = r.id) AS units
      FROM reservations r LEFT JOIN users u ON u.id = r.requester_id WHERE r.project_id = $1 AND NOT r.is_cart AND r.status <> 'draft' ORDER BY r.loading_date DESC`, [id]),
    q(user.ctx, `SELECT pr.id, pr.sku, pr.name, sum(coalesce(i.qty_approved,0))::int approved, sum(i.qty_checked_out)::int out, sum(i.qty_returned)::int returned, sum(i.qty_missing)::int missing, sum(i.qty_inspected_damaged)::int damaged
      FROM reservation_items i JOIN reservations r ON r.id = i.reservation_id JOIN products pr ON pr.id = i.product_id
      WHERE r.project_id = $1 AND r.status NOT IN ('draft','rejected','cancelled','pending_approval') GROUP BY pr.id ORDER BY approved DESC`, [id]),
    q(user.ctx, `SELECT id, name FROM users WHERE status = 'active' ORDER BY name`),
  ]);
  const sum = (k: string) => items.reduce((a, r) => a + Number(r[k] ?? 0), 0);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/projects" className="hover:text-ink">{t("nav_projects")}</Link>} title={<span>{p.name} <span className="ml-2 font-mono text-base text-ink-400">{p.code}</span></span>}
        subtitle={[p.client_name, p.event_name, p.location].filter(Boolean).join(" · ")} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={en ? "Reservations" : "Reservasi"} value={reservations.length} />
        <Stat label={en ? "Units approved" : "Unit disetujui"} value={sum("approved")} />
        <Stat label={en ? "Units checked out" : "Unit dikeluarkan"} value={sum("out")} />
        <Stat label={en ? "Damaged on return" : "Rusak saat kembali"} value={sum("damaged")} tone={sum("damaged") ? "warn" : "default"} />
        <Stat label={en ? "Missing" : "Hilang"} value={sum("missing")} tone={sum("missing") ? "bad" : "default"} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader title={en ? "Reservations" : "Reservasi"} />
            {reservations.length === 0 ? <div className="p-4"><EmptyState title={en ? "No reservations yet" : "Belum ada reservasi"} /></div> : (
              <ul className="divide-y divide-line">{reservations.map((r) => (
                <li key={r.id}><Link href={`/app/reservations/${r.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-canvas">
                  <span><span className="font-mono text-xs">{r.number}</span> <StatusBadge status={r.status} lang={lang} /><span className="block text-xs text-ink-400">{r.requester}</span></span>
                  <span className="text-right text-xs text-ink-500">{fmtDate(r.loading_date, lang)} – {fmtDate(r.return_date, lang)}<span className="block tabular-nums">{r.units} unit</span></span>
                </Link></li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <CardHeader title={en ? "Furniture used" : "Furnitur yang dipakai"} />
            {items.length === 0 ? <div className="p-4"><EmptyState title={t("no_data")} /></div> : (
              <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>{en ? "Product" : "Produk"}</th><th className="text-right">{en ? "Approved" : "Disetujui"}</th><th className="text-right">{en ? "Out" : "Keluar"}</th><th className="text-right">{en ? "Returned" : "Kembali"}</th><th className="text-right">{en ? "Damaged" : "Rusak"}</th><th className="text-right">{en ? "Missing" : "Hilang"}</th></tr></thead>
                <tbody>{items.map((i) => (
                  <tr key={i.id}><td><Link href={`/app/inventory/${i.id}`} className="link text-sm">{i.name}</Link><div className="font-mono text-xs text-ink-400">{i.sku}</div></td>
                    <td className="text-right tabular-nums">{i.approved}</td><td className="text-right tabular-nums">{i.out}</td><td className="text-right tabular-nums">{i.returned}</td>
                    <td className="text-right tabular-nums">{i.damaged || ""}</td><td className="text-right tabular-nums text-red-600">{i.missing || ""}</td></tr>
                ))}</tbody></table></div>
            )}
          </Card>
        </div>
        <Card>
          <CardHeader title={en ? "Project details" : "Detail proyek"} />
          <div className="p-5"><ProjectForm lang={lang} project={p} users={users} canManage={hasPerm(user.perms, "project.manage")} /></div>
        </Card>
      </div>
    </>
  );
}

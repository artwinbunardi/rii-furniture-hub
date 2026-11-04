import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, EmptyState, Table } from "@/components/ui/misc";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { STATUSES } from "@/lib/services/reservations";
import { fmtDate, cn } from "@/lib/utils";
import { CalendarRange, Download } from "lucide-react";
import { hasPerm } from "@/lib/rbac";

export const metadata = { title: "Reservations" };

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; project?: string }> }) {
  const user = await requireUser("reservation.view_all");
  const sp = await searchParams;
  const { t, lang } = await getT();
  const params: unknown[] = [];
  const where = ["NOT r.is_cart", "r.status <> 'draft'"];
  if (sp.status && (STATUSES as readonly string[]).includes(sp.status)) { params.push(sp.status); where.push(`r.status = $${params.length}`); }
  if (sp.status === "active") where.push(`r.status IN ('approved','preparing','ready_for_dispatch','checked_out','partially_returned')`);
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(r.number ILIKE $${params.length} OR pr.name ILIKE $${params.length} OR pr.code ILIKE $${params.length} OR u.name ILIKE $${params.length})`); }
  if (sp.project && /^[0-9a-f-]{36}$/i.test(sp.project)) { params.push(sp.project); where.push(`r.project_id = $${params.length}`); }
  const rows = await q(user.ctx, `
    SELECT r.id, r.number, r.status, r.loading_date, r.return_date, r.submitted_at, pr.name AS project_name, pr.code AS project_code, u.name AS requester,
           (SELECT coalesce(sum(qty_requested),0) FROM reservation_items WHERE reservation_id = r.id)::int AS units,
           (r.status IN ('checked_out','partially_returned') AND r.return_date < (now() AT TIME ZONE 'Asia/Jakarta')::date) AS overdue
      FROM reservations r LEFT JOIN projects pr ON pr.id = r.project_id JOIN users u ON u.id = r.requester_id
     WHERE ${where.join(" AND ")}
     ORDER BY CASE r.status WHEN 'pending_approval' THEN 0 ELSE 1 END, r.loading_date DESC NULLS LAST LIMIT 300`, params);
  const counts = await q(user.ctx, `SELECT status, count(*)::int AS n FROM reservations WHERE NOT is_cart AND status <> 'draft' GROUP BY status`);
  const cnt: Record<string, number> = Object.fromEntries(counts.map((c) => [c.status, c.n]));
  const tabs: [string, string][] = [["", t("all")], ["pending_approval", t("st_pending_approval")], ["active", lang === "en" ? "Active" : "Aktif"], ["approved", t("st_approved")], ["ready_for_dispatch", t("st_ready_for_dispatch")], ["checked_out", t("st_checked_out")], ["completed", t("st_completed")], ["rejected", t("st_rejected")], ["cancelled", t("st_cancelled")]];
  return (
    <>
      <PageHeader title={t("nav_reservations")} subtitle={lang === "en" ? "Review approvals and follow every reservation through dispatch and return." : "Tinjau persetujuan dan pantau setiap reservasi hingga pengiriman dan pengembalian."}
        actions={hasPerm(user.perms, "reports.export") && <LinkButton href={`/api/app/export/reservations${sp.status ? `?status=${sp.status}` : ""}`} variant="outline"><Download className="h-4 w-4" />{t("export_csv")}</LinkButton>} />
      <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/app/reservations${k ? `?status=${k}` : ""}`} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-[13.5px]", (sp.status ?? "") === k ? "border-ink font-medium text-ink" : "border-transparent text-ink-500 hover:text-ink")}>
            {l}{k && k !== "active" && cnt[k] ? <span className="ml-1.5 rounded-full bg-canvas px-1.5 text-[11px]">{cnt[k]}</span> : null}
          </Link>
        ))}
      </div>
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <Input name="q" defaultValue={sp.q} placeholder={lang === "en" ? "Search number, project, requester…" : "Cari nomor, proyek, pemohon…"} className="max-w-sm" />
          <Button type="submit" variant="outline">{t("search")}</Button>
        </form>
        {rows.length === 0 ? <div className="p-6"><EmptyState icon={<CalendarRange className="h-5 w-5" />} title={t("no_data")} /></div> : (
          <Table>
            <thead><tr><th>{t("reservation_number")}</th><th>{t("project")}</th><th>{t("requester")}</th><th>{t("loading_date")}</th><th>{t("return_date")}</th><th className="text-right">{t("units")}</th><th>{t("status")}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><Link className="link font-mono" href={`/app/reservations/${r.id}`}>{r.number}</Link></td>
                  <td><div className="max-w-[260px] truncate">{r.project_name}</div><div className="text-xs text-ink-400">{r.project_code}</div></td>
                  <td className="text-ink-500">{r.requester}</td>
                  <td>{fmtDate(r.loading_date, lang)}</td>
                  <td className={r.overdue ? "font-medium text-red-600" : ""}>{fmtDate(r.return_date, lang)}{r.overdue && <span className="ml-1 text-xs">({lang === "en" ? "overdue" : "terlambat"})</span>}</td>
                  <td className="text-right tabular-nums">{r.units}</td>
                  <td><StatusBadge status={r.status} lang={lang} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { hasPerm } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/utils";
import { ResolveForm } from "./resolve";
import { AlertTriangle } from "lucide-react";

export const metadata = { title: "Discrepancies" };
export default async function DiscrepanciesPage() {
  const user = await requireUser("inventory.view");
  const { t, lang } = await getT();
  const en = lang === "en";
  const rows = await q(user.ctx, `SELECT d.*, p.sku, p.name, p.id AS pid, r.number, u.name AS reporter, ru.name AS resolver
    FROM stock_discrepancies d JOIN products p ON p.id = d.product_id LEFT JOIN reservations r ON r.id = d.reservation_id
    LEFT JOIN users u ON u.id = d.reported_by LEFT JOIN users ru ON ru.id = d.resolved_by ORDER BY (d.status = 'open') DESC, d.created_at DESC LIMIT 200`);
  const canResolve = hasPerm(user.perms, "inventory.adjust_approve");
  return (
    <>
      <PageHeader title={t("nav_discrepancies")} subtitle={en ? "Picking shortages, missing returns and count mismatches for manager review." : "Kekurangan picking, barang hilang saat kembali, dan selisih hitung untuk ditinjau manajer."} />
      {rows.length === 0 ? <EmptyState icon={<AlertTriangle className="h-5 w-5" />} title={t("no_data")} /> : (
        <Card><div className="overflow-x-auto"><table className="tbl">
          <thead><tr><th>{t("date")}</th><th>{t("nav_products")}</th><th>{en ? "Kind" : "Jenis"}</th><th className="text-right">{en ? "Expected" : "Diharapkan"}</th><th className="text-right">{en ? "Actual" : "Aktual"}</th><th>{t("notes")}</th><th>{t("status")}</th><th /></tr></thead>
          <tbody>{rows.map((d) => (
            <tr key={d.id}>
              <td className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(d.created_at, lang)}<div>{d.reporter}</div></td>
              <td><Link className="link" href={`/app/inventory/${d.pid}`}>{d.name}</Link><div className="font-mono text-xs text-ink-400">{d.sku}{d.number && <> · <Link href={`/app/reservations/${d.reservation_id}`} className="link">{d.number}</Link></>}</div></td>
              <td><Badge>{d.kind}</Badge></td>
              <td className="text-right tabular-nums">{d.expected_qty}</td>
              <td className="text-right tabular-nums font-medium text-red-600">{d.actual_qty}</td>
              <td className="max-w-xs text-sm">{d.notes}{d.resolution && <div className="text-xs text-emerald-700">✓ {d.resolution} ({d.resolver})</div>}</td>
              <td><Badge tone={d.status === "open" ? "amber" : "green"}>{d.status}</Badge></td>
              <td>{canResolve && d.status === "open" && <ResolveForm id={d.id} lang={lang} />}</td>
            </tr>
          ))}</tbody>
        </table></div></Card>
      )}
    </>
  );
}

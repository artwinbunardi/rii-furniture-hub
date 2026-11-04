import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { hasPerm } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/utils";
import { AdjustmentDecision } from "./decision";
import { SlidersHorizontal } from "lucide-react";

export const metadata = { title: "Stock adjustments" };
export default async function AdjustmentsPage() {
  const user = await requireUser(["inventory.adjust_request", "inventory.adjust_approve"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  const rows = await q(user.ctx, `SELECT a.*, p.sku, p.name, p.id AS pid, ru.name AS requester, du.name AS decider
    FROM stock_adjustments a JOIN products p ON p.id = a.product_id JOIN users ru ON ru.id = a.requested_by LEFT JOIN users du ON du.id = a.decided_by
    ORDER BY (a.status = 'pending') DESC, a.created_at DESC LIMIT 200`);
  const canApprove = hasPerm(user.perms, "inventory.adjust_approve");
  return (
    <>
      <PageHeader title={t("nav_adjustments")} subtitle={en ? "Every manual stock change needs a reason and manager approval. Request adjustments from a product page." : "Setiap perubahan stok manual memerlukan alasan dan persetujuan manajer. Ajukan dari halaman produk."} />
      {rows.length === 0 ? <EmptyState icon={<SlidersHorizontal className="h-5 w-5" />} title={t("no_data")} /> : (
        <Card>
          <div className="overflow-x-auto"><table className="tbl">
            <thead><tr><th>{t("date")}</th><th>{t("nav_products")}</th><th>{en ? "Type" : "Jenis"}</th><th className="text-right">{t("qty")}</th><th>{t("reason")}</th><th>{en ? "Requested by" : "Diajukan oleh"}</th><th>{t("status")}</th><th /></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(a.created_at, lang)}</td>
                <td><Link className="link" href={`/app/inventory/${a.pid}`}>{a.name}</Link><div className="font-mono text-xs text-ink-400">{a.sku}</div></td>
                <td><Badge>{a.kind}</Badge></td>
                <td className="text-right tabular-nums">{a.quantity}</td>
                <td className="max-w-xs text-sm">{a.reason}{a.decision_note && <div className="text-xs text-ink-400">→ {a.decision_note}</div>}</td>
                <td className="text-sm">{a.requester}</td>
                <td><Badge tone={a.status === "approved" ? "green" : a.status === "rejected" ? "red" : "amber"}>{a.status}</Badge>{a.decider && <div className="text-xs text-ink-400">{a.decider}</div>}</td>
                <td>{canApprove && a.status === "pending" && <AdjustmentDecision id={a.id} lang={lang} />}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </Card>
      )}
    </>
  );
}

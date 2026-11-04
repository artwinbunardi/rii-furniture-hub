import Link from "next/link";
import { Download, History } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q, q1 } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState } from "@/components/ui/misc";
import { Input, Select } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { hasPerm } from "@/lib/rbac";
import { fmtDateTime } from "@/lib/utils";
import { MOVEMENT_TYPES, MOVEMENT_BASE, movementFilters, isUuid, type MovementSP } from "@/lib/services/movement-filters";

export const metadata = { title: "Movement history" };
const PAGE = 100;

export default async function MovementsPage({ searchParams }: { searchParams: Promise<MovementSP> }) {
  const user = await requireUser("inventory.view");
  const sp = await searchParams;
  const { t, lang } = await getT();
  const en = lang === "en";
  const page = Math.max(1, Number(sp.page) || 1);
  const { where, params } = movementFilters(sp);
  const base = MOVEMENT_BASE(where);
  const [rows, count, product] = await Promise.all([
    q(user.ctx, `SELECT m.*, p.sku, p.name AS product_name, u.name AS user_name, a.name AS approver, r.number ${base} ORDER BY m.created_at DESC, m.id DESC LIMIT ${PAGE} OFFSET ${(page - 1) * PAGE}`, params),
    q1<{ n: number }>(user.ctx, `SELECT count(*)::int AS n ${base}`, params),
    isUuid(sp.product) ? q1(user.ctx, `SELECT id, sku, name FROM products WHERE id = $1`, [sp.product]) : Promise.resolve(null),
  ]);
  const total = count?.n ?? 0;
  const qs = (over: Partial<MovementSP>) => `?${new URLSearchParams(Object.entries({ ...sp, ...over }).filter(([, v]) => v) as [string, string][])}`;
  return (
    <>
      <PageHeader title={t("nav_movements")}
        subtitle={en ? "Append-only ledger. Rows cannot be edited or deleted, even by admins (enforced in the database)." : "Buku besar hanya-tambah. Baris tidak dapat diubah atau dihapus, bahkan oleh admin (ditegakkan di database)."}
        actions={hasPerm(user.perms, "reports.export") ? <LinkButton variant="outline" href={`/api/app/export/movements${qs({ page: undefined })}`}><Download className="h-4 w-4" />{t("export_csv")}</LinkButton> : null} />
      {product && <p className="mb-3 text-sm">{en ? "Product" : "Produk"}: <Link href={`/app/inventory/${product.id}`} className="link font-medium">{product.name}</Link> <span className="font-mono text-xs text-ink-400">{product.sku}</span> · <Link href={qs({ product: undefined, page: undefined })} className="text-ink-500 underline">{en ? "clear" : "hapus filter"}</Link></p>}
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          {sp.product && <input type="hidden" name="product" value={sp.product} />}
          <Input name="q" defaultValue={sp.q} placeholder={en ? "SKU, product, RES number, reason" : "SKU, produk, nomor RES, alasan"} className="max-w-xs" />
          <Select name="type" defaultValue={sp.type ?? ""} className="w-44"><option value="">{t("all")}</option>{MOVEMENT_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</Select>
          <Input name="from" type="date" defaultValue={sp.from} className="w-40" aria-label="from" />
          <Input name="to" type="date" defaultValue={sp.to} className="w-40" aria-label="to" />
          <Button type="submit" variant="outline">{t("filter")}</Button>
        </form>
        {rows.length === 0 ? <div className="p-6"><EmptyState icon={<History className="h-5 w-5" />} title={t("no_data")} /></div> : (
          <div className="overflow-x-auto">
            <table className="tbl"><thead><tr><th>{t("date")}</th><th>{en ? "Product" : "Produk"}</th><th>Type</th><th className="text-right">{t("qty")}</th><th>{en ? "From → To" : "Dari → Ke"}</th><th>{en ? "Warehouse before → after" : "Gudang sebelum → sesudah"}</th><th>{en ? "User" : "Pengguna"}</th><th>{t("reason")}</th></tr></thead>
              <tbody>{rows.map((m) => (
                <tr key={m.id}>
                  <td className="whitespace-nowrap text-xs text-ink-500">{fmtDateTime(m.created_at, lang)}</td>
                  <td><Link href={`/app/inventory/${m.product_id}`} className="link text-sm">{m.product_name}</Link><div className="font-mono text-xs text-ink-400">{m.sku}</div></td>
                  <td><Badge tone="gray">{m.movement_type}</Badge></td>
                  <td className="text-right tabular-nums">{m.quantity}</td>
                  <td className="whitespace-nowrap text-xs">{m.from_bucket ?? "—"} → {m.to_bucket ?? "—"}</td>
                  <td className="text-xs tabular-nums">{m.before_state.in_warehouse} → {m.after_state.in_warehouse}</td>
                  <td className="text-xs">{m.user_name}{m.approver && m.approver !== m.user_name ? <div className="text-ink-400">✓ {m.approver}</div> : null}</td>
                  <td className="max-w-[260px] text-xs text-ink-500">{m.number && <Link href={`/app/reservations/${m.reservation_id}`} className="link font-mono">{m.number}</Link>} {m.reason}</td>
                </tr>
              ))}</tbody></table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-line p-3 text-sm text-ink-500">
          <span>{total} {en ? "movements" : "pergerakan"}</span>
          <span className="flex gap-3">
            {page > 1 && <Link href={qs({ page: String(page - 1) })} className="link">← {en ? "Newer" : "Lebih baru"}</Link>}
            {page * PAGE < total && <Link href={qs({ page: String(page + 1) })} className="link">{en ? "Older" : "Lebih lama"} →</Link>}
          </span>
        </div>
      </Card>
    </>
  );
}

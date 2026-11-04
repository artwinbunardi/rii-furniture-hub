import Link from "next/link";
import { Plus, Download, Boxes } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, EmptyState, Stat } from "@/components/ui/misc";
import { LinkButton, Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { hasPerm } from "@/lib/rbac";
import { fmtNum, todayJakarta } from "@/lib/utils";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; filter?: string }> }) {
  const user = await requireUser("inventory.view");
  const sp = await searchParams;
  const { t, lang } = await getT();
  const params: unknown[] = [todayJakarta()];
  const where = ["true"];
  if (sp.q) { params.push(`%${sp.q}%`); where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`); }
  if (sp.category) { params.push(sp.category); where.push(`c.slug = $${params.length}`); }
  const rows = await q(user.ctx, `
    SELECT p.id, p.sku, p.name, p.is_active, p.min_stock, c.name_id, c.name_en, sl.code AS loc, b.*,
           a.reserved AS reserved_today, a.available AS bookable_today, a.usable,
           (SELECT m.storage_key FROM product_images pi JOIN media_assets m ON m.id = pi.media_id WHERE pi.product_id = p.id ORDER BY pi.sort LIMIT 1) AS img
      FROM products p JOIN categories c ON c.id = p.category_id JOIN inventory_balances b ON b.product_id = p.id
      LEFT JOIN storage_locations sl ON sl.id = p.location_id
      LEFT JOIN LATERAL product_availability(ARRAY[p.id], $1::date, $1::date) a ON true
     WHERE ${where.join(" AND ")} ORDER BY p.sku`, params);
  let list = rows;
  if (sp.filter === "low") list = rows.filter((r) => r.in_warehouse <= r.min_stock || (r.usable > 0 && r.bookable_today / r.usable <= 0.2));
  if (sp.filter === "damaged") list = rows.filter((r) => r.damaged + r.under_repair > 0);
  if (sp.filter === "out") list = rows.filter((r) => r.checked_out > 0);
  const cats = await q(user.ctx, `SELECT slug, name_id, name_en FROM categories WHERE parent_id IS NULL ORDER BY sort`);
  const tot = (k: string) => rows.reduce((a, r) => a + Number(r[k]), 0);
  return (
    <>
      <PageHeader title={t("nav_inventory")}
        subtitle={lang === "en" ? "Physical stock buckets and today's bookable quantity for every SKU." : "Saldo stok fisik dan jumlah yang dapat dipesan hari ini untuk setiap SKU."}
        actions={<>
          {hasPerm(user.perms, "reports.export") && <LinkButton variant="outline" href="/api/app/export/inventory"><Download className="h-4 w-4" />{t("export_csv")}</LinkButton>}
          {hasPerm(user.perms, "product.manage") && <LinkButton href="/app/inventory/new"><Plus className="h-4 w-4" />{lang === "en" ? "Add product" : "Tambah produk"}</LinkButton>}
        </>} />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("owned")} value={fmtNum(tot("owned"))} hint={`${rows.length} SKU`} />
        <Stat label={t("in_warehouse")} value={fmtNum(tot("in_warehouse"))} />
        <Stat label={t("checked_out")} value={fmtNum(tot("checked_out"))} />
        <Stat label={t("reserved_today")} value={fmtNum(tot("reserved_today"))} />
        <Stat label={`${t("damaged")} + ${t("under_repair")}`} value={fmtNum(tot("damaged") + tot("under_repair"))} tone={tot("damaged") ? "warn" : "default"} />
        <Stat label={t("bookable")} value={fmtNum(tot("bookable_today"))} tone="good" />
      </div>
      <Card>
        <form className="flex flex-wrap gap-2 border-b border-line p-3">
          <Input name="q" defaultValue={sp.q} placeholder={t("search_placeholder")} className="max-w-xs" />
          <Select name="category" defaultValue={sp.category ?? ""} className="w-48"><option value="">{t("all")} {t("categories").toLowerCase()}</option>{cats.map((c) => <option key={c.slug} value={c.slug}>{lang === "en" ? c.name_en : c.name_id}</option>)}</Select>
          <Select name="filter" defaultValue={sp.filter ?? ""} className="w-48">
            <option value="">{t("all")}</option><option value="low">{t("low_stock")}</option><option value="out">{t("checked_out")}</option><option value="damaged">{t("damaged")}</option>
          </Select>
          <Button type="submit" variant="outline">{t("filter")}</Button>
        </form>
        {list.length === 0 ? <div className="p-6"><EmptyState icon={<Boxes className="h-5 w-5" />} title={t("no_data")} /></div> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr>
                <th>{t("nav_products")}</th><th>{t("storage_location")}</th>
                <th className="text-right">{t("owned")}</th><th className="text-right">{t("in_warehouse")}</th><th className="text-right">{t("checked_out")}</th>
                <th className="text-right">{t("pending_inspection")}</th><th className="text-right">{t("damaged")}</th><th className="text-right">{t("under_repair")}</th><th className="text-right">{t("lost")}</th>
                <th className="text-right">{t("reserved_today")}</th><th className="text-right">{t("bookable")}</th>
              </tr></thead>
              <tbody>
                {list.map((r) => {
                  const low = r.in_warehouse <= r.min_stock && r.min_stock > 0;
                  return (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/app/inventory/${r.id}`} className="flex items-center gap-3">
                          <img src={r.img ? `/media/${r.img}` : ""} alt="" className="h-10 w-12 rounded-md bg-canvas object-cover" />
                          <span><span className="link block">{r.name}</span><span className="font-mono text-xs text-ink-400">{r.sku} · {lang === "en" ? r.name_en : r.name_id}</span></span>
                          {!r.is_active && <Badge>{lang === "en" ? "inactive" : "nonaktif"}</Badge>}
                        </Link>
                      </td>
                      <td className="font-mono text-ink-500">{r.loc ?? "—"}</td>
                      <td className="text-right tabular-nums font-medium">{r.owned}</td>
                      <td className={`text-right tabular-nums ${low ? "font-semibold text-amber-600" : ""}`}>{r.in_warehouse}{low && <span title={t("min_stock")}> ⚠</span>}</td>
                      <td className="text-right tabular-nums">{r.checked_out || "·"}</td>
                      <td className="text-right tabular-nums">{r.pending_inspection || "·"}</td>
                      <td className={`text-right tabular-nums ${r.damaged ? "text-red-600" : ""}`}>{r.damaged || "·"}</td>
                      <td className="text-right tabular-nums">{r.under_repair || "·"}</td>
                      <td className="text-right tabular-nums">{r.lost || "·"}</td>
                      <td className="text-right tabular-nums">{r.reserved_today || "·"}</td>
                      <td className="text-right tabular-nums font-semibold text-emerald-700">{r.bookable_today}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

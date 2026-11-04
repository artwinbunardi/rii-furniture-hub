import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };
export default async function NewProduct() {
  const user = await requireUser("product.manage");
  const { t, lang } = await getT();
  const cats = await q(user.ctx, `SELECT id, name_id, name_en, parent_id FROM categories WHERE is_active ORDER BY sort, name_id`);
  const locs = await q(user.ctx, `SELECT sl.id, sl.code, w.code AS wh FROM storage_locations sl JOIN warehouses w ON w.id = sl.warehouse_id WHERE sl.is_active ORDER BY w.code, sl.code`);
  return (
    <>
      <PageHeader breadcrumb={<Link href="/app/inventory" className="hover:text-ink">{t("nav_inventory")}</Link>} title={lang === "en" ? "Add product" : "Tambah produk"} />
      <Card className="max-w-4xl p-6">
        <ProductForm lang={lang} categories={cats.map((c) => ({ id: c.id, label: `${c.parent_id ? "— " : ""}${lang === "en" ? c.name_en : c.name_id}` }))} locations={locs.map((l) => ({ id: l.id, label: `${l.wh} / ${l.code}` }))} />
      </Card>
    </>
  );
}

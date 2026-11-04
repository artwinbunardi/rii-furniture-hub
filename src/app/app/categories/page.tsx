import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { PageHeader, Card, CardHeader } from "@/components/ui/misc";
import { CategoryForm, CategoryRow } from "./forms";

export const metadata = { title: "Categories" };
export default async function CategoriesPage() {
  const user = await requireUser("category.manage");
  const { t, lang } = await getT();
  const en = lang === "en";
  const cats = await q(user.ctx, `SELECT c.*, (SELECT count(*)::int FROM products p WHERE p.category_id = c.id) AS products FROM categories c ORDER BY c.sort, c.name_en`);
  const top = cats.filter((c) => !c.parent_id);
  const parents = top.map((c) => ({ id: c.id, label: en ? c.name_en : c.name_id }));
  return (
    <>
      <PageHeader title={t("nav_categories")} subtitle={en ? "Two-level category tree used by the catalog filters and the website." : "Pohon kategori dua tingkat untuk filter katalog dan website."} />
      <Card className="mb-6">
        <CardHeader title={en ? "Add category" : "Tambah kategori"} />
        <div className="p-4"><CategoryForm lang={lang} parents={parents} /></div>
      </Card>
      <Card>
        {top.map((c) => (
          <div key={c.id}>
            <CategoryRow lang={lang} cat={c} parents={parents} products={c.products} depth={0} />
            {cats.filter((s) => s.parent_id === c.id).map((s) => <CategoryRow key={s.id} lang={lang} cat={s} parents={parents} products={s.products} depth={1} />)}
          </div>
        ))}
      </Card>
    </>
  );
}

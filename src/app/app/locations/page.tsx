import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q } from "@/lib/db";
import { hasPerm } from "@/lib/rbac";
import { PageHeader, Card, CardHeader } from "@/components/ui/misc";
import { WarehouseForm, LocationAdd, LocationRow } from "./forms";

export const metadata = { title: "Locations" };
export default async function LocationsPage() {
  const user = await requireUser(["location.manage", "inventory.view"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  const canManage = hasPerm(user.perms, "location.manage");
  const [whs, locs] = await Promise.all([
    q(user.ctx, `SELECT w.*, (SELECT count(*)::int FROM products p JOIN storage_locations l ON l.id = p.location_id WHERE l.warehouse_id = w.id) AS products FROM warehouses w ORDER BY w.code`),
    q(user.ctx, `SELECT l.*, (SELECT count(*)::int FROM products p WHERE p.location_id = l.id) AS products FROM storage_locations l ORDER BY l.code`),
  ]);
  return (
    <>
      <PageHeader title={t("nav_locations")} subtitle={en ? "Warehouses and the storage locations (racks/zones) products are assigned to." : "Gudang dan lokasi penyimpanan (rak/zona) tempat produk disimpan."} />
      {canManage && <Card className="mb-6"><CardHeader title={en ? "Add warehouse" : "Tambah gudang"} /><div className="p-4"><WarehouseForm lang={lang} /></div></Card>}
      <div className="grid gap-6 lg:grid-cols-2">
        {whs.map((w) => (
          <Card key={w.id}>
            <CardHeader title={<span><span className="font-mono">{w.code}</span> · {w.name}{w.is_demo && <span className="ml-2 text-[10px] text-ink-400">DEMO</span>}</span>} subtitle={`${w.address ?? ""} · ${w.products} ${en ? "products" : "produk"}`} />
            {canManage && <div className="border-b border-line p-4"><WarehouseForm lang={lang} wh={w} /></div>}
            <ul className="divide-y divide-line">
              {locs.filter((l) => l.warehouse_id === w.id).map((l) => <LocationRow key={l.id} lang={lang} loc={l} warehouseId={w.id} products={l.products} canManage={canManage} />)}
            </ul>
            {canManage && <div className="border-t border-line p-4"><LocationAdd lang={lang} warehouseId={w.id} /></div>}
          </Card>
        ))}
      </div>
    </>
  );
}

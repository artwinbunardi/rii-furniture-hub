import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { q1 } from "@/lib/db";
import { PageHeader, Card } from "@/components/ui/misc";
import { Scanner } from "./scanner";

export const metadata = { title: "Scan" };

// Printed QR labels encode /app/warehouse/scan?code=XYZ so a phone's normal camera app opens the record directly.
export default async function ScanPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await requireUser("inventory.view");
  const { t, lang } = await getT();
  const en = lang === "en";
  const code = (await searchParams).code?.trim().toUpperCase();
  let notFound = "";
  if (code) {
    const p = await q1(user.ctx, `SELECT id FROM products WHERE upper(sku) = $1`, [code]);
    if (p) redirect(`/app/inventory/${p.id}`);
    const u = await q1(user.ctx, `SELECT product_id FROM asset_units WHERE upper(asset_code) = $1`, [code]);
    if (u) redirect(`/app/inventory/${u.product_id}?unit=${encodeURIComponent(code)}`);
    const r = await q1(user.ctx, `SELECT id FROM reservations WHERE upper(number) = $1`, [code]);
    if (r) redirect(`/app/reservations/${r.id}`);
    notFound = code;
  }
  return (
    <>
      <PageHeader title={t("nav_scan")} subtitle={en ? "Scan a product QR, an asset-unit QR or a picking-list QR to jump straight to its record." : "Pindai QR produk, QR unit aset, atau QR daftar ambil untuk langsung membuka datanya."} />
      {notFound && <p className="mb-4 max-w-2xl rounded-lg bg-red-50 p-3 text-sm text-red-700">{en ? `Code "${notFound}" was not found.` : `Kode "${notFound}" tidak ditemukan.`}</p>}
      <Card className="max-w-2xl p-5"><Scanner lang={lang} /></Card>
    </>
  );
}

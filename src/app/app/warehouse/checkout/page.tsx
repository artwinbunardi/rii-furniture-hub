import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { PageHeader, Card, CardHeader } from "@/components/ui/misc";
import { ReservationQueue } from "@/components/warehouse-queue";

export const metadata = { title: "Check-out" };
export default async function CheckoutPage() {
  const user = await requireUser(["warehouse.checkout", "warehouse.pick"]);
  const { t, lang } = await getT();
  const en = lang === "en";
  return (
    <>
      <PageHeader title={t("nav_checkout")} subtitle={en ? "Prepare picking lists, confirm picked quantities and register outgoing goods." : "Siapkan daftar picking, konfirmasi jumlah dan catat barang keluar."} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title={t("st_ready_for_dispatch")} subtitle={en ? "Picked and waiting for dispatch" : "Sudah diambil, menunggu dikirim"} />
          <ReservationQueue ctx={user.ctx} where={`r.status = 'ready_for_dispatch'`} params={[]} lang={lang} empty={t("no_data")} /></Card>
        <Card><CardHeader title={en ? "To prepare" : "Untuk disiapkan"} subtitle={en ? "Approved / preparing — open to confirm picking" : "Disetujui / disiapkan — buka untuk konfirmasi picking"} />
          <ReservationQueue ctx={user.ctx} where={`r.status IN ('approved','preparing')`} params={[]} lang={lang} empty={t("no_data")} /></Card>
      </div>
    </>
  );
}

import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireUser } from "@/lib/auth/session";
import { getT } from "@/lib/i18n/server";
import { getReservationView } from "@/lib/services/reservation-queries";
import { fmtDate, fmtDateTime } from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Picking list" };

export default async function PickingList({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("reservation.view_all");
  const { t, lang } = await getT();
  const r = await getReservationView(user.ctx, id);
  if (!r) notFound();
  const qr = await QRCode.toDataURL(`${process.env.APP_URL ?? ""}/app/reservations/${r.id}`, { margin: 0, width: 120 });
  const items = [...r.items].sort((a: any, b: any) => String(a.location_code ?? "").localeCompare(String(b.location_code ?? "")));
  return (
    <div className="mx-auto max-w-3xl rounded-xl bg-white p-8 shadow-card print:shadow-none">
      <div className="no-print mb-6 flex justify-end"><PrintButton label={t("print_label")} /></div>
      <div className="flex items-start justify-between gap-6 border-b border-line pb-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-400">RII Furniture Hub · {lang === "en" ? "Picking list" : "Daftar Picking"}</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold">{r.number}</h1>
          <p className="mt-1 text-sm">{r.project_code} — {r.project_name}</p>
          <p className="text-sm text-ink-500">{t("loading_date")}: {fmtDate(r.loading_date, lang)} · {t("return_date")}: {fmtDate(r.return_date, lang)}</p>
          <p className="text-sm text-ink-500">{t("event_location")}: {r.event_location ?? "—"}</p>
        </div>
        <img src={qr} alt="QR" className="h-24 w-24" />
      </div>
      <table className="tbl mt-5">
        <thead><tr><th>{t("storage_location")}</th><th>SKU</th><th>{t("nav_products")}</th><th className="text-right">{t("approved_qty")}</th><th className="text-right">{t("picked")}</th><th>✓</th></tr></thead>
        <tbody>{items.map((it: any) => (
          <tr key={it.id}><td className="font-mono">{it.location_code ?? "—"}</td><td className="font-mono">{it.sku}</td><td>{it.name}</td><td className="text-right">{it.qty_approved || it.qty_requested}</td><td className="text-right">{it.qty_picked || "____"}</td><td>☐</td></tr>
        ))}</tbody>
      </table>
      {r.special_instructions && <p className="mt-5 rounded-lg bg-canvas p-3 text-sm"><strong>{t("special_instructions")}:</strong> {r.special_instructions}</p>}
      <div className="mt-10 grid grid-cols-3 gap-6 text-center text-xs text-ink-500">
        {[lang === "en" ? "Picked by" : "Diambil oleh", lang === "en" ? "Checked by" : "Diperiksa oleh", lang === "en" ? "Received by" : "Diterima oleh"].map((l) => <div key={l}><div className="mb-1 h-14 border-b border-ink-300" />{l}</div>)}
      </div>
      <p className="mt-6 text-[11px] text-ink-400">{lang === "en" ? "Generated" : "Dibuat"} {fmtDateTime(new Date(), lang)}</p>
    </div>
  );
}

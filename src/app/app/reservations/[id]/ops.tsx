"use client";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, PackageCheck, Truck, Undo2, ClipboardCheck, Ban, PlayCircle } from "lucide-react";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Card, CardHeader } from "@/components/ui/misc";
import { Input, Textarea, Select } from "@/components/ui/field";
import { reservationAction } from "../actions";
import { tr, type Lang } from "@/lib/i18n/dict";

type Perms = { approve: boolean; cancelAny: boolean; pick: boolean; checkout: boolean; checkin: boolean; inspect: boolean };

function QtyTable({ items, prefix, valueOf, maxOf, cols, lang }: { items: any[]; prefix: string; valueOf: (i: any) => number; maxOf: (i: any) => number; cols: [string, (i: any) => React.ReactNode][]; lang: Lang }) {
  return (
    <table className="tbl">
      <thead><tr><th>{tr(lang, "nav_products")}</th>{cols.map(([h]) => <th key={h} className="text-right">{h}</th>)}<th className="w-28 text-right">{tr(lang, "qty")}</th></tr></thead>
      <tbody>
        {items.map((it) => (
          <tr key={it.product_id}>
            <td><div className="font-medium">{it.name}</div><div className="font-mono text-xs text-ink-400">{it.sku}{it.location_code ? ` · ${it.location_code}` : ""}</div></td>
            {cols.map(([h, f]) => <td key={h} className="text-right tabular-nums">{f(it)}</td>)}
            <td className="text-right"><Input type="number" name={`${prefix}${it.product_id}`} defaultValue={valueOf(it)} min={0} max={maxOf(it)} className="ml-auto w-24 text-right" aria-label={`${it.sku} qty`} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ReservationOps({ r, perms, lang, userId }: { r: any; perms: Perms; lang: Lang; userId: string }) {
  const t = (k: string) => tr(lang, k);
  const router = useRouter();
  const refresh = () => router.refresh();
  const panels: React.ReactNode[] = [];
  const hidden = (op: string) => (<><input type="hidden" name="id" value={r.id} /><input type="hidden" name="op" value={op} /></>);

  if (r.status === "pending_approval" && perms.approve) {
    panels.push(
      <Card key="approve">
        <CardHeader title={lang === "en" ? "Approval" : "Persetujuan"} subtitle={lang === "en" ? "Quantities are re-validated atomically when you approve. You may approve partial quantities." : "Jumlah divalidasi ulang secara atomik saat disetujui. Anda dapat menyetujui sebagian."} />
        <ActionForm action={reservationAction} onSuccess={refresh}>
          {hidden("approve")}
          <QtyTable items={r.items} prefix="approve_" valueOf={(i) => Math.min(i.qty_requested, r.availability[i.product_id]?.available ?? i.qty_requested)} maxOf={(i) => i.qty_requested} lang={lang}
            cols={[[t("requested"), (i) => i.qty_requested], [t("available"), (i) => r.availability[i.product_id]?.available ?? "—"]]} />
          <div className="space-y-3 p-5">
            <Textarea name="note" placeholder={lang === "en" ? "Approval note (optional)" : "Catatan persetujuan (opsional)"} />
            <div className="flex flex-wrap gap-2">
              <ConfirmButton variant="primary" title={lang === "en" ? "Approve this reservation?" : "Setujui reservasi ini?"} body={lang === "en" ? "Stock will be reserved for the selected dates." : "Stok akan dikunci untuk tanggal yang dipilih."} confirmLabel={t("approve")} cancelLabel={t("cancel")}>
                <CheckCircle2 className="h-4 w-4" />{t("approve")}
              </ConfirmButton>
            </div>
          </div>
        </ActionForm>
        <ActionForm action={reservationAction} onSuccess={refresh} className="border-t border-line p-5">
          {hidden("reject")}
          <ConfirmButton variant="danger" title={lang === "en" ? "Reject reservation" : "Tolak reservasi"} confirmLabel={t("reject")} cancelLabel={t("cancel")} requireReason reasonLabel={t("reason")}>
            <XCircle className="h-4 w-4" />{t("reject")}
          </ConfirmButton>
        </ActionForm>
      </Card>,
    );
  }

  if (r.status === "approved" && perms.pick) {
    panels.push(
      <Card key="prepare">
        <CardHeader title={lang === "en" ? "Warehouse preparation" : "Persiapan gudang"} subtitle={lang === "en" ? "Start preparing to notify the team, or confirm picking directly." : "Mulai persiapan, atau langsung konfirmasi picking."} />
        <ActionForm action={reservationAction} onSuccess={refresh} className="p-5">
          {hidden("prepare")}
          <SubmitButton variant="outline"><PlayCircle className="h-4 w-4" />{lang === "en" ? "Start preparing" : "Mulai disiapkan"}</SubmitButton>
        </ActionForm>
      </Card>,
    );
  }
  if ((r.status === "preparing" || r.status === "approved") && perms.pick) {
    panels.push(
      <Card key="pick">
        <CardHeader title={lang === "en" ? "Confirm picking" : "Konfirmasi picking"} subtitle={lang === "en" ? "Enter the quantity physically picked. Shortages are logged as discrepancies." : "Masukkan jumlah yang benar-benar diambil. Kekurangan dicatat sebagai selisih."} />
        <ActionForm action={reservationAction} onSuccess={refresh}>
          {hidden("pick")}
          <QtyTable items={r.items.filter((i: any) => i.qty_approved > 0)} prefix="pick_" valueOf={(i) => i.qty_approved} maxOf={(i) => i.qty_approved} lang={lang}
            cols={[[t("approved_qty"), (i) => i.qty_approved], [t("in_warehouse"), (i) => i.in_warehouse]]} />
          <div className="space-y-3 p-5"><Input name="note" placeholder={t("notes")} /><SubmitButton><PackageCheck className="h-4 w-4" />{lang === "en" ? "Confirm picking" : "Konfirmasi picking"}</SubmitButton></div>
        </ActionForm>
      </Card>,
    );
  }
  if (r.status === "ready_for_dispatch" && perms.checkout) {
    panels.push(
      <Card key="dispatch">
        <CardHeader title={lang === "en" ? "Dispatch / check-out" : "Pengeluaran barang"} subtitle={lang === "en" ? "Confirm the items actually leaving the warehouse." : "Konfirmasi barang yang benar-benar keluar gudang."} />
        <ActionForm action={reservationAction} onSuccess={refresh}>
          {hidden("dispatch")}
          <QtyTable items={r.items.filter((i: any) => i.qty_picked > 0)} prefix="out_" valueOf={(i) => i.qty_picked} maxOf={(i) => i.qty_picked} lang={lang} cols={[[t("picked"), (i) => i.qty_picked]]} />
          <div className="space-y-3 p-5"><Input name="note" placeholder={lang === "en" ? "Vehicle / driver / notes" : "Kendaraan / sopir / catatan"} />
            <ConfirmButton variant="primary" title={lang === "en" ? "Confirm dispatch?" : "Konfirmasi pengeluaran?"} body={lang === "en" ? "Inventory will move from warehouse to checked-out." : "Inventaris akan berpindah dari gudang ke status keluar."} confirmLabel={t("confirm")} cancelLabel={t("cancel")}><Truck className="h-4 w-4" />{lang === "en" ? "Dispatch items" : "Keluarkan barang"}</ConfirmButton>
          </div>
        </ActionForm>
      </Card>,
    );
  }
  const outstanding = r.items.filter((i: any) => i.qty_checked_out - i.qty_returned - i.qty_missing > 0);
  if (["checked_out", "partially_returned"].includes(r.status) && perms.checkin && outstanding.length) {
    panels.push(
      <Card key="return">
        <CardHeader title={lang === "en" ? "Register return (check-in)" : "Catat pengembalian"} subtitle={lang === "en" ? "Returned items go to 'pending inspection' and are NOT bookable until inspected." : "Barang kembali masuk 'menunggu inspeksi' dan BELUM dapat dipesan sampai diinspeksi."} />
        <ActionForm action={reservationAction} onSuccess={refresh}>
          {hidden("return")}
          <table className="tbl">
            <thead><tr><th>{t("nav_products")}</th><th className="text-right">{lang === "en" ? "Outstanding" : "Masih di luar"}</th><th className="w-28 text-right">{t("returned_qty")}</th><th className="w-28 text-right">{t("lost")}</th></tr></thead>
            <tbody>{outstanding.map((it: any) => {
              const out = it.qty_checked_out - it.qty_returned - it.qty_missing;
              return (
                <tr key={it.product_id}>
                  <td><div className="font-medium">{it.name}</div><div className="font-mono text-xs text-ink-400">{it.sku}</div></td>
                  <td className="text-right tabular-nums">{out}</td>
                  <td className="text-right"><Input type="number" name={`ret_${it.product_id}`} defaultValue={out} min={0} max={out} className="ml-auto w-24 text-right" aria-label={`${it.sku} returned`} /></td>
                  <td className="text-right"><Input type="number" name={`miss_${it.product_id}`} defaultValue={0} min={0} max={out} className="ml-auto w-24 text-right" aria-label={`${it.sku} missing`} /></td>
                </tr>
              );
            })}</tbody>
          </table>
          <div className="space-y-3 p-5"><Input name="note" placeholder={t("notes")} /><SubmitButton><Undo2 className="h-4 w-4" />{lang === "en" ? "Register return" : "Catat pengembalian"}</SubmitButton></div>
        </ActionForm>
      </Card>,
    );
  }
  const toInspect = r.items.filter((i: any) => i.qty_returned - i.qty_inspected_good - i.qty_inspected_damaged - i.qty_inspected_lost > 0);
  if (perms.inspect && toInspect.length) {
    panels.push(
      <Card key="inspect">
        <CardHeader title={lang === "en" ? "Return inspection" : "Inspeksi pengembalian"} subtitle={lang === "en" ? "Only units marked good become available again. Damaged units stay unavailable until repaired." : "Hanya unit yang baik yang kembali tersedia. Unit rusak tetap tidak tersedia sampai diperbaiki."} />
        <div className="divide-y divide-line">
          {toInspect.map((it: any) => {
            const pending = it.qty_returned - it.qty_inspected_good - it.qty_inspected_damaged - it.qty_inspected_lost;
            return (
              <ActionForm key={it.product_id} action={reservationAction} onSuccess={refresh} className="p-5">
                {hidden("inspect")}<input type="hidden" name="product_id" value={it.product_id} />
                <div className="mb-3 flex items-center justify-between"><div><p className="font-medium">{it.name}</p><p className="font-mono text-xs text-ink-400">{it.sku}</p></div><span className="text-sm text-ink-500">{pending} {lang === "en" ? "to inspect" : "perlu diinspeksi"}</span></div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-ink-500">{lang === "en" ? "Good" : "Baik"}<Input type="number" name="good" defaultValue={pending} min={0} max={pending} aria-label={`${it.sku} good`} /></label>
                  <label className="text-xs text-ink-500">{t("damaged")}<Input type="number" name="damaged" defaultValue={0} min={0} max={pending} aria-label={`${it.sku} damaged`} /></label>
                  <label className="text-xs text-ink-500">{t("lost")}<Input type="number" name="lost" defaultValue={0} min={0} max={pending} /></label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                  <Select name="severity" defaultValue="minor"><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Severe</option></Select>
                  <Input name="damage_description" placeholder={lang === "en" ? "Damage description (required if damaged)" : "Deskripsi kerusakan (wajib jika rusak)"} />
                </div>
                <div className="mt-3 flex gap-2"><Input name="note" placeholder={t("notes")} /><SubmitButton><ClipboardCheck className="h-4 w-4" />{t("save")}</SubmitButton></div>
              </ActionForm>
            );
          })}
        </div>
      </Card>,
    );
  }
  const cancellable = (perms.cancelAny && ["pending_approval", "approved", "preparing", "ready_for_dispatch"].includes(r.status)) || (r.requester_id === userId && ["pending_approval", "approved"].includes(r.status));
  if (cancellable) {
    panels.push(
      <ActionForm key="cancel" action={reservationAction} onSuccess={refresh} className="flex justify-end">
        {hidden("cancel")}
        <ConfirmButton variant="outline" title={t("cancel_reservation")} body={lang === "en" ? "Reserved stock will be released." : "Stok yang dipesan akan dilepas."} confirmLabel={t("confirm")} cancelLabel={t("close")} requireReason reasonLabel={t("reason")}>
          <Ban className="h-4 w-4" />{t("cancel_reservation")}
        </ConfirmButton>
      </ActionForm>,
    );
  }
  if (!panels.length) return null;
  return <div className="space-y-6">{panels}</div>;
}

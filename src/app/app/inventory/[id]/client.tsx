"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card } from "@/components/ui/misc";
import { Input, Select, Field, Checkbox } from "@/components/ui/field";
import { stockOpAction, uploadProductImagesAction, imageOpAction } from "../actions";
import { cn } from "@/lib/utils";
import type { Lang } from "@/lib/i18n/dict";

type Perms = { receive: boolean; adjust: boolean; approve: boolean; damage: boolean; relocate: boolean; units: boolean };

export function StockOps({ lang, productId, sku, inWarehouse, perms, locations, currentLocation }: { lang: Lang; productId: string; sku: string; inWarehouse: number; perms: Perms; locations: { id: string; label: string }[]; currentLocation: string | null }) {
  const en = lang === "en";
  const tabs = [
    perms.receive && ["receive", en ? "Receive stock" : "Terima stok"],
    perms.adjust && ["adjust", en ? "Stock adjustment" : "Penyesuaian stok"],
    perms.damage && ["damage", en ? "Report damage" : "Lapor kerusakan"],
    perms.relocate && ["relocate", en ? "Relocate" : "Pindah lokasi"],
    perms.adjust && ["count", en ? "Count mismatch" : "Selisih hitung"],
    perms.units && ["units", en ? "Asset codes" : "Kode aset"],
  ].filter(Boolean) as [string, string][];
  const [tab, setTab] = useState(tabs[0]?.[0]);
  const router = useRouter();
  if (!tabs.length) return null;
  const common = (op: string) => (<><input type="hidden" name="product_id" value={productId} /><input type="hidden" name="op" value={op} /></>);
  return (
    <Card>
      <div className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-2">
        {tabs.map(([k, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={cn("whitespace-nowrap border-b-2 px-3 py-2 text-[13px]", tab === k ? "border-ink font-medium" : "border-transparent text-ink-500 hover:text-ink")}>{l}</button>)}
      </div>
      <div className="p-5">
        {tab === "receive" && (
          <ActionForm key="receive" action={stockOpAction} onSuccess={() => router.refresh()} resetOnSuccess className="grid gap-3 md:grid-cols-[120px_1fr_auto] md:items-end">
            {common("receive")}
            <Field label={en ? "Quantity" : "Jumlah"}><Input name="qty" type="number" min={1} required /></Field>
            <Field label={en ? "Reference / reason" : "Referensi / alasan"}><Input name="reason" required placeholder={en ? "PO number, supplier, fabrication batch…" : "No. PO, pemasok, batch fabrikasi…"} /></Field>
            <SubmitButton>{en ? "Receive" : "Terima"}</SubmitButton>
          </ActionForm>
        )}
        {tab === "adjust" && (
          <ActionForm key="adjust" action={stockOpAction} onSuccess={() => router.refresh()} resetOnSuccess className="space-y-3">
            {common("adjust")}
            <div className="grid gap-3 md:grid-cols-[200px_120px_1fr]">
              <Field label={en ? "Type" : "Jenis"}><Select name="kind"><option value="increase">{en ? "Increase (found extra)" : "Tambah (kelebihan)"}</option><option value="decrease">{en ? "Decrease (shortage)" : "Kurangi (kekurangan)"}</option><option value="found">{en ? "Lost unit found" : "Unit hilang ditemukan"}</option><option value="write_off">{en ? "Write off lost units" : "Hapus unit hilang"}</option></Select></Field>
              <Field label={en ? "Quantity" : "Jumlah"}><Input name="qty" type="number" min={1} required /></Field>
              <Field label={en ? "Reason (required)" : "Alasan (wajib)"}><Input name="reason" required /></Field>
            </div>
            <p className="text-xs text-ink-500">{en ? "Adjustments require Warehouse Manager approval and are written to the movement ledger." : "Penyesuaian memerlukan persetujuan Manajer Gudang dan dicatat di buku besar pergerakan."}</p>
            {perms.approve && <Checkbox name="apply_now" label={en ? "I am the approver — apply immediately" : "Saya penyetuju — terapkan langsung"} />}
            <SubmitButton>{en ? "Submit adjustment" : "Ajukan penyesuaian"}</SubmitButton>
          </ActionForm>
        )}
        {tab === "damage" && (
          <ActionForm key="damage" action={stockOpAction} onSuccess={() => router.refresh()} resetOnSuccess className="grid gap-3 md:grid-cols-[110px_140px_1fr_auto] md:items-end">
            {common("damage")}
            <Field label={en ? "Quantity" : "Jumlah"}><Input name="qty" type="number" min={1} max={inWarehouse} required /></Field>
            <Field label={en ? "Severity" : "Tingkat"}><Select name="severity"><option value="minor">Minor</option><option value="moderate">Moderate</option><option value="severe">Severe</option></Select></Field>
            <Field label={en ? "Description" : "Deskripsi"}><Input name="reason" required /></Field>
            <SubmitButton variant="danger">{en ? "Report" : "Laporkan"}</SubmitButton>
          </ActionForm>
        )}
        {tab === "relocate" && (
          <ActionForm key="relocate" action={stockOpAction} onSuccess={() => router.refresh()} className="grid gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
            {common("relocate")}
            <Field label={en ? "New location" : "Lokasi baru"}><Select name="location_id" defaultValue={currentLocation ?? ""}><option value="">—</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</Select></Field>
            <Field label={en ? "Reason" : "Alasan"}><Input name="reason" /></Field>
            <SubmitButton>{en ? "Move" : "Pindahkan"}</SubmitButton>
          </ActionForm>
        )}
        {tab === "count" && (
          <ActionForm key="count" action={stockOpAction} onSuccess={() => router.refresh()} resetOnSuccess className="grid gap-3 md:grid-cols-[120px_120px_1fr_auto] md:items-end">
            {common("count")}
            <Field label={en ? "System qty" : "Qty sistem"}><Input name="expected" type="number" defaultValue={inWarehouse} readOnly /></Field>
            <Field label={en ? "Counted" : "Terhitung"}><Input name="actual" type="number" min={0} required /></Field>
            <Field label={t2(en, "Notes", "Catatan")}><Input name="reason" /></Field>
            <SubmitButton>{en ? "Report" : "Laporkan"}</SubmitButton>
          </ActionForm>
        )}
        {tab === "units" && (
          <ActionForm key="units" action={stockOpAction} onSuccess={() => router.refresh()} className="flex flex-wrap items-end gap-3">
            {common("units")}
            <Field label={en ? `Generate asset codes (${sku}-U###)` : `Buat kode aset (${sku}-U###)`}><Input name="count" type="number" min={1} max={500} defaultValue={1} className="w-32" /></Field>
            <SubmitButton>{en ? "Generate" : "Buat"}</SubmitButton>
          </ActionForm>
        )}
      </div>
    </Card>
  );
}
const t2 = (en: boolean, a: string, b: string) => (en ? a : b);

export function ImageManager({ lang, productId, images, library, canManage }: { lang: Lang; productId: string; images: { id: string; url: string }[]; library: { id: string; url: string; name: string }[]; canManage: boolean }) {
  const en = lang === "en";
  const router = useRouter();
  const [pick, setPick] = useState(false);
  return (
    <div className="p-4">
      <div className="grid grid-cols-3 gap-2">
        {images.map((im, i) => (
          <div key={im.id} className="group relative overflow-hidden rounded-lg border border-line">
            <img src={im.url} alt="" className="aspect-square w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-ink px-1.5 text-[10px] text-white">{en ? "main" : "utama"}</span>}
            {canManage && (
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-white/90 p-1 opacity-0 transition group-hover:opacity-100">
                {(["up", "down", "remove"] as const).map((op) => (
                  <form key={op} action={imageOpAction} onSubmit={(e) => { if (op === "remove" && !confirm(en ? "Remove this photo?" : "Hapus foto ini?")) e.preventDefault(); }}>
                    <input type="hidden" name="product_id" value={productId} /><input type="hidden" name="media_id" value={im.id} /><input type="hidden" name="op" value={op} />
                    <button className="rounded p-1 hover:bg-canvas" aria-label={op}>{op === "up" ? <ArrowUp className="h-3.5 w-3.5" /> : op === "down" ? <ArrowDown className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5 text-red-600" />}</button>
                  </form>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        <ActionForm action={uploadProductImagesAction} onSuccess={() => { setPick(false); router.refresh(); }} resetOnSuccess className="mt-4 space-y-3">
          <input type="hidden" name="product_id" value={productId} />
          <Input type="file" name="images" accept="image/*" multiple />
          <button type="button" className="text-xs text-ink-500 underline" onClick={() => setPick(!pick)}>{en ? "…or choose from the media library" : "…atau pilih dari pustaka media"}</button>
          {pick && (
            <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
              {library.map((m) => (
                <label key={m.id} className="relative cursor-pointer">
                  <input type="checkbox" name="media_ids" value={m.id} className="peer absolute left-1 top-1 z-10" />
                  <img src={m.url} alt={m.name} title={m.name} className="aspect-square w-full rounded object-cover peer-checked:ring-2 peer-checked:ring-ink" />
                </label>
              ))}
            </div>
          )}
          <SubmitButton size="sm">{en ? "Add photos" : "Tambah foto"}</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

"use client";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { saveProductAction } from "./actions";
import { tr, type Lang } from "@/lib/i18n/dict";

type Opt = { id: string; label: string };

export function ProductForm({ lang, product, categories, locations }: { lang: Lang; product?: any; categories: Opt[]; locations: Opt[] }) {
  const t = (k: string) => tr(lang, k);
  const p = product ?? {};
  return (
    <ActionForm action={saveProductAction} className="space-y-5">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <Field label={`${t("sku")} *`}><Input name="sku" defaultValue={p.sku} required pattern="[A-Za-z0-9][A-Za-z0-9-]{1,30}" placeholder="SOF-010" className="font-mono uppercase" /></Field>
        <Field label={`${t("name")} *`}><Input name="name" defaultValue={p.name} required /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label={`${t("category")} *`}><Select name="category_id" defaultValue={p.category_id ?? ""} required><option value="">—</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label={t("storage_location")}><Select name="location_id" defaultValue={p.location_id ?? ""}><option value="">—</option>{locations.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label={t("condition")}><Select name="condition_grade" defaultValue={p.condition_grade ?? "good"}>{["new", "excellent", "good", "fair"].map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label={t("description")}><Textarea name="description" defaultValue={p.description ?? ""} rows={4} /></Field>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label={lang === "en" ? "Length (cm)" : "Panjang (cm)"}><Input name="length_cm" type="number" step="0.1" min={0} defaultValue={p.length_cm ?? ""} /></Field>
        <Field label={lang === "en" ? "Width (cm)" : "Lebar (cm)"}><Input name="width_cm" type="number" step="0.1" min={0} defaultValue={p.width_cm ?? ""} /></Field>
        <Field label={lang === "en" ? "Height (cm)" : "Tinggi (cm)"}><Input name="height_cm" type="number" step="0.1" min={0} defaultValue={p.height_cm ?? ""} /></Field>
        <Field label={`${t("weight")} (kg)`}><Input name="weight_kg" type="number" step="0.01" min={0} defaultValue={p.weight_kg ?? ""} /></Field>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Field label={t("color")}><Input name="color" defaultValue={p.color ?? ""} /></Field>
        <Field label={t("material")}><Input name="material" defaultValue={p.material ?? ""} /></Field>
        <Field label={t("min_stock")}><Input name="min_stock" type="number" min={0} defaultValue={p.min_stock ?? 0} /></Field>
        <Field label={lang === "en" ? "Turnaround buffer (days)" : "Buffer perawatan (hari)"} hint={lang === "en" ? "Empty = global setting" : "Kosong = pengaturan global"}><Input name="turnaround_days" type="number" min={0} defaultValue={p.turnaround_days ?? ""} /></Field>
      </div>
      {!p.id && (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={lang === "en" ? "Initial stock (units)" : "Stok awal (unit)"} hint={lang === "en" ? "Recorded as an 'initial' movement in the ledger." : "Dicatat sebagai pergerakan 'initial' di buku besar."}><Input name="initial_qty" type="number" min={0} defaultValue={0} /></Field>
          <Field label={lang === "en" ? "Product photos" : "Foto produk"}><Input name="images" type="file" accept="image/*" multiple /></Field>
        </div>
      )}
      <div className="flex flex-wrap gap-6">
        <Checkbox name="track_units" defaultChecked={!!p.track_units} label={lang === "en" ? "Track individual asset units" : "Lacak unit aset individual"} />
        <input type="hidden" name="is_active_present" value="1" />
        <Checkbox name="is_active" defaultChecked={p.is_active !== false} label={lang === "en" ? "Active (visible in catalog)" : "Aktif (tampil di katalog)"} />
      </div>
      <SubmitButton>{t("save")}</SubmitButton>
    </ActionForm>
  );
}

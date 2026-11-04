"use client";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Field, Input, Textarea, Select, Checkbox } from "@/components/ui/field";
import { saveCollectionAction, deleteCollectionAction } from "../admin-actions";

type P = { id: string; sku: string; name: string; img: string | null };
type C = { id: string; name: string; slug: string; description: string | null; is_published: boolean; sort: number; cover_media_id: string | null };

export function CollectionForm({ lang, collection, selected, products, media }: { lang: "id" | "en"; collection?: C; selected: string[]; products: P[]; media: { id: string; url: string; name: string }[] }) {
  const en = lang === "en";
  const [ids, setIds] = useState<string[]>(selected);
  const [qq, setQ] = useState("");
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const matches = products.filter((p) => !ids.includes(p.id) && (!qq || `${p.sku} ${p.name}`.toLowerCase().includes(qq.toLowerCase()))).slice(0, 30);
  const move = (i: number, d: number) => setIds((a) => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b; });
  return (
    <div className="space-y-4">
      <ActionForm action={saveCollectionAction} className="space-y-4">
        {collection && <input type="hidden" name="id" value={collection.id} />}
        {ids.map((id) => <input key={id} type="hidden" name="product_ids" value={id} />)}
        <div className="grid gap-4 md:grid-cols-[1fr_220px_100px]">
          <Field label={`${en ? "Name" : "Nama"} *`}><Input name="name" defaultValue={collection?.name} required /></Field>
          <Field label="Slug"><Input name="slug" defaultValue={collection?.slug} className="font-mono text-xs" placeholder={en ? "auto" : "otomatis"} /></Field>
          <Field label={en ? "Sort" : "Urutan"}><Input name="sort" type="number" defaultValue={collection?.sort ?? 0} /></Field>
        </div>
        <Field label={en ? "Description" : "Deskripsi"}><Textarea name="description" defaultValue={collection?.description ?? ""} rows={2} /></Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={en ? "Cover image" : "Gambar sampul"} hint={en ? "From the media library. Empty = first product photos." : "Dari pustaka media. Kosong = foto produk pertama."}>
            <Select name="cover_media_id" defaultValue={collection?.cover_media_id ?? ""}><option value="">—</option>{media.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</Select>
          </Field>
          <div className="pt-6"><Checkbox name="is_published" defaultChecked={collection ? collection.is_published : true} label={en ? "Published (visible in catalog & website)" : "Terbit (tampil di katalog & website)"} /></div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">{en ? "Products in this collection" : "Produk dalam koleksi"} <span className="text-ink-400">({ids.length})</span></p>
          {ids.length === 0 ? <p className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-ink-400">{en ? "No products yet — add from the list below." : "Belum ada produk — tambahkan dari daftar di bawah."}</p> : (
            <ol className="divide-y divide-line rounded-lg border border-line">
              {ids.map((id, i) => { const p = byId.get(id); if (!p) return null; return (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-5 text-right text-xs tabular-nums text-ink-400">{i + 1}</span>
                  {p.img ? <img src={p.img} alt="" className="h-9 w-11 rounded object-cover" /> : <span className="h-9 w-11 rounded bg-canvas" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">{p.name}</span><span className="font-mono text-xs text-ink-400">{p.sku}</span></span>
                  <button type="button" onClick={() => move(i, -1)} className="rounded p-1 hover:bg-canvas" aria-label="up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => move(i, 1)} className="rounded p-1 hover:bg-canvas" aria-label="down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setIds((a) => a.filter((x) => x !== id))} className="rounded p-1 text-red-600 hover:bg-canvas" aria-label="remove"><X className="h-3.5 w-3.5" /></button>
                </li>
              ); })}
            </ol>
          )}
        </div>
        <SubmitButton>{en ? "Save collection" : "Simpan koleksi"}</SubmitButton>
      </ActionForm>

      <div className="rounded-lg border border-line p-3">
        <Input value={qq} onChange={(e) => setQ(e.target.value)} placeholder={en ? "Search products to add…" : "Cari produk untuk ditambahkan…"} />
        <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto">
          {matches.map((p) => (
            <li key={p.id}><button type="button" onClick={() => setIds((a) => [...a, p.id])} className="flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-canvas">
              {p.img ? <img src={p.img} alt="" className="h-8 w-10 rounded object-cover" /> : <span className="h-8 w-10 rounded bg-canvas" />}
              <span className="flex-1 truncate text-sm">{p.name}</span><span className="font-mono text-xs text-ink-400">{p.sku}</span><span className="text-xs text-ink-500">+ {en ? "add" : "tambah"}</span>
            </button></li>
          ))}
        </ul>
      </div>

      {collection && (
        <ActionForm action={deleteCollectionAction} className="pt-2">
          <input type="hidden" name="id" value={collection.id} />
          <ConfirmButton variant="outline" size="sm" title={en ? "Delete this collection?" : "Hapus koleksi ini?"} body={en ? "Products are not affected. Website sections that reference this collection will show nothing." : "Produk tidak terpengaruh. Bagian website yang memakai koleksi ini akan kosong."} confirmLabel={en ? "Delete" : "Hapus"} cancelLabel={en ? "Cancel" : "Batal"}>{en ? "Delete collection" : "Hapus koleksi"}</ConfirmButton>
        </ActionForm>
      )}
    </div>
  );
}

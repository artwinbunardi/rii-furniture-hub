"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Input, Select, Checkbox } from "@/components/ui/field";
import { saveCategoryAction, deleteCategoryAction } from "../admin-actions";

type Cat = { id: string; slug: string; name_id: string; name_en: string; parent_id: string | null; description: string | null; sort: number; is_active: boolean };

export function CategoryForm({ lang, cat, parents, onDone }: { lang: "id" | "en"; cat?: Cat; parents: { id: string; label: string }[]; onDone?: () => void }) {
  const en = lang === "en";
  const router = useRouter();
  return (
    <ActionForm action={saveCategoryAction} onSuccess={() => { router.refresh(); onDone?.(); }} resetOnSuccess={!cat} className="grid gap-2 md:grid-cols-[1fr_1fr_150px_170px_70px_auto] md:items-center">
      {cat && <input type="hidden" name="id" value={cat.id} />}
      <Input name="name_id" defaultValue={cat?.name_id} placeholder="Nama (ID)" required aria-label="Nama (ID)" />
      <Input name="name_en" defaultValue={cat?.name_en} placeholder="Name (EN)" required aria-label="Name (EN)" />
      <Input name="slug" defaultValue={cat?.slug} placeholder={en ? "slug (auto)" : "slug (otomatis)"} className="font-mono text-xs" aria-label="slug" />
      <Select name="parent_id" defaultValue={cat?.parent_id ?? ""} aria-label="parent"><option value="">{en ? "— top level —" : "— tingkat atas —"}</option>{parents.filter((p) => p.id !== cat?.id).map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</Select>
      <Input name="sort" type="number" defaultValue={cat?.sort ?? 0} aria-label="sort" />
      <div className="flex items-center gap-3">
        <Checkbox name="is_active" defaultChecked={cat ? cat.is_active : true} label={en ? "Active" : "Aktif"} />
        <SubmitButton size="sm">{cat ? (en ? "Save" : "Simpan") : (en ? "Add" : "Tambah")}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export function CategoryRow({ lang, cat, parents, products, depth }: { lang: "id" | "en"; cat: Cat; parents: { id: string; label: string }[]; products: number; depth: number }) {
  const en = lang === "en";
  const [edit, setEdit] = useState(false);
  const router = useRouter();
  if (edit) return <div className="border-b border-line bg-canvas p-3"><CategoryForm lang={lang} cat={cat} parents={parents} onDone={() => setEdit(false)} /><button type="button" className="mt-2 text-xs text-ink-500 underline" onClick={() => setEdit(false)}>{en ? "Cancel" : "Batal"}</button></div>;
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5" style={{ paddingLeft: 16 + depth * 24 }}>
      <div className="min-w-0">
        <span className={cat.is_active ? "font-medium" : "font-medium text-ink-400 line-through"}>{en ? cat.name_en : cat.name_id}</span>
        <span className="ml-2 text-sm text-ink-400">{en ? cat.name_id : cat.name_en}</span>
        <span className="ml-2 font-mono text-xs text-ink-400">/{cat.slug}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs tabular-nums text-ink-500">{products} {en ? "products" : "produk"}</span>
        <button type="button" onClick={() => setEdit(true)} className="rounded p-1.5 hover:bg-canvas" aria-label={en ? "Edit" : "Ubah"}><Pencil className="h-3.5 w-3.5" /></button>
        <ActionForm action={deleteCategoryAction} onSuccess={() => router.refresh()} showMessages className="contents">
          <input type="hidden" name="id" value={cat.id} />
          <ConfirmButton size="sm" variant="ghost" title={en ? "Delete category?" : "Hapus kategori?"} body={en ? "Only possible when no products or subcategories use it." : "Hanya bisa bila tidak ada produk atau subkategori yang memakainya."} confirmLabel={en ? "Delete" : "Hapus"} cancelLabel={en ? "Cancel" : "Batal"}>{en ? "Delete" : "Hapus"}</ConfirmButton>
        </ActionForm>
      </div>
    </div>
  );
}

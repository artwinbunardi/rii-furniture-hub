"use client";
import * as React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, FolderOpen, Replace, Trash2, Upload, X } from "lucide-react";
import { uploadMediaAction, mediaOpAction } from "../actions";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Card, Badge } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";
import { fmtDateTime } from "@/lib/utils";

type Item = { id: string; name: string; url: string; mime: string; size: number; category: string; folder: string | null; alt: string | null; demo: boolean; uploader: string | null; created: string; productUses: number; siteUses: number };
const CATS = ["banner", "product", "gallery", "logo", "favicon", "general"];

export function MediaLibrary({ lang, items, total, page, per, sp, folders, counts }: {
  lang: "id" | "en"; items: Item[]; total: number; page: number; per: number; sp: Record<string, string | undefined>; folders: { folder: string; n: number }[]; counts: { category: string; n: number }[];
}) {
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const router = useRouter();
  const [sel, setSel] = useState<Item | null>(null);
  const href = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as unknown as [string, string][]);
    return `/app/builder/media${u.size ? `?${u}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / per));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-4">
        <Card className="p-4">
          <ActionForm action={uploadMediaAction} resetOnSuccess onSuccess={() => router.refresh()} className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
            <div className="md:col-span-4"><label className="label">{T("Files (up to 20, max 8 MB each)", "File (maks. 20, maks. 8 MB/file)")}</label><input type="file" name="files" multiple required accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon" className="block w-full text-[13px] file:mr-3 file:rounded-md file:border-0 file:bg-canvas file:px-3 file:py-1.5 file:text-[13px]" /></div>
            <div><label className="label">{T("Category", "Kategori")}</label><select name="category" className="input" defaultValue={sp.category || "general"}>{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
            <div><label className="label">{T("Folder", "Folder")}</label><input name="folder" list="media-folders" className="input" defaultValue={sp.folder} placeholder={T("optional", "opsional")} /></div>
            <div><label className="label">{T("Alt text", "Teks alt")}</label><input name="alt" className="input" placeholder={T("describe the image", "deskripsi gambar")} /></div>
            <SubmitButton><Upload className="h-4 w-4" />{T("Upload", "Unggah")}</SubmitButton>
          </ActionForm>
          <datalist id="media-folders">{folders.map((f) => <option key={f.folder} value={f.folder} />)}</datalist>
        </Card>
        <form className="flex flex-wrap items-center gap-2" action="/app/builder/media">
          <input name="q" defaultValue={sp.q} className="input w-56" placeholder={T("Search file name or alt…", "Cari nama file atau alt…")} />
          {sp.category && <input type="hidden" name="category" value={sp.category} />}{sp.folder && <input type="hidden" name="folder" value={sp.folder} />}
          <button className={buttonClass("outline", "sm")}>{T("Search", "Cari")}</button>
          <span className="ml-auto text-[13px] text-ink-500">{total} {T("files", "file")}</span>
        </form>
        <div className="flex flex-wrap gap-1.5">
          <a href={href({ category: undefined })} className={`rounded-full px-3 py-1 text-[12px] ${!sp.category ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>{T("All", "Semua")}</a>
          {counts.map((c) => <a key={c.category} href={href({ category: c.category })} className={`rounded-full px-3 py-1 text-[12px] ${sp.category === c.category ? "bg-ink text-white" : "bg-white ring-1 ring-line"}`}>{c.category} · {c.n}</a>)}
          {folders.length > 0 && <span className="mx-1 w-px bg-line" />}
          {folders.map((f) => <a key={f.folder} href={href({ folder: sp.folder === f.folder ? undefined : f.folder })} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[12px] ${sp.folder === f.folder ? "bg-sky-600 text-white" : "bg-white ring-1 ring-line"}`}><FolderOpen className="h-3 w-3" />{f.folder} · {f.n}</a>)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6" data-testid="media-grid">
          {items.map((m) => (
            <button key={m.id} type="button" onClick={() => setSel(m)} className={`card overflow-hidden text-left transition hover:shadow-pop ${sel?.id === m.id ? "ring-2 ring-sky-500" : ""}`}>
              <div className="aspect-square bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]"><img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-contain" /></div>
              <div className="p-2">
                <p className="truncate text-[12px] font-medium">{m.name}</p>
                <p className="flex flex-wrap gap-1 pt-1"><Badge className="px-1.5 text-[10px]">{m.category}</Badge>{m.demo && <Badge tone="amber" className="px-1.5 text-[10px]">demo</Badge>}{m.siteUses > 0 && <Badge tone="blue" className="px-1.5 text-[10px]">web</Badge>}{m.productUses > 0 && <Badge tone="green" className="px-1.5 text-[10px]">{m.productUses} prod</Badge>}</p>
              </div>
            </button>
          ))}
          {!items.length && <p className="col-span-full py-12 text-center text-sm text-ink-400">{T("No media found.", "Media tidak ditemukan.")}</p>}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            {page > 1 && <a className={buttonClass("outline", "sm")} href={href({ page: String(page - 1) })}>←</a>}
            <span>{page} / {pages}</span>
            {page < pages && <a className={buttonClass("outline", "sm")} href={href({ page: String(page + 1) })}>→</a>}
          </div>
        )}
      </div>
      <aside className="xl:sticky xl:top-6 xl:self-start">
        {sel ? (
          <Card key={sel.id}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3"><p className="truncate font-semibold">{sel.name}</p><button type="button" onClick={() => setSel(null)} aria-label="Close"><X className="h-4 w-4" /></button></div>
            <div className="space-y-4 p-4">
              <img src={sel.url} alt={sel.alt ?? ""} className="max-h-56 w-full rounded-lg bg-canvas object-contain" />
              <div className="text-[12px] text-ink-500">
                <p>{sel.mime} · {(sel.size / 1024).toFixed(0)} KB · {fmtDateTime(sel.created, lang)}{sel.uploader ? ` · ${sel.uploader}` : ""}</p>
                <p className="mt-1">{T("Used by", "Dipakai oleh")} {sel.productUses} {T("product image(s)", "foto produk")}, {sel.siteUses} {T("website draft element(s)", "elemen draf website")}</p>
                <button type="button" onClick={() => navigator.clipboard?.writeText(sel.url)} className="mt-1 flex items-center gap-1 font-mono text-sky-700 hover:underline"><Copy className="h-3 w-3" />{sel.url}</button>
              </div>
              <ActionForm action={mediaOpAction} onSuccess={() => router.refresh()} className="space-y-2">
                <input type="hidden" name="op" value="meta" /><input type="hidden" name="id" value={sel.id} />
                <div><label className="label">{T("Alt text", "Teks alt")}</label><input name="alt" defaultValue={sel.alt ?? ""} className="input" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="label">{T("Category", "Kategori")}</label><select name="category" defaultValue={sel.category} className="input">{CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
                  <div><label className="label">Folder</label><input name="folder" list="media-folders" defaultValue={sel.folder ?? ""} className="input" /></div>
                </div>
                <SubmitButton size="sm" variant="outline">{T("Save details", "Simpan detail")}</SubmitButton>
              </ActionForm>
              <ActionForm action={mediaOpAction} resetOnSuccess onSuccess={() => router.refresh()} className="space-y-2 border-t border-line pt-4">
                <input type="hidden" name="op" value="replace" /><input type="hidden" name="id" value={sel.id} />
                <label className="label">{T("Replace file (keeps all links)", "Ganti file (semua tautan tetap)")}</label>
                <input type="file" name="file" required accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon" className="block w-full text-[13px]" />
                <SubmitButton size="sm" variant="outline"><Replace className="h-4 w-4" />{T("Replace", "Ganti")}</SubmitButton>
              </ActionForm>
              <ActionForm action={mediaOpAction} onSuccess={() => { setSel(null); router.refresh(); }} className="border-t border-line pt-4">
                <input type="hidden" name="op" value="delete" /><input type="hidden" name="id" value={sel.id} />
                <ConfirmButton size="sm" title={T("Delete this file?", "Hapus file ini?")} body={T("Files used by products, collections or the website cannot be deleted.", "File yang dipakai produk, koleksi atau website tidak dapat dihapus.")} confirmLabel={T("Delete", "Hapus")} cancelLabel={T("Cancel", "Batal")}><Trash2 className="h-4 w-4" />{T("Delete file", "Hapus file")}</ConfirmButton>
              </ActionForm>
            </div>
          </Card>
        ) : <Card className="p-6 text-center text-sm text-ink-400">{T("Select a file to edit, replace or delete it.", "Pilih file untuk mengedit, mengganti atau menghapusnya.")}</Card>}
      </aside>
    </div>
  );
}

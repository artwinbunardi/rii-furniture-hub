"use client";
import * as React from "react";
import { useState } from "react";
import { Copy, Eye, Home, MousePointerSquareDashed, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { pageAction } from "../actions";
import { ActionForm, SubmitButton, ConfirmButton } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/misc";
import { buttonClass } from "@/components/ui/button";

type P = { slug: string; title: string; type: string; isHome: boolean; isSystem: boolean; seoTitle: string; seoDescription: string; url: string; sections: number; hidden: number };

export function PagesManager({ pages, rev, lang }: { pages: P[]; rev: number; lang: "id" | "en" }) {
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const [open, setOpen] = useState<string | null>(null);
  const Hidden = ({ op, slug }: { op: string; slug?: string }) => <><input type="hidden" name="op" value={op} /><input type="hidden" name="rev" value={rev} />{slug !== undefined && <input type="hidden" name="slug" value={slug} />}</>;
  const custom = pages.filter((p) => p.type === "custom"), system = pages.filter((p) => p.type !== "custom");
  const row = (p: P) => {
    const key = p.slug || "__home";
    const editUrl = `/app/builder/editor?page=${encodeURIComponent(p.url.slice(1).replace(/:\w+/, "_"))}`;
    return (
      <li key={key} className="px-5 py-3" data-page={p.url}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-medium">{p.title}{p.isHome && <Badge tone="slate"><Home className="h-3 w-3" />{T("Homepage", "Beranda")}</Badge>}{p.isSystem && !p.isHome && <Badge>{T("system", "sistem")}</Badge>}</p>
            <p className="font-mono text-[12px] text-ink-400">{p.url} · {p.sections} {T("sections", "bagian")}{p.hidden ? ` (${p.hidden} ${T("hidden", "tersembunyi")})` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <a href={editUrl} className={buttonClass("outline", "sm")}><MousePointerSquareDashed className="h-4 w-4" />{T("Edit design", "Edit desain")}</a>
            {!p.url.includes(":") && <a href={`/preview/draft${p.url === "/" ? "" : p.url}`} target="_blank" className={buttonClass("ghost", "sm")} title={T("Preview draft", "Pratinjau draf")}><Eye className="h-4 w-4" /></a>}
            <button type="button" onClick={() => setOpen(open === key ? null : key)} className={buttonClass("ghost", "sm")} aria-expanded={open === key}><Pencil className="h-4 w-4" />{T("Settings", "Pengaturan")}</button>
          </div>
        </div>
        {open === key && (
          <div className="mt-3 grid gap-4 rounded-xl bg-canvas/60 p-4 lg:grid-cols-2">
            <ActionForm action={pageAction} className="space-y-2">
              <Hidden op="rename" slug={p.slug} />
              <label className="label">{T("Page name", "Nama halaman")}</label>
              <div className="flex gap-2"><input name="title" defaultValue={p.title} className="input" required minLength={2} /><SubmitButton size="sm" variant="outline">{T("Rename", "Ganti nama")}</SubmitButton></div>
            </ActionForm>
            {!p.isSystem && (
              <ActionForm action={pageAction} className="space-y-2">
                <Hidden op="slug" slug={p.slug} />
                <label className="label">{T("URL slug", "Slug URL")}</label>
                <div className="flex items-center gap-2"><span className="font-mono text-sm text-ink-400">/</span><input name="new_slug" defaultValue={p.slug} className="input font-mono" required pattern="[a-z0-9\-/]+" /><SubmitButton size="sm" variant="outline">{T("Change URL", "Ubah URL")}</SubmitButton></div>
              </ActionForm>
            )}
            <ActionForm action={pageAction} className="space-y-2 lg:col-span-2">
              <Hidden op="seo" slug={p.slug} />
              <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Search className="h-4 w-4" />SEO</p>
              <input name="seo_title" defaultValue={p.seoTitle} maxLength={120} className="input" placeholder={T("SEO title (defaults to the page name)", "Judul SEO (bawaan: nama halaman)")} />
              <textarea name="seo_description" defaultValue={p.seoDescription} maxLength={320} className="input min-h-[70px]" placeholder={T("Meta description", "Deskripsi meta")} />
              <SubmitButton size="sm" variant="outline">{T("Save SEO", "Simpan SEO")}</SubmitButton>
            </ActionForm>
            <div className="flex flex-wrap gap-2 lg:col-span-2">
              <ActionForm action={pageAction} showMessages><Hidden op="duplicate" slug={p.slug} /><SubmitButton size="sm" variant="outline"><Copy className="h-4 w-4" />{T("Duplicate", "Duplikat")}</SubmitButton></ActionForm>
              {p.type === "custom" && (
                <ActionForm action={pageAction}><Hidden op="set_home" slug={p.slug} />
                  <ConfirmButton variant="outline" size="sm" title={T("Make this the homepage?", "Jadikan beranda?")} body={T("This page's content moves to “/”, and the current homepage content moves to this page's URL.", "Konten halaman ini pindah ke “/”, dan konten beranda saat ini pindah ke URL halaman ini.")} confirmLabel={T("Set as homepage", "Jadikan beranda")} cancelLabel={T("Cancel", "Batal")}><Home className="h-4 w-4" />{T("Set as homepage", "Jadikan beranda")}</ConfirmButton>
                </ActionForm>
              )}
              {!p.isSystem && (
                <ActionForm action={pageAction}><Hidden op="delete" slug={p.slug} />
                  <ConfirmButton size="sm" title={T(`Delete “${p.title}”?`, `Hapus “${p.title}”?`)} body={T("The page and its menu links are removed from the draft. The live site keeps it until you publish.", "Halaman dan tautan menunya dihapus dari draf. Website live tetap menampilkannya sampai Anda mempublikasikan.")} confirmLabel={T("Delete page", "Hapus halaman")} cancelLabel={T("Cancel", "Batal")}><Trash2 className="h-4 w-4" />{T("Delete", "Hapus")}</ConfirmButton>
                </ActionForm>
              )}
            </div>
          </div>
        )}
      </li>
    );
  };
  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="mb-3 flex items-center gap-2 font-semibold"><Plus className="h-4 w-4" />{T("New page", "Halaman baru")}</p>
        <ActionForm action={pageAction} resetOnSuccess className="grid gap-3 md:grid-cols-[1fr_1fr_200px_auto] md:items-end">
          <Hidden op="create" />
          <div><label className="label">{T("Title", "Judul")}</label><input name="title" className="input" required minLength={2} placeholder={T("e.g. Wedding packages", "mis. Paket pernikahan")} /></div>
          <div><label className="label">{T("URL slug (optional)", "Slug URL (opsional)")}</label><input name="new_slug" className="input font-mono" pattern="[a-z0-9\-]*" placeholder="paket-pernikahan" /></div>
          <div><label className="label">{T("Start from", "Mulai dari")}</label>
            <select name="starter" className="input"><option value="landing">{T("Landing page", "Halaman landing")}</option><option value="faq">FAQ</option><option value="blank">{T("Blank text page", "Halaman teks kosong")}</option></select></div>
          <SubmitButton>{T("Create page", "Buat halaman")}</SubmitButton>
        </ActionForm>
      </Card>
      <Card>
        <p className="border-b border-line px-5 py-3 font-semibold">{T("Your pages", "Halaman Anda")} <span className="font-normal text-ink-400">({custom.length})</span></p>
        <ul className="divide-y divide-line">{custom.length ? custom.map(row) : <li className="px-5 py-6 text-sm text-ink-400">{T("No custom pages yet.", "Belum ada halaman kustom.")}</li>}</ul>
      </Card>
      <Card>
        <p className="border-b border-line px-5 py-3 font-semibold">{T("System pages", "Halaman sistem")} <span className="font-normal text-ink-400">({system.length})</span></p>
        <ul className="divide-y divide-line">{system.map(row)}</ul>
      </Card>
    </div>
  );
}

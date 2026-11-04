"use client";
import * as React from "react";
import { useMemo, useState, useTransition } from "react";
import { Check, Expand, Eye, Loader2, Monitor, Search, Smartphone, X } from "lucide-react";
import { applyTemplateAction } from "../actions";
import { buttonClass } from "@/components/ui/button";

type Tpl = { id: string; name: string; category: string; description: string };

export function TemplateLibrary({ lang, templates, categories, activeId, initialUse, initialCategory }: {
  lang: "id" | "en"; templates: Tpl[]; categories: { id: string; name: string }[]; activeId: string | null; initialUse?: string; initialCategory?: string;
}) {
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(initialCategory ?? "");
  const [preview, setPreview] = useState<Tpl | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [confirm, setConfirm] = useState<Tpl | null>(() => templates.find((t) => t.id === initialUse) ?? null);
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;
  const list = useMemo(() => templates.filter((t) => (!cat || t.category === cat) && (!q || `${t.name} ${t.description} ${catName(t.category)}`.toLowerCase().includes(q.toLowerCase()))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [templates, cat, q]);
  return (
    <>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-300" />
          <input className="input pl-9" placeholder={T("Search templates…", "Cari template…")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={T("Search templates", "Cari template")} />
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          <button type="button" onClick={() => setCat("")} className={`rounded-full px-3 py-1 text-[13px] ${!cat ? "bg-ink text-white" : "bg-white text-ink-500 ring-1 ring-line hover:text-ink"}`}>{T("All", "Semua")} · {templates.length}</button>
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => setCat(c.id)} className={`rounded-full px-3 py-1 text-[13px] ${cat === c.id ? "bg-ink text-white" : "bg-white text-ink-500 ring-1 ring-line hover:text-ink"}`}>{c.name}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3" data-testid="template-grid">
        {list.map((t) => (
          <article key={t.id} className="card group overflow-hidden" data-template={t.id}>
            <button type="button" onClick={() => setPreview(t)} className="relative block aspect-[16/10] w-full overflow-hidden bg-canvas" aria-label={`${T("Preview", "Pratinjau")} ${t.name}`}>
              <img src={`/template-thumbs/${t.id}.jpg`} alt="" loading="lazy" className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-[1.02]" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100"><span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium"><Eye className="h-4 w-4" />{T("Preview", "Pratinjau")}</span></span>
              {t.id === activeId && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[12px] font-medium text-white"><Check className="h-3.5 w-3.5" />{T("In your draft", "Dipakai di draf")}</span>}
            </button>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div><h3 className="font-semibold">{t.name}</h3><p className="text-[12px] text-ink-400">{catName(t.category)}</p></div>
              </div>
              <p className="mt-2 line-clamp-2 min-h-[40px] text-[13px] text-ink-500">{t.description}</p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => setPreview(t)} className={buttonClass("outline", "sm")}><Eye className="h-4 w-4" />{T("Preview", "Pratinjau")}</button>
                <button type="button" onClick={() => setConfirm(t)} className={buttonClass("primary", "sm")}>{T("Use This Template", "Gunakan Template Ini")}</button>
              </div>
            </div>
          </article>
        ))}
        {!list.length && <p className="col-span-full py-16 text-center text-sm text-ink-400">{T("No templates match your search.", "Tidak ada template yang cocok.")}</p>}
      </div>

      {preview && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/60 p-3 md:p-6" onClick={() => setPreview(null)}>
          <div className="mx-auto flex h-full w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl bg-[#ececef] shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={preview.name}>
            <div className="flex flex-wrap items-center gap-3 border-b border-line bg-white px-4 py-2.5">
              <div className="min-w-0"><p className="font-semibold">{preview.name}</p><p className="text-[12px] text-ink-400">{catName(preview.category)}</p></div>
              <div className="mx-auto flex gap-0.5 rounded-lg bg-canvas p-0.5">
                <button type="button" onClick={() => setDevice("desktop")} aria-pressed={device === "desktop"} className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] ${device === "desktop" ? "bg-white shadow-sm" : "text-ink-500"}`}><Monitor className="h-4 w-4" />Desktop</button>
                <button type="button" onClick={() => setDevice("mobile")} aria-pressed={device === "mobile"} className={`flex h-7 items-center gap-1 rounded-md px-2.5 text-[12px] ${device === "mobile" ? "bg-white shadow-sm" : "text-ink-500"}`}><Smartphone className="h-4 w-4" />Mobile</button>
              </div>
              <a href={`/preview/template/${preview.id}`} target="_blank" className={buttonClass("outline", "sm")}><Expand className="h-4 w-4" />{T("Fullscreen", "Layar penuh")}</a>
              <button type="button" onClick={() => { setConfirm(preview); setPreview(null); }} className={buttonClass("primary", "sm")}>{T("Use This Template", "Gunakan Template Ini")}</button>
              <button type="button" onClick={() => setPreview(null)} className="rounded-md p-1.5 hover:bg-canvas" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex min-h-0 flex-1 justify-center overflow-hidden p-4">
              <iframe key={preview.id} src={`/preview/template/${preview.id}?embed=1`} title={preview.name} className="h-full rounded-lg bg-white shadow-lg transition-[width]" style={{ width: device === "mobile" ? 390 : "100%" }} />
            </div>
          </div>
        </div>
      )}
      {confirm && <ApplyDialog t={confirm} T={T} onClose={() => setConfirm(null)} />}
    </>
  );
}

function ApplyDialog({ t, T, onClose }: { t: Tpl; T: (a: string, b: string) => string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [keepPages, setKeepPages] = useState(true);
  const [keepBranding, setKeepBranding] = useState(true);
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={T("Apply template", "Terapkan template")} className="w-[min(480px,100%)] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-semibold">{T(`Use “${t.name}”?`, `Gunakan “${t.name}”?`)}</h3>
          <p className="mt-1.5 text-sm text-ink-500">{T("The draft's design, home page and system pages are replaced by this template. The live website does not change until you publish, and earlier published versions can always be restored.", "Desain, beranda dan halaman sistem di draf diganti dengan template ini. Website live tidak berubah sampai Anda mempublikasikan, dan versi yang pernah dipublikasikan selalu dapat dipulihkan.")}</p>
          <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={keepPages} onChange={(e) => setKeepPages(e.target.checked)} />{T("Keep my custom pages", "Pertahankan halaman kustom saya")}</label>
          <label className="mt-2 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={keepBranding} onChange={(e) => setKeepBranding(e.target.checked)} />{T("Keep my logo, favicon and contact details", "Pertahankan logo, favicon dan detail kontak saya")}</label>
          {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
          <button type="button" onClick={onClose} className={buttonClass("outline")}>{T("Cancel", "Batal")}</button>
          <button type="button" disabled={pending} className={buttonClass("primary")} onClick={() => {
            const fd = new FormData(); fd.set("id", t.id); if (keepPages) fd.set("keep_pages", "on"); if (keepBranding) fd.set("keep_branding", "on");
            start(async () => {
              const r = await applyTemplateAction(null, fd);
              if (!r?.ok) setErr(r?.error ?? "Error");
              else window.location.href = "/app/builder/editor"; // full load: the editor uses its own shell
            });
          }}>{pending && <Loader2 className="h-4 w-4 animate-spin" />}{T("Apply to draft & open editor", "Terapkan ke draf & buka editor")}</button>
        </div>
      </div>
    </div>
  );
}

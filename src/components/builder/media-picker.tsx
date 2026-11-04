"use client";
import * as React from "react";
import { useRef, useState, useTransition } from "react";
import { Loader2, Search, Upload, X } from "lucide-react";
import { uploadMediaAction } from "@/app/app/builder/actions";

export type MediaItem = { id: string; url: string; name: string; category: string; folder: string | null; alt: string | null };

/** Modal listing the media library; supports search, category filter and uploading new files in place. */
export function MediaPicker({ open, items, onClose, onPick, onUploaded, lang, canUpload }: {
  open: boolean; items: MediaItem[]; onClose: () => void; onPick: (url: string) => void; onUploaded: (items: MediaItem[]) => void; lang: "id" | "en"; canUpload: boolean;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const en = lang === "en";
  if (!open) return null;
  const list = items.filter((m) => (!cat || m.category === cat) && (!q || `${m.name} ${m.alt ?? ""} ${m.folder ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const upload = (files: FileList | null) => {
    if (!files?.length) return;
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    fd.set("category", cat || "general");
    setErr(null);
    start(async () => {
      const r = await uploadMediaAction(null, fd);
      if (!r?.ok) { setErr(r?.error ?? "Upload failed"); return; }
      const added = (r.data?.items as { id: string; url: string; name: string }[]).map((x) => ({ ...x, category: cat || "general", folder: null, alt: null }));
      onUploaded(added);
      if (added.length === 1) onPick(added[0].url);
    });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[86vh] w-[min(960px,100%)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={en ? "Media library" : "Pustaka media"}>
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <p className="font-semibold">{en ? "Media library" : "Pustaka media"}</p>
          <div className="relative ml-auto w-56"><Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-ink-300" />
            <input className="w-full rounded-md border border-line py-1.5 pl-8 pr-2 text-[13px]" placeholder={en ? "Search…" : "Cari…"} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} /></div>
          <select className="rounded-md border border-line px-2 py-1.5 text-[13px]" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">{en ? "All categories" : "Semua kategori"}</option>
            {["banner", "product", "gallery", "logo", "favicon", "general"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {canUpload && <>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={pending} className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-60">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{en ? "Upload" : "Unggah"}
            </button>
          </>}
          <button type="button" onClick={onClose} className="rounded-md p-1.5 hover:bg-canvas" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {err && <p className="border-b border-red-200 bg-red-50 px-5 py-2 text-[13px] text-red-700">{err}</p>}
        <div className="grid flex-1 grid-cols-3 gap-3 overflow-y-auto p-5 sm:grid-cols-4 lg:grid-cols-6">
          {list.map((m) => (
            <button key={m.id} type="button" onClick={() => onPick(m.url)} className="group overflow-hidden rounded-lg border border-line text-left hover:border-sky-500 hover:ring-2 hover:ring-sky-100">
              <div className="aspect-square bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]"><img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-contain" /></div>
              <p className="truncate px-2 py-1 text-[11px] text-ink-500">{m.name}</p>
            </button>
          ))}
          {!list.length && <p className="col-span-full py-10 text-center text-sm text-ink-400">{en ? "No media found." : "Media tidak ditemukan."}</p>}
        </div>
      </div>
    </div>
  );
}

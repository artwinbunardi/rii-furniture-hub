"use client";
import * as React from "react";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { navigationAction } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardHeader } from "@/components/ui/misc";
import type { FooterConfig, HeaderConfig, NavLink } from "@/lib/site/types";

export function NavigationForm({ lang, rev, nav, header, footer, pages }: { lang: "id" | "en"; rev: number; nav: NavLink[]; header: HeaderConfig; footer: FooterConfig; pages: { title: string; href: string }[] }) {
  const T = (a: string, b: string) => (lang === "en" ? a : b);
  const [rows, setRows] = useState(nav.map((n, i) => ({ ...n, k: i })));
  const [k, setK] = useState(nav.length);
  const move = (i: number, d: number) => setRows((r) => { const n = [...r]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); return n; });
  return (
    <ActionForm action={navigationAction} className="space-y-6">
      <input type="hidden" name="rev" value={rev} />
      <datalist id="page-links">{pages.map((p) => <option key={p.href} value={p.href}>{p.title}</option>)}</datalist>
      <Card>
        <CardHeader title={T("Menu links", "Tautan menu")} subtitle={T("Shown in the header and footer of every page.", "Tampil di header dan footer setiap halaman.")} />
        <div className="space-y-2 p-5">
          {rows.map((r, i) => (
            <div key={r.k} className="flex items-center gap-2" data-nav-row>
              <input name="nav_label" defaultValue={r.label} className="input" placeholder={T("Label", "Label")} aria-label={T("Label", "Label")} />
              <input name="nav_href" defaultValue={r.href} list="page-links" className="input font-mono" placeholder="/products" aria-label={T("Destination", "Tujuan")} />
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1.5 hover:bg-canvas disabled:opacity-30" aria-label="Up"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-1.5 hover:bg-canvas disabled:opacity-30" aria-label="Down"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => setRows((x) => x.filter((_, j) => j !== i))} className="rounded p-1.5 hover:bg-red-50 hover:text-red-600" aria-label={T("Remove", "Hapus")}><X className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => { setRows((x) => [...x, { label: "", href: "", k }]); setK(k + 1); }} className="flex items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-[13px] text-ink-500 hover:border-ink-300"><Plus className="h-4 w-4" />{T("Add link", "Tambah tautan")}</button>
          <p className="text-[12px] text-ink-400">{T("Internal paths start with “/”. External links (https://…) open in a new tab. Unsafe links are rejected.", "Path internal diawali “/”. Tautan eksternal (https://…) terbuka di tab baru. Tautan tidak aman ditolak.")}</p>
        </div>
      </Card>
      <Card>
        <CardHeader title={T("Header", "Header")} />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div><label className="label">{T("Header button label", "Label tombol header")}</label><input name="ctaLabel" defaultValue={header.ctaLabel} className="input" /></div>
          <div><label className="label">{T("Header button destination", "Tujuan tombol header")}</label><input name="ctaHref" defaultValue={header.ctaHref} list="page-links" className="input font-mono" /></div>
          <div className="md:col-span-2"><label className="label">{T("Announcement bar (empty = hidden)", "Bilah pengumuman (kosong = disembunyikan)")}</label><input name="announcement" defaultValue={header.announcement} className="input" /></div>
        </div>
      </Card>
      <Card>
        <CardHeader title="Footer" />
        <div className="grid gap-4 p-5 md:grid-cols-2">
          <div className="md:col-span-2"><label className="label">Tagline</label><textarea name="tagline" defaultValue={footer.tagline} className="input min-h-[60px]" /></div>
          <div><label className="label">{T("Address", "Alamat")}</label><input name="address" defaultValue={footer.address} className="input" /></div>
          <div><label className="label">Email</label><input name="email" defaultValue={footer.email} className="input" /></div>
          <div><label className="label">{T("Phone", "Telepon")}</label><input name="phone" defaultValue={footer.phone} className="input" /></div>
          <div><label className="label">Copyright</label><input name="copyright" defaultValue={footer.copyright} className="input" /></div>
        </div>
      </Card>
      <SubmitButton>{T("Save to draft", "Simpan ke draf")}</SubmitButton>
    </ActionForm>
  );
}

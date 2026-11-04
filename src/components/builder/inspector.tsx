"use client";
import * as React from "react";
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2, X } from "lucide-react";
import type { Field } from "@/lib/site/registry";
import { SECTION_MAP } from "@/lib/site/registry";
import type { Section, SectionStyle, SiteSnapshot } from "@/lib/site/types";
import { lbl } from "./labels";

export type Ctx = {
  lang: "id" | "en";
  pickImage: (cb: (url: string) => void) => void;
  links: [string, string][]; // [href, label] internal destinations
  categories: { slug: string; name: string }[];
  collections: { slug: string; name: string }[];
};

const en = (c: Ctx) => c.lang === "en";
export const Label = ({ children }: { children: React.ReactNode }) => <label className="mb-1 block text-[12px] font-medium text-ink-500">{children}</label>;
export const inputCls = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100";

/** Text input that only commits on blur/Enter-free typing pauses, so each keystroke doesn't flood undo history. */
export function TextIn({ value, onChange, multiline, placeholder, mono }: { value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string; mono?: boolean }) {
  const cls = `${inputCls} ${mono ? "font-mono text-[12px]" : ""}`;
  return multiline
    ? <textarea className={`${cls} min-h-[72px] resize-y`} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    : <input className={cls} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

export function ImageIn({ value, onChange, ctx }: { value: string; onChange: (v: string) => void; ctx: Ctx }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => ctx.pickImage(onChange)} className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-canvas hover:border-sky-400" title={en(ctx) ? "Choose from media library" : "Pilih dari pustaka media"}>
        {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-ink-300" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <button type="button" onClick={() => ctx.pickImage(onChange)} className="text-[12px] font-medium text-sky-700 hover:underline">{value ? (en(ctx) ? "Replace image" : "Ganti gambar") : (en(ctx) ? "Choose image" : "Pilih gambar")}</button>
        {value && <button type="button" onClick={() => onChange("")} className="ml-3 text-[12px] text-ink-400 hover:text-red-600">{en(ctx) ? "Remove" : "Hapus"}</button>}
        <p className="truncate font-mono text-[10px] text-ink-400">{value || "—"}</p>
      </div>
    </div>
  );
}

export function LinkIn({ value, onChange, ctx }: { value: string; onChange: (v: string) => void; ctx: Ctx }) {
  const known = ctx.links.some(([h]) => h === value);
  return (
    <div className="space-y-1">
      <select className={inputCls} value={known ? value : "__custom"} onChange={(e) => e.target.value !== "__custom" && onChange(e.target.value)}>
        {ctx.links.map(([h, l]) => <option key={h} value={h}>{l} ({h})</option>)}
        <option value="__custom">{en(ctx) ? "Custom URL…" : "URL kustom…"}</option>
      </select>
      {!known && <TextIn value={value} onChange={onChange} placeholder="/products?category=… atau https://…" mono />}
    </div>
  );
}

function FieldIn({ f, value, onChange, ctx }: { f: Field; value: any; onChange: (v: any) => void; ctx: Ctx }) {
  switch (f.type) {
    case "text": return <TextIn value={value} onChange={onChange} />;
    case "textarea": return <TextIn value={value} onChange={onChange} multiline />;
    case "image": return <ImageIn value={value} onChange={onChange} ctx={ctx} />;
    case "link": return <LinkIn value={value ?? ""} onChange={onChange} ctx={ctx} />;
    case "number": return <input type="number" className={inputCls} min={f.min} max={f.max} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
    case "toggle": return <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />{en(ctx) ? "Enabled" : "Aktif"}</label>;
    case "select": return <select className={inputCls} value={String(value ?? "")} onChange={(e) => onChange(f.key === "columns" ? Number(e.target.value) : e.target.value)}>{f.options!.map(([v, l]) => <option key={v} value={v}>{lbl(ctx.lang, l)}</option>)}</select>;
    case "collection": return <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{ctx.collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>;
    case "category": return <select className={inputCls} value={value ?? ""} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{ctx.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>;
    case "skus": return <TextIn value={Array.isArray(value) ? value.join(", ") : value ?? ""} onChange={(v) => onChange(v.split(/[,\s]+/).map((x) => x.trim().toUpperCase()).filter(Boolean))} placeholder="SOF-001, CHR-002" mono />;
    case "items": return <ItemsIn f={f} value={Array.isArray(value) ? value : []} onChange={onChange} ctx={ctx} />;
  }
}

function ItemsIn({ f, value, onChange, ctx }: { f: Field; value: any[]; onChange: (v: any[]) => void; ctx: Ctx }) {
  const scalar = f.itemFields?.length === 1 && f.itemFields[0].key === "_";
  const blank = scalar ? "" : Object.fromEntries((f.itemFields ?? []).map((x) => [x.key, ""]));
  const set = (i: number, v: any) => onChange(value.map((x, j) => (j === i ? v : x)));
  const move = (i: number, d: number) => { const n = [...value]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); onChange(n); };
  return (
    <div className="space-y-2">
      {value.map((item, i) => (
        <div key={i} className="rounded-lg border border-line bg-canvas/50 p-2">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-ink-400">
            <span>#{i + 1}</span>
            <span className="flex gap-0.5">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 hover:bg-white disabled:opacity-30"><ArrowUp className="h-3 w-3" /></button>
              <button type="button" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="rounded p-1 hover:bg-white disabled:opacity-30"><ArrowDown className="h-3 w-3" /></button>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded p-1 hover:bg-white hover:text-red-600" aria-label="Remove"><X className="h-3 w-3" /></button>
            </span>
          </div>
          {scalar ? <ImageIn value={item} onChange={(v) => set(i, v)} ctx={ctx} /> : (
            <div className="space-y-2">
              {f.itemFields!.filter((x) => x.key !== "value" || item.source === "custom" || item.source === undefined).map((x) => (
                <div key={x.key}><Label>{lbl(ctx.lang, x.label)}</Label><FieldIn f={x} value={item[x.key]} onChange={(v) => set(i, { ...item, [x.key]: v })} ctx={ctx} /></div>
              ))}
            </div>
          )}
        </div>
      ))}
      {value.length < 24 && <button type="button" onClick={() => onChange([...value, structuredClone(blank)])} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-[12px] font-medium text-ink-500 hover:border-sky-400 hover:text-sky-700"><Plus className="h-3.5 w-3.5" />{en(ctx) ? "Add item" : "Tambah item"}</button>}
    </div>
  );
}

/** Fields that only make sense for some variants or sources are hidden otherwise. */
function visible(s: Section, f: Field) {
  const src = s.props.source;
  if (f.key === "collection") return src === "collection";
  if (f.key === "category") return src === "category";
  if (f.key === "skus") return src === "manual";
  if (s.type === "hero" && (f.key === "image2" || f.key === "image3")) return s.variant === "collage";
  return true;
}

export function SectionInspector({ s, ctx, onChange, onAction }: { s: Section; ctx: Ctx; onChange: (next: Section, key?: string) => void; onAction: (op: "duplicate" | "toggle" | "delete") => void }) {
  const meta = SECTION_MAP[s.type];
  const [tab, setTab] = React.useState<"content" | "style">("content");
  if (!meta) return null;
  const setProp = (k: string, v: any) => onChange({ ...s, props: { ...s.props, [k]: v } }, `p:${s.id}:${k}`);
  const setStyle = (k: keyof SectionStyle, v: any) => onChange({ ...s, style: { ...s.style, [k]: v === "" || v === undefined ? undefined : v } }, `s:${s.id}:${k}`);
  const E = en(ctx);
  return (
    <div>
      <div className="border-b border-line px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{E ? "Section" : "Bagian"}</p>
        <p className="text-[15px] font-semibold text-ink">{lbl(ctx.lang, meta.label)}</p>
        {meta.functional && <p className="mt-1 text-[12px] text-ink-500">{E ? "Functional section: shows live data for this system page. It can be styled and hidden, not deleted." : "Bagian fungsional: menampilkan data live halaman sistem ini. Dapat diatur gayanya dan disembunyikan, tidak dapat dihapus."}</p>}
        <div className="mt-3 flex gap-1.5">
          {!meta.functional && <button type="button" onClick={() => onAction("duplicate")} className="rounded-md border border-line px-2 py-1 text-[12px] hover:bg-canvas">{E ? "Duplicate" : "Duplikat"}</button>}
          <button type="button" onClick={() => onAction("toggle")} className="rounded-md border border-line px-2 py-1 text-[12px] hover:bg-canvas">{s.hidden ? (E ? "Show" : "Tampilkan") : (E ? "Hide" : "Sembunyikan")}</button>
          {!meta.functional && <button type="button" onClick={() => onAction("delete")} className="flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-[12px] text-red-700 hover:bg-red-50"><Trash2 className="h-3 w-3" />{E ? "Delete" : "Hapus"}</button>}
        </div>
      </div>
      <div className="flex border-b border-line px-2">
        {(["content", "style"] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`px-3 py-2 text-[13px] font-medium ${tab === t ? "border-b-2 border-ink text-ink" : "text-ink-400 hover:text-ink"}`}>
            {t === "content" ? (E ? "Content" : "Konten") : (E ? "Style" : "Gaya")}
          </button>
        ))}
      </div>
      {tab === "content" ? (
        <div className="space-y-4 p-4">
          {meta.variants.length > 1 && (
            <div>
              <Label>{E ? "Layout variant" : "Varian tata letak"}</Label>
              <div className="grid grid-cols-2 gap-1.5">
                {meta.variants.map(([v, l]) => (
                  <button key={v} type="button" onClick={() => onChange({ ...s, variant: v })}
                    className={`rounded-md border px-2 py-1.5 text-left text-[12px] ${s.variant === v ? "border-sky-500 bg-sky-50 font-medium text-sky-800" : "border-line hover:bg-canvas"}`}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {meta.fields.filter((f) => visible(s, f)).map((f) => (
            <div key={f.key}><Label>{lbl(ctx.lang, f.label)}</Label><FieldIn f={f} value={s.props[f.key]} onChange={(v) => setProp(f.key, v)} ctx={ctx} /></div>
          ))}
          {!meta.fields.length && <p className="text-[13px] text-ink-500">{E ? "This section has no content fields; it renders live data." : "Bagian ini tidak memiliki isian konten; menampilkan data live."}</p>}
          {s.type === "stats" && <p className="rounded-md bg-sky-50 px-2.5 py-2 text-[12px] text-sky-900">{E ? "Live sources are computed from the inventory database on every page view." : "Sumber live dihitung dari database inventaris setiap kali halaman dibuka."}</p>}
        </div>
      ) : <StyleIn s={s} setStyle={setStyle} ctx={ctx} />}
    </div>
  );
}

function Num({ label, value, onChange, max = 240, step = 4 }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; max?: number; step?: number }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="range" min={0} max={max} step={step} value={value ?? 0} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-sky-600" />
        <input type="number" min={0} max={max} value={value ?? ""} placeholder="auto" onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className={`${inputCls} w-16 px-1.5`} />
      </div>
    </div>
  );
}

export function ColorIn({ label, value, onChange, allowEmpty }: { label: string; value: string | undefined; onChange: (v: string) => void; allowEmpty?: boolean }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#ffffff"} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-line bg-white p-0.5" />
        <input className={`${inputCls} font-mono text-[12px]`} value={value ?? ""} placeholder={allowEmpty ? "theme" : ""} onChange={(e) => onChange(e.target.value)} />
        {allowEmpty && value && <button type="button" onClick={() => onChange("")} className="text-ink-400 hover:text-ink" title="Reset"><X className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

function StyleIn({ s, setStyle, ctx }: { s: Section; setStyle: (k: keyof SectionStyle, v: any) => void; ctx: Ctx }) {
  const st = s.style ?? {};
  const E = en(ctx);
  return (
    <div className="space-y-4 p-4">
      <ColorIn label={E ? "Background color" : "Warna latar"} value={st.bg} onChange={(v) => setStyle("bg", v)} allowEmpty />
      <ColorIn label={E ? "Text color" : "Warna teks"} value={st.text} onChange={(v) => setStyle("text", v)} allowEmpty />
      <div>
        <Label>{E ? "Alignment" : "Perataan"}</Label>
        <div className="grid grid-cols-4 gap-1">
          {[["", E ? "Auto" : "Auto"], ["left", E ? "Left" : "Kiri"], ["center", E ? "Center" : "Tengah"], ["right", E ? "Right" : "Kanan"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setStyle("align", v)} className={`rounded-md border py-1 text-[12px] ${(st.align ?? "") === v ? "border-sky-500 bg-sky-50 text-sky-800" : "border-line"}`}>{l}</button>
          ))}
        </div>
      </div>
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{E ? "Typography" : "Tipografi"}</p>
      <Num label={E ? "Heading size (px)" : "Ukuran judul (px)"} value={st.fontSize} onChange={(v) => setStyle("fontSize", v || undefined)} max={120} step={1} />
      <div>
        <Label>{E ? "Heading weight" : "Ketebalan judul"}</Label>
        <select className={inputCls} value={st.fontWeight ?? ""} onChange={(e) => setStyle("fontWeight", e.target.value ? Number(e.target.value) : undefined)}>
          <option value="">{E ? "Theme default" : "Bawaan tema"}</option>{[300, 400, 500, 600, 700, 800].map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{E ? "Spacing" : "Jarak"}</p>
      <Num label={E ? "Padding top" : "Padding atas"} value={st.paddingTop} onChange={(v) => setStyle("paddingTop", v)} />
      <Num label={E ? "Padding bottom" : "Padding bawah"} value={st.paddingBottom} onChange={(v) => setStyle("paddingBottom", v)} />
      <Num label={E ? "Padding sides" : "Padding samping"} value={st.paddingX} onChange={(v) => setStyle("paddingX", v)} max={160} />
      <Num label={E ? "Margin top" : "Margin atas"} value={st.marginTop} onChange={(v) => setStyle("marginTop", v)} max={160} />
      <Num label={E ? "Margin bottom" : "Margin bawah"} value={st.marginBottom} onChange={(v) => setStyle("marginBottom", v)} max={160} />
      <Num label={E ? "Corner radius" : "Radius sudut"} value={st.radius} onChange={(v) => setStyle("radius", v)} max={48} step={1} />
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{E ? "Visibility" : "Visibilitas"}</p>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!st.hideDesktop} onChange={(e) => setStyle("hideDesktop", e.target.checked || undefined)} />{E ? "Hide on desktop" : "Sembunyikan di desktop"}</label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!st.hideMobile} onChange={(e) => setStyle("hideMobile", e.target.checked || undefined)} />{E ? "Hide on mobile" : "Sembunyikan di mobile"}</label>
    </div>
  );
}

const HEADER_VARIANTS = ["classic", "centered", "split", "minimal", "bold", "transparent", "stacked"];
const FOOTER_VARIANTS = ["columns", "minimal", "bigtype", "centered", "split"];

export function HeaderInspector({ snap, ctx, update }: { snap: SiteSnapshot; ctx: Ctx; update: (fn: (s: SiteSnapshot) => void, key?: string) => void }) {
  const E = en(ctx);
  const h = snap.header;
  return (
    <div className="space-y-4 p-4">
      <p className="text-[15px] font-semibold">Header &amp; {E ? "menu" : "menu"}</p>
      <div><Label>{E ? "Header style" : "Gaya header"}</Label>
        <select className={inputCls} value={h.variant} onChange={(e) => update((s) => { s.header.variant = e.target.value as any; })}>{HEADER_VARIANTS.map((v) => <option key={v}>{v}</option>)}</select></div>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={h.sticky} onChange={(e) => update((s) => { s.header.sticky = e.target.checked; })} />{E ? "Sticky header" : "Header menempel saat scroll"}</label>
      <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={h.showSearch} onChange={(e) => update((s) => { s.header.showSearch = e.target.checked; })} />{E ? "Show search box" : "Tampilkan kotak pencarian"}</label>
      <div><Label>{E ? "Announcement text" : "Teks pengumuman"}</Label><TextIn value={h.announcement} onChange={(v) => update((s) => { s.header.announcement = v; }, "h:ann")} /></div>
      <div><Label>{E ? "Header button label" : "Label tombol header"}</Label><TextIn value={h.ctaLabel} onChange={(v) => update((s) => { s.header.ctaLabel = v; }, "h:cta")} /></div>
      <div><Label>{E ? "Header button destination" : "Tujuan tombol header"}</Label><LinkIn value={h.ctaHref} onChange={(v) => update((s) => { s.header.ctaHref = v; }, "h:ctah")} ctx={ctx} /></div>
      <div>
        <Label>{E ? "Menu links" : "Tautan menu"}</Label>
        <div className="space-y-2">
          {snap.navigation.map((n, i) => (
            <div key={i} className="rounded-lg border border-line bg-canvas/50 p-2">
              <div className="mb-1 flex items-center gap-1">
                <input className={inputCls} value={n.label} onChange={(e) => update((s) => { s.navigation[i].label = e.target.value; }, `nav:${i}`)} />
                <button type="button" disabled={i === 0} onClick={() => update((s) => { const [x] = s.navigation.splice(i, 1); s.navigation.splice(i - 1, 0, x); })} className="rounded p-1 hover:bg-white disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => update((s) => { s.navigation.splice(i, 1); })} className="rounded p-1 hover:bg-white hover:text-red-600"><X className="h-3.5 w-3.5" /></button>
              </div>
              <LinkIn value={n.href} onChange={(v) => update((s) => { s.navigation[i].href = v; }, `navh:${i}`)} ctx={ctx} />
            </div>
          ))}
          {snap.navigation.length < 12 && <button type="button" onClick={() => update((s) => { s.navigation.push({ label: E ? "New link" : "Tautan baru", href: "/products" }); })} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-line py-1.5 text-[12px] font-medium text-ink-500 hover:border-sky-400"><Plus className="h-3.5 w-3.5" />{E ? "Add menu link" : "Tambah tautan menu"}</button>}
        </div>
      </div>
    </div>
  );
}

export function FooterInspector({ snap, ctx, update }: { snap: SiteSnapshot; ctx: Ctx; update: (fn: (s: SiteSnapshot) => void, key?: string) => void }) {
  const E = en(ctx);
  const f = snap.footer;
  const txt = (k: "tagline" | "address" | "email" | "phone" | "copyright", label: string, multiline?: boolean) => (
    <div><Label>{label}</Label><TextIn value={f[k]} multiline={multiline} onChange={(v) => update((s) => { s.footer[k] = v; }, `f:${k}`)} /></div>
  );
  return (
    <div className="space-y-4 p-4">
      <p className="text-[15px] font-semibold">Footer</p>
      <div><Label>{E ? "Footer style" : "Gaya footer"}</Label>
        <select className={inputCls} value={f.variant} onChange={(e) => update((s) => { s.footer.variant = e.target.value as any; })}>{FOOTER_VARIANTS.map((v) => <option key={v}>{v}</option>)}</select></div>
      {txt("tagline", "Tagline", true)}{txt("address", E ? "Address" : "Alamat")}{txt("email", "Email")}{txt("phone", E ? "Phone" : "Telepon")}{txt("copyright", "Copyright")}
    </div>
  );
}

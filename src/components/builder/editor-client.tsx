"use client";
import * as React from "react";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeft, Check, Copy, Eye, EyeOff, FileText, GripVertical, ImageIcon, Layers, Loader2, Monitor, Palette, PlusSquare,
  Redo2, Rocket, Smartphone, Tablet, Trash2, Undo2, AlertTriangle, Plus, Upload,
} from "lucide-react";
import * as Icons from "lucide-react";
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SiteSnapshot, Section, SitePage } from "@/lib/site/types";
import { SYSTEM_PAGE_SLUGS } from "@/lib/site/types";
import { SECTIONS, SECTION_MAP, makeSection, newSectionId } from "@/lib/site/registry";
import { slugify } from "@/lib/utils";
import { saveDraftAction, publishAction, uploadMediaAction } from "@/app/app/builder/actions";
import { CANVAS_MSG, EDITOR_MSG, type CanvasToEditor, type EditorToCanvas } from "./protocol";
import { SectionInspector, HeaderInspector, FooterInspector, type Ctx } from "./inspector";
import { ThemePanel } from "./theme-panel";
import { MediaPicker, type MediaItem } from "./media-picker";
import { lbl } from "./labels";

type Props = {
  initial: SiteSnapshot; rev: number; lang: "id" | "en"; canPublish: boolean; canUpload: boolean; initialPage?: string;
  media: MediaItem[]; categories: { slug: string; name: string }[]; collections: { slug: string; name: string }[];
  sample: { product?: string; collection?: string; reservation?: string };
  published: { versionNo: number | null; changed: boolean };
};
type LeftTab = "pages" | "add" | "layout" | "theme" | "assets";
type Device = "desktop" | "tablet" | "mobile";
const WIDTH: Record<Device, string> = { desktop: "100%", tablet: "820px", mobile: "390px" };

function pagePath(p: SitePage, sample: Props["sample"]) {
  if (p.page_type === "custom") return p.slug;
  const pattern = SYSTEM_PAGE_SLUGS[p.page_type];
  return pattern.replace(":slug", (p.page_type === "product" ? sample.product : sample.collection) ?? "").replace(":id", sample.reservation ?? "").replace(/\/$/, "");
}

/** Find the page a site path belongs to ("" = home, "products/sofa-x" = product page…). */
function matchPage(pages: SitePage[], path: string) {
  path = path.replace(/^\/+|\/+$/g, "");
  if (!path) return pages.findIndex((p) => p.is_home);
  const custom = pages.findIndex((p) => p.page_type === "custom" && p.slug === path);
  if (custom >= 0) return custom;
  return pages.findIndex((p) => {
    if (p.page_type === "custom" || p.is_home) return false;
    const pat = SYSTEM_PAGE_SLUGS[p.page_type];
    return pat.includes(":") ? path.includes("/") && pat.split("/")[0] === path.split("/")[0] : pat === path;
  });
}

export function EditorClient(props: Props) {
  const { lang, canPublish, sample } = props;
  const E = lang === "en";
  const T = (en: string, id: string) => (E ? en : id);

  /* ── document state + undo history ─────────────────────────────────── */
  const [snap, setSnapState] = useState<SiteSnapshot>(props.initial);
  const snapRef = useRef(snap);
  const setSnap = (s: SiteSnapshot) => { snapRef.current = s; setSnapState(s); };
  const hist = useRef<{ past: SiteSnapshot[]; future: SiteSnapshot[]; key?: string; at: number }>({ past: [], future: [], at: 0 });
  const [, forceHist] = useState(0);
  const [dirty, setDirty] = useState(false);
  const commit = useCallback((next: SiteSnapshot, key?: string) => {
    const h = hist.current, now = Date.now();
    // consecutive edits to the same field within 1.2s collapse into one undo step
    if (!(key && h.key === key && now - h.at < 1200)) { h.past.push(snapRef.current); if (h.past.length > 120) h.past.shift(); }
    h.future = []; h.key = key; h.at = now;
    setSnap(next); setDirty(true); forceHist((x) => x + 1);
  }, []);
  const update = useCallback((fn: (s: SiteSnapshot) => void, key?: string) => { const n = structuredClone(snapRef.current); fn(n); commit(n, key); }, [commit]);
  const undo = () => { const h = hist.current; const p = h.past.pop(); if (!p) return; h.future.push(snapRef.current); h.key = undefined; setSnap(p); setDirty(true); forceHist((x) => x + 1); };
  const redo = () => { const h = hist.current; const n = h.future.pop(); if (!n) return; h.past.push(snapRef.current); h.key = undefined; setSnap(n); setDirty(true); forceHist((x) => x + 1); };

  const [pageIdx, setPageIdx] = useState(() => {
    const i = matchPage(props.initial.pages, props.initialPage ?? "");
    return i < 0 ? Math.max(0, props.initial.pages.findIndex((p) => p.is_home)) : i;
  });
  const page = snap.pages[pageIdx] ?? snap.pages[0];
  const [selected, setSelected] = useState<string | null>(null);
  const [left, setLeft] = useState<LeftTab>("layout");
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [device, setDevice] = useState<Device>("desktop");
  const [media, setMedia] = useState<MediaItem[]>(props.media);
  const [picker, setPicker] = useState<null | ((url: string) => void)>(null);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string; reload?: boolean } | null>(null);
  const [rev, setRev] = useState(props.rev);
  const [saving, startSave] = useTransition();
  const [publishOpen, setPublishOpen] = useState(false);
  const [pubState, setPubState] = useState(props.published);

  const updatePage = useCallback((fn: (p: SitePage) => void, key?: string) => update((s) => fn(s.pages[pageIdx]), key), [update, pageIdx]);

  /* ── canvas iframe bridge ──────────────────────────────────────────── */
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const send = useCallback((m: EditorToCanvas) => frame.current?.contentWindow?.postMessage({ [EDITOR_MSG]: true, ...m }, window.location.origin), []);
  useEffect(() => { if (ready) send({ type: "state", snapshot: snap, page: pageIdx, selected }); }, [ready, snap, pageIdx, selected, send]);

  const sectionOp = useCallback((id: string, op: "up" | "down" | "duplicate" | "toggle" | "delete") => {
    const secs = snapRef.current.pages[pageIdx].sections;
    const i = secs.findIndex((s) => s.id === id);
    if (i < 0) return;
    if (op === "delete") {
      if (SECTION_MAP[secs[i].type]?.functional) return;
      if (!window.confirm(T(`Delete the "${lbl(lang, SECTION_MAP[secs[i].type]?.label ?? secs[i].type)}" section? You can undo this.`, `Hapus bagian "${lbl(lang, SECTION_MAP[secs[i].type]?.label ?? secs[i].type)}"? Dapat dibatalkan dengan Undo.`))) return;
      updatePage((p) => { p.sections.splice(i, 1); });
      setSelected(null);
    } else if (op === "duplicate") {
      const copy = { ...structuredClone(secs[i]), id: newSectionId() };
      updatePage((p) => { p.sections.splice(i + 1, 0, copy); });
      setSelected(copy.id);
    } else if (op === "toggle") updatePage((p) => { p.sections[i].hidden = !p.sections[i].hidden; });
    else {
      const j = op === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= secs.length) return;
      updatePage((p) => { p.sections = arrayMove(p.sections, i, j); });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx, updatePage, lang]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow || !e.data?.[CANVAS_MSG]) return;
      const m = e.data as CanvasToEditor;
      if (m.type === "ready") setReady(true);
      else if (m.type === "select") setSelected(m.id);
      else if (m.type === "text") updatePage((p) => { const s = p.sections.find((x) => x.id === m.id); if (s) s.props[m.field] = m.value; }, `p:${m.id}:${m.field}`);
      else if (m.type === "move") updatePage((p) => { p.sections = arrayMove(p.sections, m.from, m.to); });
      else if (m.type === "action") sectionOp(m.id, m.op);
      else if (m.type === "insert") { setInsertAt(m.index); setLeft("add"); }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [updatePage, sectionOp]);

  /* ── save / publish ────────────────────────────────────────────────── */
  const save = useCallback((then?: () => void) => {
    const sent = snapRef.current;
    startSave(async () => {
      const r = await saveDraftAction(JSON.stringify(sent), rev);
      if (!r?.ok) { setToast({ tone: "err", text: r?.error ?? "Error", reload: /elsewhere|tempat lain/.test(r?.error ?? "") }); return; }
      const d = r.data as { rev: number; snapshot: SiteSnapshot }; setRev(d.rev);
      // the server sanitises the draft (unsafe links, bad values); adopt its version if nothing changed meanwhile
      if (snapRef.current === sent) { setSnap(d.snapshot); setDirty(false); }
      setPubState((p) => ({ ...p, changed: true }));
      setToast({ tone: "ok", text: T("Draft saved. The live site is unchanged until you publish.", "Draf disimpan. Website live tidak berubah sampai Anda mempublikasikan.") });
      then?.();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rev, lang]);
  useEffect(() => { if (toast?.tone === "ok") { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName);
      if (e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
      else if (!typing && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (!typing && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const previewPath = `/preview/draft/${pagePath(page, sample)}`.replace(/\/$/, "");
  const openPreview = () => {
    const go = () => window.open(previewPath, "_blank", "noopener");
    if (dirty) save(go); else go();
  };

  /* ── helpers for panels ────────────────────────────────────────────── */
  const ctx: Ctx = useMemo(() => ({
    lang,
    pickImage: (cb) => setPicker(() => cb),
    links: [
      ...snap.pages.filter((p) => !SYSTEM_PAGE_SLUGS[p.page_type as keyof typeof SYSTEM_PAGE_SLUGS]?.includes(":")).map((p): [string, string] => [`/${p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type as keyof typeof SYSTEM_PAGE_SLUGS]}`.replace(/\/$/, "") || "/", p.title]),
      ...props.collections.map((c): [string, string] => [`/collections/${c.slug}`, `${T("Collection", "Koleksi")}: ${c.name}`]),
      ...props.categories.map((c): [string, string] => [`/products?category=${c.slug}`, `${T("Category", "Kategori")}: ${c.name}`]),
    ].map(([h, l]): [string, string] => [h === "" ? "/" : h, l]),
    categories: props.categories, collections: props.collections,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [lang, snap.pages, props.categories, props.collections]);

  const addSection = (type: string, variant?: string) => {
    const s = makeSection(type, variant);
    const at = insertAt ?? (selected ? page.sections.findIndex((x) => x.id === selected) + 1 || page.sections.length : page.sections.length);
    updatePage((p) => { p.sections.splice(at, 0, s); });
    setSelected(s.id); setInsertAt(null); setLeft("layout");
    setTimeout(() => send({ type: "scrollTo", id: s.id }), 150);
  };

  const selSection = page.sections.find((s) => s.id === selected) ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onSortEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = page.sections.findIndex((s) => s.id === e.active.id), to = page.sections.findIndex((s) => s.id === e.over!.id);
    updatePage((p) => { p.sections = arrayMove(p.sections, from, to); });
  };

  const tabs: [LeftTab, React.ReactNode, string][] = [
    ["pages", <FileText key="p" className="h-[18px] w-[18px]" />, T("Pages", "Halaman")],
    ["add", <PlusSquare key="a" className="h-[18px] w-[18px]" />, T("Add Section", "Tambah Bagian")],
    ["layout", <Layers key="l" className="h-[18px] w-[18px]" />, T("Layout", "Tata Letak")],
    ["theme", <Palette key="t" className="h-[18px] w-[18px]" />, T("Theme", "Tema")],
    ["assets", <ImageIcon key="m" className="h-[18px] w-[18px]" />, T("Assets", "Aset")],
  ];
  const btn = "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition disabled:opacity-40";

  return (
    <div className="flex h-screen flex-col text-ink">
      {/* top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-3">
        <a href="/app/builder" className={`${btn} text-ink-500 hover:bg-canvas`} onClick={(e) => { if (dirty && !window.confirm(T("You have unsaved changes. Leave the editor?", "Ada perubahan yang belum disimpan. Keluar dari editor?"))) e.preventDefault(); }}>
          <ArrowLeft className="h-4 w-4" />{T("Builder", "Builder")}
        </a>
        <div className="h-6 w-px bg-line" />
        <select aria-label={T("Page", "Halaman")} className="h-8 max-w-[220px] rounded-md border border-line bg-white px-2 text-[13px]" value={pageIdx} onChange={(e) => { setPageIdx(Number(e.target.value)); setSelected(null); }}>
          {snap.pages.map((p, i) => <option key={i} value={i}>{p.title} — /{p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type as keyof typeof SYSTEM_PAGE_SLUGS]}</option>)}
        </select>
        <div className="mx-auto flex items-center gap-0.5 rounded-lg bg-canvas p-0.5">
          {([["desktop", Monitor], ["tablet", Tablet], ["mobile", Smartphone]] as const).map(([d, I]) => (
            <button key={d} type="button" onClick={() => setDevice(d)} aria-pressed={device === d} title={d} className={`flex h-7 w-9 items-center justify-center rounded-md ${device === d ? "bg-white shadow-sm" : "text-ink-400 hover:text-ink"}`}><I className="h-4 w-4" /></button>
          ))}
        </div>
        <button type="button" onClick={undo} disabled={!hist.current.past.length} className={`${btn} hover:bg-canvas`} title={T("Undo (Ctrl+Z)", "Batal (Ctrl+Z)")}><Undo2 className="h-4 w-4" /></button>
        <button type="button" onClick={redo} disabled={!hist.current.future.length} className={`${btn} hover:bg-canvas`} title={T("Redo (Ctrl+Shift+Z)", "Ulangi (Ctrl+Shift+Z)")}><Redo2 className="h-4 w-4" /></button>
        <span className="hidden min-w-[120px] text-right text-[12px] text-ink-400 md:block" data-testid="save-status">
          {saving ? T("Saving…", "Menyimpan…") : dirty ? T("Unsaved changes", "Belum disimpan") : pubState.changed ? T("Draft saved · not live", "Draf tersimpan · belum live") : T("Up to date with live", "Sama dengan versi live")}
        </span>
        <button type="button" onClick={openPreview} className={`${btn} border border-line hover:bg-canvas`}><Eye className="h-4 w-4" />{T("Preview", "Pratinjau")}</button>
        <button type="button" onClick={() => save()} disabled={saving || !dirty} className={`${btn} border border-line hover:bg-canvas`}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}{T("Save draft", "Simpan draf")}</button>
        {canPublish
          ? <button type="button" onClick={() => (dirty ? save(() => setPublishOpen(true)) : setPublishOpen(true))} disabled={saving} className={`${btn} bg-ink text-white hover:bg-ink-700`}><Rocket className="h-4 w-4" />{T("Publish", "Publikasikan")}</button>
          : <span className="text-[12px] text-ink-400" title={T("Your role can edit drafts but not publish.", "Peran Anda dapat mengedit draf tetapi tidak dapat mempublikasikan.")}>{T("No publish permission", "Tanpa izin publikasi")}</span>}
      </header>

      <div className="flex min-h-0 flex-1">
        {/* left rail + panel */}
        <nav className="flex w-[68px] shrink-0 flex-col items-center gap-1 border-r border-line bg-white py-2">
          {tabs.map(([k, icon, label]) => (
            <button key={k} type="button" onClick={() => setLeft(k)} aria-pressed={left === k}
              className={`flex w-[60px] flex-col items-center gap-1 rounded-lg py-2 text-[10.5px] font-medium leading-tight ${left === k ? "bg-sky-50 text-sky-800" : "text-ink-500 hover:bg-canvas"}`}>{icon}<span className="text-center">{label}</span></button>
          ))}
        </nav>
        <aside className="w-[300px] shrink-0 overflow-y-auto border-r border-line bg-white" aria-label={T("Editor panel", "Panel editor")}>
          {left === "pages" && <PagesPanel snap={snap} pageIdx={pageIdx} T={T} onPick={(i) => { setPageIdx(i); setSelected(null); }} onCreate={(title) => {
            const base = slugify(title) || "halaman"; let slug = base, n = 2;
            while (snap.pages.some((p) => p.slug === slug) || ["products", "collections", "cart", "account", "about", "contact", "sign-in", "my-reservations", "app", "api", "media", "preview", "login"].includes(slug)) slug = `${base}-${n++}`;
            update((s) => { s.pages.push({ slug, title, page_type: "custom", is_home: false, is_system: false, sections: [makeSection("hero", "minimal", { heading: title, eyebrow: "", subheading: "" }), makeSection("custom-content", "single", { heading: "", body: T("Write your content here.", "Tulis konten Anda di sini.") })] }); });
            setPageIdx(snap.pages.length);
          }} />}
          {left === "add" && <AddPanel lang={lang} T={T} insertAt={insertAt} onAdd={addSection} onCancelInsert={() => setInsertAt(null)} />}
          {left === "layout" && (
            <div className="p-3">
              <p className="px-1 pb-2 text-[12px] text-ink-500">{T("Drag to reorder. Click to edit.", "Seret untuk mengurutkan. Klik untuk mengedit.")}</p>
              <button type="button" onClick={() => setSelected("__header")} className={`mb-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] ${selected === "__header" ? "border-sky-500 bg-sky-50" : "border-dashed border-line hover:bg-canvas"}`}><Icons.PanelTop className="h-4 w-4 text-ink-400" />Header &amp; menu</button>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSortEnd}>
                <SortableContext items={page.sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-1.5">
                    {page.sections.map((s) => <LayoutRow key={s.id} s={s} lang={lang} active={selected === s.id} onClick={() => { setSelected(s.id); send({ type: "scrollTo", id: s.id }); }} op={(op) => sectionOp(s.id, op)} />)}
                  </ul>
                </SortableContext>
              </DndContext>
              <button type="button" onClick={() => { setInsertAt(page.sections.length); setLeft("add"); }} className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-[13px] font-medium text-ink-500 hover:border-sky-400 hover:text-sky-700"><Plus className="h-4 w-4" />{T("Add section", "Tambah bagian")}</button>
              <button type="button" onClick={() => setSelected("__footer")} className={`mt-1.5 flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[13px] ${selected === "__footer" ? "border-sky-500 bg-sky-50" : "border-dashed border-line hover:bg-canvas"}`}><Icons.PanelBottom className="h-4 w-4 text-ink-400" />Footer</button>
            </div>
          )}
          {left === "theme" && <ThemePanel snap={snap} ctx={ctx} update={update} />}
          {left === "assets" && <AssetsPanel media={media} T={T} canUpload={props.canUpload} onUploaded={(m) => setMedia((x) => [...m, ...x])}
            selected={selSection} onUse={(url) => {
              const f = selSection && SECTION_MAP[selSection.type]?.fields.find((x) => x.type === "image");
              if (selSection && f) { updatePage((p) => { const s = p.sections.find((x) => x.id === selSection.id)!; s.props[f.key] = url; }); setToast({ tone: "ok", text: T("Image applied to the selected section.", "Gambar dipasang pada bagian terpilih.") }); }
              else { navigator.clipboard?.writeText(url); setToast({ tone: "ok", text: T(`Copied ${url}`, `Disalin: ${url}`) }); }
            }} />}
        </aside>

        {/* canvas */}
        <section className="relative flex min-w-0 flex-1 justify-center overflow-hidden bg-[#e9e9ec] p-4" onClick={() => setSelected(null)}>
          <div className="h-full overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 transition-[width] duration-200" style={{ width: WIDTH[device], maxWidth: "100%" }}>
            <iframe ref={frame} src="/builder-canvas" title={T("Website canvas", "Kanvas website")} className="h-full w-full" />
          </div>
          {!ready && <div className="absolute inset-0 flex items-center justify-center text-sm text-ink-500"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{T("Loading canvas…", "Memuat kanvas…")}</div>}
          {toast && (
            <div role="status" className={`absolute bottom-5 left-1/2 z-10 flex max-w-[560px] -translate-x-1/2 items-center gap-3 rounded-xl px-4 py-2.5 text-[13px] shadow-xl ${toast.tone === "ok" ? "bg-ink text-white" : "bg-red-600 text-white"}`} onClick={(e) => e.stopPropagation()}>
              {toast.tone === "err" && <AlertTriangle className="h-4 w-4 shrink-0" />}<span>{toast.text}</span>
              {toast.reload && <button type="button" className="rounded bg-white/20 px-2 py-0.5 font-medium" onClick={() => { setDirty(false); window.location.reload(); }}>{T("Reload", "Muat ulang")}</button>}
              <button type="button" className="opacity-70 hover:opacity-100" onClick={() => setToast(null)} aria-label="Close">✕</button>
            </div>
          )}
        </section>

        {/* inspector */}
        <aside className="w-[320px] shrink-0 overflow-y-auto border-l border-line bg-white" aria-label={T("Settings", "Pengaturan")}>
          {selSection ? <SectionInspector key={selSection.id} s={selSection} ctx={ctx}
              onChange={(next, key) => updatePage((p) => { const i = p.sections.findIndex((x) => x.id === next.id); if (i >= 0) p.sections[i] = next; }, key)}
              onAction={(op) => sectionOp(selSection.id, op)} />
            : selected === "__header" ? <HeaderInspector snap={snap} ctx={ctx} update={update} />
            : selected === "__footer" ? <FooterInspector snap={snap} ctx={ctx} update={update} />
            : <PageInspector page={page} T={T} updatePage={updatePage} />}
        </aside>
      </div>

      <MediaPicker open={!!picker} items={media} lang={lang} canUpload={props.canUpload} onClose={() => setPicker(null)}
        onPick={(url) => { picker?.(url); setPicker(null); }} onUploaded={(m) => setMedia((x) => [...m, ...x])} />
      {publishOpen && <PublishDialog T={T} versionNo={pubState.versionNo} onClose={() => setPublishOpen(false)} onDone={(no, msg) => { setPublishOpen(false); setPubState({ versionNo: no, changed: false }); setToast({ tone: "ok", text: msg }); }} />}
    </div>
  );
}

/* ── panels ───────────────────────────────────────────────────────────── */
type TFn = (en: string, id: string) => string;

function LayoutRow({ s, lang, active, onClick, op }: { s: Section; lang: "id" | "en"; active: boolean; onClick: () => void; op: (op: "duplicate" | "toggle" | "delete") => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: s.id });
  const meta = SECTION_MAP[s.type];
  const Icon = ((Icons as any)[meta?.icon ?? "Square"] ?? Icons.Square) as React.ComponentType<{ className?: string }>;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={`group flex items-center gap-1.5 rounded-lg border bg-white px-1.5 py-1.5 text-[13px] ${active ? "border-sky-500 bg-sky-50" : "border-line hover:bg-canvas"} ${isDragging ? "shadow-lg" : ""}`}>
      <button type="button" {...attributes} {...listeners} className="cursor-grab rounded p-0.5 text-ink-300 hover:text-ink active:cursor-grabbing" aria-label="Drag"><GripVertical className="h-4 w-4" /></button>
      <button type="button" onClick={onClick} className={`flex min-w-0 flex-1 items-center gap-2 text-left ${s.hidden ? "text-ink-300 line-through" : ""}`}>
        <Icon className="h-4 w-4 shrink-0 text-ink-400" /><span className="truncate">{lbl(lang, meta?.label ?? s.type)}</span>
      </button>
      <span className="flex opacity-0 transition group-hover:opacity-100">
        {!meta?.functional && <button type="button" onClick={() => op("duplicate")} className="rounded p-1 text-ink-400 hover:bg-white hover:text-ink" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>}
        <button type="button" onClick={() => op("toggle")} className="rounded p-1 text-ink-400 hover:bg-white hover:text-ink" title={s.hidden ? "Show" : "Hide"}>{s.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
        {!meta?.functional && <button type="button" onClick={() => op("delete")} className="rounded p-1 text-ink-400 hover:bg-white hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
      </span>
    </li>
  );
}

function AddPanel({ lang, T, insertAt, onAdd, onCancelInsert }: { lang: "id" | "en"; T: TFn; insertAt: number | null; onAdd: (type: string, variant?: string) => void; onCancelInsert: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups: [string, string][] = [["layout", T("Layout", "Tata letak")], ["products", T("Products", "Produk")], ["content", T("Content", "Konten")], ["commerce", T("Reservation", "Reservasi")]];
  return (
    <div className="p-3">
      {insertAt !== null && <p className="mb-2 flex items-center justify-between rounded-md bg-sky-50 px-2.5 py-1.5 text-[12px] text-sky-900">{T(`Inserting at position ${insertAt + 1}`, `Disisipkan di posisi ${insertAt + 1}`)}<button type="button" onClick={onCancelInsert} className="underline">{T("cancel", "batal")}</button></p>}
      {groups.map(([g, label]) => (
        <div key={g} className="mb-4">
          <p className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
          <div className="space-y-1">
            {SECTIONS.filter((s) => s.group === g).map((s) => {
              const Icon = ((Icons as any)[s.icon] ?? Icons.Square) as React.ComponentType<{ className?: string }>;
              return (
                <div key={s.type} className="rounded-lg border border-line">
                  <div className="flex items-center">
                    <button type="button" onClick={() => onAdd(s.type)} className="flex flex-1 items-center gap-2 px-2.5 py-2 text-left text-[13px] hover:bg-canvas" data-add-section={s.type}>
                      <Icon className="h-4 w-4 text-ink-400" />{lbl(lang, s.label)}
                    </button>
                    {s.variants.length > 1 && <button type="button" onClick={() => setOpen(open === s.type ? null : s.type)} className="px-2.5 py-2 text-[11px] text-ink-400 hover:text-ink">{s.variants.length} {T("styles", "gaya")} ▾</button>}
                  </div>
                  {open === s.type && (
                    <div className="grid grid-cols-2 gap-1 border-t border-line p-1.5">
                      {s.variants.map(([v, l]) => <button key={v} type="button" onClick={() => onAdd(s.type, v)} className="rounded-md bg-canvas px-2 py-1.5 text-left text-[12px] hover:bg-sky-50">{l}</button>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="px-1 text-[12px] text-ink-400">{T("Functional sections (catalog, cart, product detail…) live on their system pages and cannot be added elsewhere.", "Bagian fungsional (katalog, keranjang, detail produk…) berada di halaman sistemnya dan tidak dapat ditambahkan di tempat lain.")}</p>
    </div>
  );
}

function PagesPanel({ snap, pageIdx, onPick, onCreate, T }: { snap: SiteSnapshot; pageIdx: number; onPick: (i: number) => void; onCreate: (title: string) => void; T: TFn }) {
  const [title, setTitle] = useState("");
  const row = (p: SitePage, i: number) => (
    <button key={i} type="button" onClick={() => onPick(i)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] ${i === pageIdx ? "bg-sky-50 text-sky-900" : "hover:bg-canvas"}`}>
      <span className="truncate">{p.title}{p.is_home && <span className="ml-1.5 rounded bg-ink px-1 py-px text-[10px] text-white">{T("Home", "Beranda")}</span>}</span>
      <span className="shrink-0 font-mono text-[11px] text-ink-400">/{p.page_type === "custom" ? p.slug : SYSTEM_PAGE_SLUGS[p.page_type as keyof typeof SYSTEM_PAGE_SLUGS]}</span>
    </button>
  );
  const custom = snap.pages.map((p, i) => [p, i] as const).filter(([p]) => p.page_type === "custom");
  const system = snap.pages.map((p, i) => [p, i] as const).filter(([p]) => p.page_type !== "custom");
  return (
    <div className="p-3">
      <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{T("Your pages", "Halaman Anda")}</p>
      {custom.length ? custom.map(([p, i]) => row(p, i)) : <p className="px-2.5 py-2 text-[12px] text-ink-400">{T("No custom pages yet.", "Belum ada halaman kustom.")}</p>}
      <form className="mt-2 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); if (title.trim().length >= 2) { onCreate(title.trim()); setTitle(""); } }}>
        <input className="min-w-0 flex-1 rounded-md border border-line px-2 py-1.5 text-[13px]" placeholder={T("New page title", "Judul halaman baru")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className="rounded-md bg-ink px-2.5 text-[13px] font-medium text-white disabled:opacity-40" disabled={title.trim().length < 2}>{T("Add", "Tambah")}</button>
      </form>
      <p className="mb-1 mt-5 px-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{T("System pages", "Halaman sistem")}</p>
      {system.map(([p, i]) => row(p, i))}
      <a href="/app/builder/pages" className="mt-4 block px-1 text-[12px] font-medium text-sky-700 hover:underline">{T("Rename, set URL, SEO, duplicate or delete pages →", "Ganti nama, URL, SEO, duplikat atau hapus halaman →")}</a>
    </div>
  );
}

function PageInspector({ page, T, updatePage }: { page: SitePage; T: TFn; updatePage: (fn: (p: SitePage) => void, key?: string) => void }) {
  const cls = "w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px]";
  return (
    <div className="space-y-4 p-4">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{T("Page", "Halaman")}</p>
        <p className="text-[15px] font-semibold">{page.title}</p>
        <p className="mt-1 text-[12px] text-ink-500">{T("Select a section on the canvas or in Layout to edit it. Click any text on the canvas to type directly.", "Pilih bagian di kanvas atau di Tata Letak untuk mengeditnya. Klik teks mana pun di kanvas untuk mengetik langsung.")}</p>
      </div>
      <div><label className="mb-1 block text-[12px] font-medium text-ink-500">{T("Page title", "Judul halaman")}</label><input className={cls} value={page.title} onChange={(e) => updatePage((p) => { p.title = e.target.value; }, "pg:title")} /></div>
      <div><label className="mb-1 block text-[12px] font-medium text-ink-500">{T("SEO title", "Judul SEO")}</label><input className={cls} value={page.seo_title ?? ""} onChange={(e) => updatePage((p) => { p.seo_title = e.target.value || null; }, "pg:seo")} /></div>
      <div><label className="mb-1 block text-[12px] font-medium text-ink-500">{T("SEO description", "Deskripsi SEO")}</label><textarea className={`${cls} min-h-[80px]`} value={page.seo_description ?? ""} onChange={(e) => updatePage((p) => { p.seo_description = e.target.value || null; }, "pg:seod")} /></div>
      <p className="text-[12px] text-ink-400">{page.sections.length} {T("sections", "bagian")} · {page.sections.filter((s) => s.hidden).length} {T("hidden", "tersembunyi")}</p>
    </div>
  );
}

function AssetsPanel({ media, T, canUpload, onUploaded, selected, onUse }: { media: MediaItem[]; T: TFn; canUpload: boolean; onUploaded: (m: MediaItem[]) => void; selected: Section | null; onUse: (url: string) => void }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const hasImg = !!selected && !!SECTION_MAP[selected.type]?.fields.some((f) => f.type === "image");
  return (
    <div className="p-3">
      <p className="mb-2 px-1 text-[12px] text-ink-500">{hasImg ? T("Click an image to use it in the selected section.", "Klik gambar untuk dipakai di bagian terpilih.") : T("Click an image to copy its URL. Select a section with an image to place it directly.", "Klik gambar untuk menyalin URL-nya. Pilih bagian bergambar untuk memasangnya langsung.")}</p>
      {canUpload && <>
        <input ref={ref} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="hidden" onChange={(e) => {
          const files = e.target.files; if (!files?.length) return;
          const fd = new FormData(); for (const f of Array.from(files)) fd.append("files", f); fd.set("category", "general");
          setErr(null);
          start(async () => { const r = await uploadMediaAction(null, fd); if (!r?.ok) setErr(r?.error ?? "Error"); else onUploaded(((r.data as any).items as any[]).map((x) => ({ ...x, category: "general", folder: null, alt: null }))); });
          e.target.value = "";
        }} />
        <button type="button" disabled={pending} onClick={() => ref.current?.click()} className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-line py-2 text-[13px] font-medium text-ink-500 hover:border-sky-400">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{T("Upload images", "Unggah gambar")}</button>
      </>}
      {err && <p className="mb-2 rounded bg-red-50 px-2 py-1 text-[12px] text-red-700">{err}</p>}
      <div className="grid grid-cols-3 gap-1.5">
        {media.slice(0, 150).map((m) => (
          <button key={m.id} type="button" title={m.name} onClick={() => onUse(m.url)} className="aspect-square overflow-hidden rounded-md border border-line bg-canvas hover:border-sky-500"><img src={m.url} alt={m.alt ?? ""} loading="lazy" className="h-full w-full object-cover" /></button>
        ))}
      </div>
      <a href="/app/builder/media" className="mt-3 block px-1 text-[12px] font-medium text-sky-700 hover:underline">{T("Manage media library →", "Kelola pustaka media →")}</a>
    </div>
  );
}

function PublishDialog({ T, versionNo, onClose, onDone }: { T: TFn; versionNo: number | null; onClose: () => void; onDone: (no: number, msg: string) => void }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-label={T("Publish website", "Publikasikan website")} className="w-[min(460px,100%)] rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <h3 className="text-base font-semibold">{T("Publish the draft?", "Publikasikan draf?")}</h3>
          <p className="mt-1.5 text-sm text-ink-500">{T(`The saved draft becomes the live website for every user as version ${(versionNo ?? 0) + 1}. You can restore any earlier version later.`, `Draf tersimpan menjadi website live bagi semua pengguna sebagai versi ${(versionNo ?? 0) + 1}. Versi sebelumnya dapat dipulihkan kapan saja.`)}</p>
          <label className="mb-1 mt-4 block text-[12px] font-medium text-ink-500">{T("Version note (optional)", "Catatan versi (opsional)")}</label>
          <input className="w-full rounded-md border border-line px-2.5 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} placeholder={T("e.g. New wedding collection banner", "mis. Banner koleksi wedding baru")} autoFocus />
          {err && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[13px] text-red-700">{err}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm">{T("Cancel", "Batal")}</button>
          <button type="button" disabled={pending} onClick={() => {
            const fd = new FormData(); fd.set("note", note);
            start(async () => { const r = await publishAction(null, fd); if (!r?.ok) setErr(r?.error ?? "Error"); else onDone((r.data as any).versionNo, r.message ?? "Published"); });
          }} className="flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{T("Publish now", "Publikasikan sekarang")}</button>
        </div>
      </div>
    </div>
  );
}

"use client";
import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import type { SiteSnapshot, Section } from "@/lib/site/types";
import type { PageData, SiteData } from "@/components/site/types";
import { EditorContext } from "@/components/site/editable";
import { themeVars, googleFontsHref } from "@/lib/site/theme";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { RenderSection } from "@/components/site/render";
import { SECTION_MAP } from "@/lib/site/registry";
import { CANVAS_MSG, EDITOR_MSG, type CanvasToEditor, type EditorToCanvas } from "./protocol";

const PAGE_KIND: Record<string, string> = { catalog: "catalog", product: "product", collection: "collection", cart: "cart", my_reservations: "my_reservations", reservation: "reservation", account: "account", login: "login" };

export function CanvasClient({ initial, data, pageData }: { initial: SiteSnapshot; data: Omit<SiteData, "page">; pageData: Record<string, PageData> }) {
  const [snap, setSnap] = useState<SiteSnapshot>(initial);
  const [pageIdx, setPageIdx] = useState(() => Math.max(0, initial.pages.findIndex((p) => p.is_home)));
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [drop, setDrop] = useState<number | null>(null); // insertion index
  const lastSelected = useRef<string | null>(null);

  const post = useCallback((m: CanvasToEditor) => {
    if (window.parent !== window) window.parent.postMessage({ [CANVAS_MSG]: true, ...m }, window.location.origin);
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // only accept messages from the editor that embeds us (same origin)
      if (e.origin !== window.location.origin || e.source !== window.parent || !e.data?.[EDITOR_MSG]) return;
      const m = e.data as EditorToCanvas;
      if (m.type === "state") {
        setSnap(m.snapshot);
        setPageIdx(Math.min(Math.max(0, m.page), m.snapshot.pages.length - 1));
        setSelected(m.selected);
      } else if (m.type === "scrollTo") {
        document.querySelector(`[data-canvas-id="${CSS.escape(m.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    window.addEventListener("message", onMsg);
    post({ type: "ready" });
    return () => window.removeEventListener("message", onMsg);
  }, [post]);

  // when the editor selects something new (e.g. from the layout list), bring it into view
  useEffect(() => {
    if (selected && selected !== lastSelected.current && !selected.startsWith("__")) {
      const el = document.querySelector(`[data-canvas-id="${CSS.escape(selected)}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top < 0 || r.top > window.innerHeight - 80) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
    lastSelected.current = selected;
  }, [selected]);

  const page = snap.pages[pageIdx] ?? snap.pages[0];
  const siteData: SiteData = { ...data, page: pageData[PAGE_KIND[page?.page_type ?? ""] ?? ""] ?? { kind: "none" } };
  const editorApi = React.useMemo(() => ({ onText: (id: string, field: string, value: string) => post({ type: "text", id, field, value }) }), [post]);

  const select = (id: string) => { setSelected(id); post({ type: "select", id }); };
  const act = (id: string, op: "up" | "down" | "duplicate" | "toggle" | "delete") => post({ type: "action", id, op });

  const onDragOver = (e: React.DragEvent, i: number) => {
    if (drag === null) return;
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDrop(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (drag !== null && drop !== null && drop !== drag && drop !== drag + 1) post({ type: "move", from: drag, to: drop > drag ? drop - 1 : drop });
    setDrag(null); setDrop(null);
  };

  if (!page) return null;
  const sections = page.sections;
  const t = snap.theme;
  return (
    <EditorContext.Provider value={editorApi}>
      <div
        className="site min-h-screen"
        data-card={t.cardStyle}
        data-btn={t.buttonStyle}
        style={themeVars(t) as React.CSSProperties}
        onSubmitCapture={(e) => e.preventDefault()}
        onClickCapture={(e) => { if ((e.target as HTMLElement).closest("a")) e.preventDefault(); }}
      >
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href={googleFontsHref(t)} />
        <Chrome id="__header" label="Header" selected={selected} hover={hover} setHover={setHover} onSelect={select}>
          <SiteHeader theme={t} header={snap.header} nav={snap.navigation} user={siteData.user} cartCount={siteData.cartCount} lang={siteData.lang} editor />
        </Chrome>
        <main className="relative" onDragOver={(e) => drag !== null && e.preventDefault()} onDrop={onDrop}>
          {sections.length === 0 && (
            <div className="mx-auto my-24 max-w-md rounded-2xl border-2 border-dashed border-sky-300 p-10 text-center text-sm text-sky-800" style={{ fontFamily: "Inter, sans-serif" }}>
              {data.lang === "en" ? "This page is empty." : "Halaman ini kosong."}
              <button type="button" className="mt-4 block w-full rounded-lg bg-sky-600 px-3 py-2 font-medium text-white" onClick={() => post({ type: "insert", index: 0 })}>
                + {data.lang === "en" ? "Add section" : "Tambah bagian"}
              </button>
            </div>
          )}
          {sections.map((s, i) => (
            <CanvasSection key={s.id} s={s} i={i} count={sections.length} theme={t} data={siteData}
              selected={selected === s.id} hovered={hover === s.id} setHover={setHover}
              onSelect={() => select(s.id)} act={act} insert={(index) => post({ type: "insert", index })}
              dropBefore={drop === i} dropAfter={drop === i + 1 && i === sections.length - 1}
              dragging={drag === i} onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setDrop(null); }} onDragOver={(e) => onDragOver(e, i)} />
          ))}
        </main>
        <Chrome id="__footer" label="Footer" selected={selected} hover={hover} setHover={setHover} onSelect={select}>
          <SiteFooter theme={t} footer={snap.footer} nav={snap.navigation} categories={siteData.categories} collections={siteData.collections} lang={siteData.lang} />
        </Chrome>
      </div>
    </EditorContext.Provider>
  );
}

function Chrome({ id, label, selected, hover, setHover, onSelect, children }: { id: string; label: string; selected: string | null; hover: string | null; setHover: (v: string | null) => void; onSelect: (id: string) => void; children: React.ReactNode }) {
  const on = selected === id, hv = hover === id;
  return (
    <div className="relative" onMouseEnter={() => setHover(id)} onMouseLeave={() => setHover(null)} onClick={() => onSelect(id)}
      style={{ outline: on ? "2px solid #0284c7" : hv ? "1px dashed #38bdf8" : undefined, outlineOffset: -2, zIndex: id === "__header" ? 45 : undefined }}>
      {(on || hv) && <span className="pointer-events-none absolute left-2 top-2 z-[70] rounded bg-sky-600 px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ fontFamily: "Inter, sans-serif" }}>{label}</span>}
      {children}
    </div>
  );
}

function CanvasSection({ s, i, count, theme, data, selected, hovered, setHover, onSelect, act, insert, dropBefore, dropAfter, dragging, onDragStart, onDragEnd, onDragOver }: {
  s: Section; i: number; count: number; theme: SiteSnapshot["theme"]; data: SiteData; selected: boolean; hovered: boolean; setHover: (v: string | null) => void;
  onSelect: () => void; act: (id: string, op: "up" | "down" | "duplicate" | "toggle" | "delete") => void; insert: (index: number) => void;
  dropBefore: boolean; dropAfter: boolean; dragging: boolean; onDragStart: () => void; onDragEnd: () => void; onDragOver: (e: React.DragEvent) => void;
}) {
  const meta = SECTION_MAP[s.type];
  const en = data.lang === "en";
  const btn = "flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/20 disabled:opacity-40";
  return (
    <div data-canvas-id={s.id} className="group/cs relative" onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(null)} onDragOver={onDragOver}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{ outline: selected ? "2px solid #0284c7" : hovered ? "1px dashed #38bdf8" : undefined, outlineOffset: -2, opacity: dragging ? 0.4 : 1 }}>
      {dropBefore && <DropLine top />}
      {(selected || hovered) && (
        <div className="absolute right-2 top-2 z-[70] flex items-center gap-0.5 rounded-lg bg-sky-600 p-0.5 text-white shadow-lg" style={{ fontFamily: "Inter, sans-serif" }} onClick={(e) => e.stopPropagation()}>
          <span draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); onDragStart(); }} onDragEnd={onDragEnd}
            className="flex h-7 cursor-grab items-center gap-1 px-1.5 text-[11px] font-medium active:cursor-grabbing" title={en ? "Drag to reorder" : "Seret untuk memindah"}>
            <GripVertical className="h-3.5 w-3.5" />{meta?.label ?? s.type}{s.hidden ? (en ? " · hidden" : " · tersembunyi") : ""}
          </span>
          <button type="button" className={btn} disabled={i === 0} onClick={() => act(s.id, "up")} title={en ? "Move up" : "Naikkan"}><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" className={btn} disabled={i === count - 1} onClick={() => act(s.id, "down")} title={en ? "Move down" : "Turunkan"}><ArrowDown className="h-3.5 w-3.5" /></button>
          {!meta?.functional && <button type="button" className={btn} onClick={() => act(s.id, "duplicate")} title={en ? "Duplicate" : "Duplikat"}><Copy className="h-3.5 w-3.5" /></button>}
          <button type="button" className={btn} onClick={() => act(s.id, "toggle")} title={s.hidden ? (en ? "Show" : "Tampilkan") : (en ? "Hide" : "Sembunyikan")}>{s.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
          {!meta?.functional && <button type="button" className={btn} onClick={() => act(s.id, "delete")} title={en ? "Delete" : "Hapus"}><Trash2 className="h-3.5 w-3.5" /></button>}
        </div>
      )}
      <div style={s.hidden ? { opacity: 0.35, filter: "grayscale(0.6)" } : undefined}>
        <RenderSection section={{ ...s, style: { ...s.style, hideDesktop: false, hideMobile: false } }} theme={theme} data={data} />
      </div>
      {(s.style?.hideDesktop || s.style?.hideMobile) && (
        <span className="pointer-events-none absolute left-2 top-2 z-[69] rounded bg-amber-500 px-1.5 py-0.5 text-[11px] font-medium text-white" style={{ fontFamily: "Inter, sans-serif" }}>
          {s.style.hideDesktop ? (en ? "Hidden on desktop" : "Disembunyikan di desktop") : (en ? "Hidden on mobile" : "Disembunyikan di mobile")}
        </span>
      )}
      {selected && (
        <button type="button" onClick={(e) => { e.stopPropagation(); insert(i + 1); }}
          className="absolute -bottom-3.5 left-1/2 z-[70] flex h-7 -translate-x-1/2 items-center gap-1 rounded-full bg-sky-600 px-3 text-[11px] font-medium text-white shadow-lg" style={{ fontFamily: "Inter, sans-serif" }}>
          <Plus className="h-3.5 w-3.5" />{en ? "Add section" : "Tambah bagian"}
        </button>
      )}
      {dropAfter && <DropLine />}
    </div>
  );
}

const DropLine = ({ top }: { top?: boolean }) => <div className={`pointer-events-none absolute inset-x-0 z-[71] h-1 bg-sky-500 ${top ? "-top-0.5" : "-bottom-0.5"}`} />;

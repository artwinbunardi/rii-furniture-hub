"use client";
import * as React from "react";
import type { SiteSnapshot, ThemeColors } from "@/lib/site/types";
import { FONT_OPTIONS } from "@/lib/site/theme";
import { ColorIn, ImageIn, Label, TextIn, inputCls, type Ctx } from "./inspector";

export const COLOR_LABELS: Record<keyof ThemeColors, [string, string]> = {
  primary: ["Primary / buttons", "Utama / tombol"], secondary: ["Secondary", "Sekunder"], accent: ["Accent", "Aksen"],
  background: ["Page background", "Latar halaman"], surface: ["Surface (cards, bands)", "Permukaan (kartu)"], text: ["Text", "Teks"],
  muted: ["Muted text", "Teks redup"], border: ["Borders", "Garis tepi"], headerBg: ["Header background", "Latar header"],
  headerText: ["Header text", "Teks header"], footerBg: ["Footer background", "Latar footer"], footerText: ["Footer text", "Teks footer"],
};

/** Theme & branding controls used inside the visual editor (changes are live on the canvas). */
export function ThemePanel({ snap, ctx, update }: { snap: SiteSnapshot; ctx: Ctx; update: (fn: (s: SiteSnapshot) => void, key?: string) => void }) {
  const t = snap.theme;
  const E = ctx.lang === "en";
  const sel = (label: string, value: string | number, opts: [string, string][], set: (v: string) => void) => (
    <div><Label>{label}</Label><select className={inputCls} value={String(value)} onChange={(e) => set(e.target.value)}>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  const range = (label: string, value: number, min: number, max: number, step: number, set: (v: number) => void, suffix = "px") => (
    <div><Label>{label}: <span className="font-mono">{value}{suffix}</span></Label><input type="range" className="w-full accent-sky-600" min={min} max={max} step={step} value={value} onChange={(e) => set(Number(e.target.value))} /></div>
  );
  const H = ({ children }: { children: React.ReactNode }) => <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">{children}</p>;
  return (
    <div className="space-y-4 p-4">
      <H>{E ? "Branding" : "Merek"}</H>
      <div><Label>Logo</Label><ImageIn value={t.logoUrl ?? ""} onChange={(v) => update((s) => { s.theme.logoUrl = v || null; })} ctx={ctx} /></div>
      <div><Label>{E ? "Logo text (used when no logo image)" : "Teks logo (dipakai jika tanpa gambar)"}</Label><TextIn value={t.logoText} onChange={(v) => update((s) => { s.theme.logoText = v; }, "t:logoText")} /></div>
      <div><Label>Favicon</Label><ImageIn value={t.faviconUrl ?? ""} onChange={(v) => update((s) => { s.theme.faviconUrl = v || null; })} ctx={ctx} /></div>
      <H>{E ? "Colors" : "Warna"}</H>
      {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((k) => (
        <ColorIn key={k} label={COLOR_LABELS[k][E ? 0 : 1]} value={t.colors[k]} onChange={(v) => update((s) => { s.theme.colors[k] = v; }, `t:c:${k}`)} />
      ))}
      <H>{E ? "Fonts" : "Font"}</H>
      {sel(E ? "Heading font" : "Font judul", t.fonts.heading, FONT_OPTIONS.map((f) => [f, f]), (v) => update((s) => { s.theme.fonts.heading = v; }))}
      {sel(E ? "Body font" : "Font isi", t.fonts.body, FONT_OPTIONS.map((f) => [f, f]), (v) => update((s) => { s.theme.fonts.body = v; }))}
      {sel(E ? "Heading weight" : "Ketebalan judul", t.fonts.headingWeight, [300, 400, 500, 600, 700, 800].map((w) => [String(w), String(w)]), (v) => update((s) => { s.theme.fonts.headingWeight = Number(v); }))}
      {sel(E ? "Heading case" : "Huruf judul", t.fonts.headingCase, [["none", E ? "Normal" : "Normal"], ["uppercase", E ? "UPPERCASE" : "KAPITAL"]], (v) => update((s) => { s.theme.fonts.headingCase = v as any; }))}
      {range(E ? "Heading letter spacing" : "Jarak huruf judul", t.fonts.headingTracking, -0.06, 0.2, 0.01, (v) => update((s) => { s.theme.fonts.headingTracking = v; }, "t:track"), "em")}
      <H>{E ? "Buttons & cards" : "Tombol & kartu"}</H>
      {sel(E ? "Button style" : "Gaya tombol", t.buttonStyle, [["solid", "Solid"], ["outline", "Outline"], ["underline", "Underline"]], (v) => update((s) => { s.theme.buttonStyle = v as any; }))}
      {range(E ? "Button radius" : "Radius tombol", Math.min(t.buttonRadius, 40), 0, 40, 1, (v) => update((s) => { s.theme.buttonRadius = v === 40 ? 999 : v; }, "t:br"))}
      {sel(E ? "Product card style" : "Gaya kartu produk", t.cardStyle, [["bordered", "Bordered"], ["shadow", "Shadow"], ["minimal", "Minimal"], ["overlay", "Overlay"], ["polaroid", "Polaroid"], ["caption", "Caption"]], (v) => update((s) => { s.theme.cardStyle = v as any; }))}
      {sel(E ? "Image ratio" : "Rasio gambar", t.imageRatio, [["landscape", "4:3"], ["square", "1:1"], ["portrait", "4:5"]], (v) => update((s) => { s.theme.imageRatio = v as any; }))}
      {range(E ? "Card & image radius" : "Radius kartu & gambar", t.radius, 0, 32, 1, (v) => update((s) => { s.theme.radius = v; }, "t:r"))}
      <H>{E ? "Layout" : "Tata letak"}</H>
      {range(E ? "Container width" : "Lebar kontainer", t.containerWidth, 960, 1600, 20, (v) => update((s) => { s.theme.containerWidth = v; }, "t:cw"))}
      {sel(E ? "Spacing density" : "Kerapatan", t.density, [["compact", E ? "Compact" : "Rapat"], ["comfortable", E ? "Comfortable" : "Nyaman"], ["airy", E ? "Airy" : "Lapang"]], (v) => update((s) => { s.theme.density = v as any; }))}
    </div>
  );
}

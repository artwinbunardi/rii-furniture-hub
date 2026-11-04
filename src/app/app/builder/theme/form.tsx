"use client";
import * as React from "react";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { themeAction } from "../actions";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Card, CardHeader } from "@/components/ui/misc";
import { FONT_OPTIONS } from "@/lib/site/theme";
import type { FooterConfig, HeaderConfig, Theme, ThemeColors } from "@/lib/site/types";
import { COLOR_LABELS } from "@/components/builder/theme-panel";
import { MediaPicker, type MediaItem } from "@/components/builder/media-picker";

export function ThemeForm({ lang, rev, theme, header, footer, media: initialMedia, canUpload }: { lang: "id" | "en"; rev: number; theme: Theme; header: HeaderConfig; footer: FooterConfig; media: MediaItem[]; canUpload: boolean }) {
  const E = lang === "en";
  const T = (a: string, b: string) => (E ? a : b);
  const [colors, setColors] = useState(theme.colors);
  const [logo, setLogo] = useState(theme.logoUrl ?? "");
  const [favicon, setFavicon] = useState(theme.faviconUrl ?? "");
  const [media, setMedia] = useState(initialMedia);
  const [picker, setPicker] = useState<null | ((u: string) => void)>(null);
  const sel = (name: string, label: string, value: string | number, opts: [string | number, string][]) => (
    <div><label className="label">{label}</label><select name={name} defaultValue={String(value)} className="input">{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
  );
  const num = (name: string, label: string, value: number, min: number, max: number) => (
    <div><label className="label">{label}</label><input type="number" name={name} defaultValue={value} min={min} max={max} className="input" /></div>
  );
  const img = (label: string, value: string, set: (v: string) => void, name: string) => (
    <div>
      <label className="label">{label}</label>
      <input type="hidden" name={name} value={value} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPicker(() => set)} className="flex h-14 w-24 items-center justify-center overflow-hidden rounded-lg border border-line bg-canvas">{value ? <img src={value} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-ink-300" />}</button>
        <button type="button" onClick={() => setPicker(() => set)} className="text-[13px] font-medium text-sky-700 hover:underline">{T("Choose…", "Pilih…")}</button>
        {value && <button type="button" onClick={() => set("")} className="text-[13px] text-ink-400 hover:text-red-600">{T("Remove", "Hapus")}</button>}
      </div>
    </div>
  );
  return (
    <ActionForm action={themeAction} className="space-y-6">
      <input type="hidden" name="rev" value={rev} />
      <Card>
        <CardHeader title={T("Branding", "Merek")} />
        <div className="grid gap-5 p-5 md:grid-cols-3">
          {img("Logo", logo, setLogo, "logoUrl")}
          <div><label className="label">{T("Logo text", "Teks logo")}</label><input name="logoText" defaultValue={theme.logoText} className="input" maxLength={60} /></div>
          {img("Favicon", favicon, setFavicon, "faviconUrl")}
        </div>
      </Card>
      <Card>
        <CardHeader title={T("Colors", "Warna")} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(COLOR_LABELS) as (keyof ThemeColors)[]).map((k) => (
            <div key={k}>
              <label className="label">{COLOR_LABELS[k][E ? 0 : 1]}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="h-9 w-11 cursor-pointer rounded border border-line p-0.5" aria-label={k} />
                <input name={`c_${k}`} value={colors[k]} onChange={(e) => setColors({ ...colors, [k]: e.target.value })} className="input font-mono text-[13px]" pattern="#[0-9a-fA-F]{6}" />
              </div>
            </div>
          ))}
        </div>
        <div className="mx-5 mb-5 flex flex-wrap items-center gap-3 rounded-xl p-4" style={{ background: colors.background, color: colors.text, border: `1px solid ${colors.border}` }}>
          <span style={{ background: colors.primary, color: "#fff" }} className="rounded-md px-3 py-1.5 text-sm">{T("Button", "Tombol")}</span>
          <span style={{ color: colors.accent }} className="text-sm font-semibold">{T("Accent", "Aksen")}</span>
          <span style={{ color: colors.muted }} className="text-sm">{T("Muted text", "Teks redup")}</span>
          <span style={{ background: colors.surface }} className="rounded-md px-3 py-1.5 text-sm">{T("Surface", "Permukaan")}</span>
          <span style={{ background: colors.headerBg, color: colors.headerText }} className="rounded-md px-3 py-1.5 text-sm">Header</span>
          <span style={{ background: colors.footerBg, color: colors.footerText }} className="rounded-md px-3 py-1.5 text-sm">Footer</span>
        </div>
      </Card>
      <Card>
        <CardHeader title={T("Typography", "Tipografi")} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {sel("headingFont", T("Heading font", "Font judul"), theme.fonts.heading, FONT_OPTIONS.map((f) => [f, f]))}
          {sel("bodyFont", T("Body font", "Font isi"), theme.fonts.body, FONT_OPTIONS.map((f) => [f, f]))}
          {sel("headingWeight", T("Heading weight", "Ketebalan judul"), theme.fonts.headingWeight, [300, 400, 500, 600, 700, 800].map((w) => [w, String(w)]))}
          {sel("headingCase", T("Heading case", "Huruf judul"), theme.fonts.headingCase, [["none", "Normal"], ["uppercase", T("UPPERCASE", "KAPITAL")]])}
        </div>
      </Card>
      <Card>
        <CardHeader title={T("Buttons, cards & layout", "Tombol, kartu & tata letak")} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {sel("buttonStyle", T("Button style", "Gaya tombol"), theme.buttonStyle, [["solid", "Solid"], ["outline", "Outline"], ["underline", "Underline"]])}
          {num("buttonRadius", T("Button radius (px, 999 = pill)", "Radius tombol (px, 999 = kapsul)"), theme.buttonRadius, 0, 999)}
          {sel("cardStyle", T("Product card style", "Gaya kartu produk"), theme.cardStyle, [["bordered", "Bordered"], ["shadow", "Shadow"], ["minimal", "Minimal"], ["overlay", "Overlay"], ["polaroid", "Polaroid"], ["caption", "Caption"]])}
          {sel("imageRatio", T("Image ratio", "Rasio gambar"), theme.imageRatio, [["landscape", "4:3"], ["square", "1:1"], ["portrait", "4:5"]])}
          {num("radius", T("Card radius (px)", "Radius kartu (px)"), theme.radius, 0, 40)}
          {num("containerWidth", T("Container width (px)", "Lebar kontainer (px)"), theme.containerWidth, 960, 1600)}
          {sel("density", T("Spacing", "Kerapatan"), theme.density, [["compact", T("Compact", "Rapat")], ["comfortable", T("Comfortable", "Nyaman")], ["airy", T("Airy", "Lapang")]])}
        </div>
      </Card>
      <Card>
        <CardHeader title={T("Header & footer style", "Gaya header & footer")} />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {sel("headerVariant", T("Header / menu style", "Gaya header / menu"), header.variant, ["classic", "centered", "split", "minimal", "bold", "transparent", "stacked"].map((v) => [v, v]))}
          {sel("footerVariant", T("Footer style", "Gaya footer"), footer.variant, ["columns", "minimal", "bigtype", "centered", "split"].map((v) => [v, v]))}
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="headerSticky" defaultChecked={header.sticky} />{T("Sticky header", "Header menempel")}</label>
          <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="headerSearch" defaultChecked={header.showSearch} />{T("Search in header", "Pencarian di header")}</label>
        </div>
      </Card>
      <SubmitButton>{T("Save theme to draft", "Simpan tema ke draf")}</SubmitButton>
      <MediaPicker open={!!picker} items={media} lang={lang} canUpload={canUpload} onClose={() => setPicker(null)} onPick={(u) => { picker?.(u); setPicker(null); }} onUploaded={(m) => setMedia((x) => [...m, ...x])} />
    </ActionForm>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";

type Item = { href: string; en: string; id: string; icon: keyof typeof Icons; full?: boolean };
export const BUILDER_NAV: Item[] = [
  { href: "/app/builder", en: "Overview", id: "Ringkasan", icon: "LayoutDashboard" },
  { href: "/app/builder/websites", en: "Websites", id: "Website", icon: "Globe" },
  { href: "/app/builder/templates", en: "Templates", id: "Template", icon: "LayoutTemplate" },
  { href: "/app/builder/editor", en: "Visual editor", id: "Editor visual", icon: "MousePointerSquareDashed", full: true },
  { href: "/app/builder/pages", en: "Pages", id: "Halaman", icon: "Files" },
  { href: "/app/builder/sections", en: "Sections", id: "Bagian", icon: "Rows3" },
  { href: "/app/builder/navigation", en: "Navigation", id: "Navigasi", icon: "Menu" },
  { href: "/app/builder/theme", en: "Theme & Branding", id: "Tema & Merek", icon: "Palette" },
  { href: "/app/collections", en: "Product Collections", id: "Koleksi Produk", icon: "LayoutGrid", full: true },
  { href: "/app/builder/media", en: "Media Library", id: "Pustaka Media", icon: "Images" },
  { href: "/app/builder/seo", en: "SEO Settings", id: "Pengaturan SEO", icon: "Search" },
  { href: "/app/builder/domain", en: "Domain & Access", id: "Domain & Akses", icon: "Link2" },
  { href: "/app/builder/publish", en: "Publish", id: "Publikasi", icon: "Rocket" },
  { href: "/app/builder/versions", en: "Version History", id: "Riwayat Versi", icon: "History" },
];

/** Builder sub-navigation. Hidden inside the full-screen visual editor. */
export function BuilderNav({ lang, children }: { lang: "id" | "en"; children: React.ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/app/builder/editor")) return <>{children}</>;
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:sticky lg:top-6 lg:mx-0 lg:w-[200px] lg:shrink-0 lg:flex-col lg:self-start lg:overflow-visible" aria-label="Website builder">
        <p className="hidden px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400 lg:block">Website Builder</p>
        {BUILDER_NAV.map((i) => {
          const Icon = Icons[i.icon] as React.ComponentType<{ className?: string }>;
          const active = i.href === "/app/builder" ? path === i.href : path.startsWith(i.href);
          const cls = `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] ${active ? "bg-white font-medium text-ink shadow-sm ring-1 ring-line" : "text-ink-500 hover:bg-white hover:text-ink"}`;
          const body = <><Icon className="h-4 w-4" />{lang === "en" ? i.en : i.id}</>;
          // the editor and pages outside /app/builder use a different shell → full page load
          return i.full ? <a key={i.href} href={i.href} className={cls}>{body}</a> : <Link key={i.href} href={i.href} className={cls}>{body}</Link>;
        })}
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

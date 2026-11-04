"use client";
import { useState } from "react";
import { Menu, Search, ShoppingBag, X, UserRound, LogOut, LayoutDashboard } from "lucide-react";
import type { HeaderConfig, NavLink, Theme } from "@/lib/site/types";
import type { SiteUser } from "./types";
import { SLink } from "./link";
import { logoutAction } from "@/app/auth-actions";
import { tr, type Lang } from "@/lib/i18n/dict";

function Logo({ theme, light }: { theme: Theme; light?: boolean }) {
  if (theme.logoUrl) return <img src={theme.logoUrl} alt={theme.logoText} className="h-8 w-auto max-w-[180px] object-contain" />;
  return <span className="s-heading text-[19px]" style={{ letterSpacing: "0.02em" }}>{theme.logoText}</span>;
}

export function SiteHeader({ theme, header, nav, user, cartCount, lang, editor }: {
  theme: Theme; header: HeaderConfig; nav: NavLink[]; user: SiteUser; cartCount: number; lang: Lang; editor?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = (k: string) => tr(lang, k);
  const v = header.variant;
  const light = v === "transparent" || v === "bold";

  const search = header.showSearch && (
    <form action="/products" className="relative hidden md:block" onSubmit={editor ? (e) => e.preventDefault() : undefined}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      <input name="q" placeholder={t("search")} className="h-9 w-48 rounded-full border bg-transparent pl-9 pr-3 text-[13px] outline-none lg:w-56" style={{ borderColor: light ? "rgba(255,255,255,.35)" : "var(--c-border)" }} />
    </form>
  );
  const icons = (
    <div className="flex items-center gap-1">
      {search}
      <SLink href="/cart" className="relative rounded-full p-2 hover:opacity-70" aria-label={t("cart")}>
        <ShoppingBag className="h-5 w-5" />
        {cartCount > 0 && <span data-testid="cart-count" className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold" style={{ background: "var(--c-accent)", color: "#fff" }}>{cartCount}</span>}
      </SLink>
      {user ? (
        <div className="group relative">
          <button className="flex items-center gap-2 rounded-full p-2 hover:opacity-70" aria-label={t("my_account")}><UserRound className="h-5 w-5" /></button>
          <div className="invisible absolute right-0 top-full z-50 w-56 rounded-xl border bg-white p-1.5 text-[13px] text-zinc-800 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100" style={{ borderColor: "#eee" }}>
            <div className="px-3 py-2"><p className="font-medium">{user.name}</p></div>
            <SLink href="/my-reservations" className="block rounded-lg px-3 py-2 hover:bg-zinc-100">{t("my_reservations")}</SLink>
            <SLink href="/account" className="block rounded-lg px-3 py-2 hover:bg-zinc-100">{t("my_account")}</SLink>
            {user.isStaff && <SLink href="/app" className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-zinc-100"><LayoutDashboard className="h-4 w-4" />{t("back_to_app")}</SLink>}
            {!editor && <form action={logoutAction}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-zinc-100"><LogOut className="h-4 w-4" />{t("logout")}</button></form>}
          </div>
        </div>
      ) : (
        <SLink href="/login" className="rounded-full p-2 hover:opacity-70" aria-label={t("login")}><UserRound className="h-5 w-5" /></SLink>
      )}
      {header.ctaLabel && v !== "minimal" && <SLink href={header.ctaHref || "/products"} className="s-btn s-btn-sm ml-2 hidden lg:inline-flex">{header.ctaLabel}</SLink>}
      <button className="rounded-full p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Menu"><Menu className="h-5 w-5" /></button>
    </div>
  );
  const links = (cls = "") => nav.map((n, i) => <SLink key={i} href={n.href} className={`s-link text-[14px] ${cls}`}>{n.label}</SLink>);

  const wrapStyle: React.CSSProperties = {
    background: v === "transparent" ? "linear-gradient(to bottom, rgba(0,0,0,.55), rgba(0,0,0,0))" : v === "bold" ? "var(--c-primary)" : "var(--c-header-bg)",
    color: light ? "#fff" : "var(--c-header-text)",
    borderBottom: v === "classic" || v === "split" || v === "stacked" || v === "centered" ? "1px solid var(--c-border)" : undefined,
  };
  const pos = v === "transparent" ? "absolute inset-x-0 top-0 z-40" : header.sticky && !editor ? "sticky top-0 z-40" : "relative z-40";

  return (
    <>
      {header.announcement && (
        <div className="px-4 py-2 text-center text-[12.5px]" style={{ background: "var(--c-accent)", color: "#fff" }}>{header.announcement}</div>
      )}
      <header className={pos} style={wrapStyle}>
        {v === "centered" || v === "stacked" ? (
          <div className="s-container">
            <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center">
              <div className="hidden gap-6 md:flex">{v === "centered" ? links().slice(0, Math.ceil(nav.length / 2)) : null}</div>
              <SLink href="/" className="justify-self-center"><Logo theme={theme} light={light} /></SLink>
              <div className="flex items-center justify-end gap-6">
                <div className="hidden gap-6 md:flex">{v === "centered" ? links().slice(Math.ceil(nav.length / 2)) : null}</div>
                {icons}
              </div>
            </div>
            {v === "stacked" && <nav className="hidden justify-center gap-8 border-t py-3 md:flex" style={{ borderColor: "var(--c-border)" }}>{links("uppercase tracking-[.14em] text-[12px]")}</nav>}
          </div>
        ) : v === "split" ? (
          <div className="s-container flex h-16 items-center justify-between">
            <div className="flex items-center gap-10"><SLink href="/"><Logo theme={theme} /></SLink></div>
            <nav className="hidden gap-7 md:flex">{links()}</nav>
            {icons}
          </div>
        ) : v === "minimal" ? (
          <div className="s-container flex h-16 items-center justify-between">
            <SLink href="/"><Logo theme={theme} /></SLink>
            <div className="flex items-center gap-6"><nav className="hidden gap-6 md:flex">{links("opacity-80")}</nav>{icons}</div>
          </div>
        ) : (
          <div className="s-container flex h-[68px] items-center justify-between gap-6">
            <div className="flex items-center gap-10">
              <SLink href="/"><Logo theme={theme} light={light} /></SLink>
              <nav className={`hidden gap-7 md:flex ${v === "bold" ? "uppercase tracking-[.12em] text-[12px]" : ""}`}>{links()}</nav>
            </div>
            {icons}
          </div>
        )}
      </header>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm flex-col gap-1 p-5" style={{ background: "var(--c-bg)", color: "var(--c-text)" }}>
            <button className="mb-4 self-end p-2" onClick={() => setOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            {nav.map((n, i) => <SLink key={i} href={n.href} className="border-b py-3 text-lg" style={{ borderColor: "var(--c-border)" }} onClick={() => setOpen(false)}>{n.label}</SLink>)}
            <form action="/products" className="mt-4"><input name="q" placeholder={t("search")} className="s-input" /></form>
          </div>
        </div>
      )}
    </>
  );
}

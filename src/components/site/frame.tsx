import type { FrameConfig, SiteData } from "./types";
import { themeVars, googleFontsHref } from "@/lib/site/theme";
import { SiteHeader } from "./header";
import { SiteFooter } from "./footer";

export function SiteFrame({ cfg, data, children, className, hideChrome }: { cfg: FrameConfig; data: SiteData; children: React.ReactNode; className?: string; hideChrome?: boolean }) {
  return (
    <div className={`site min-h-full ${className ?? ""}`} data-card={cfg.theme.cardStyle} data-btn={cfg.theme.buttonStyle} style={themeVars(cfg.theme) as React.CSSProperties}>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={googleFontsHref(cfg.theme)} />
      {!hideChrome && <SiteHeader theme={cfg.theme} header={cfg.header} nav={cfg.navigation} user={data.user} cartCount={data.cartCount} lang={data.lang} editor={data.editor} />}
      <main className="relative">{children}</main>
      {!hideChrome && <SiteFooter theme={cfg.theme} footer={cfg.footer} nav={cfg.navigation} categories={data.categories} collections={data.collections} lang={data.lang} />}
    </div>
  );
}

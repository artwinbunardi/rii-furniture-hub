// Server-side validation & sanitisation of a website snapshot coming from the editor.
// Never trust the client: every value is clamped, whitelisted or dropped.
import type { SiteSnapshot, SitePage, Section, Theme, HeaderConfig, FooterConfig, NavLink, PageType, SectionStyle } from "./types";
import { SYSTEM_PAGE_SLUGS } from "./types";
import { FONT_OPTIONS, DEFAULT_THEME } from "./theme";
import { SECTION_MAP } from "./registry";
import { systemPages } from "./default-site";

export class SnapshotError extends Error {}

const HEX = /^#[0-9a-f]{6}$/i;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*(\/[a-z0-9]+(-[a-z0-9]+)*)*$/;
/** URL segments that belong to the application and can never be custom page slugs. */
export const RESERVED_SLUGS = ["app", "api", "media", "preview", "builder-canvas", "login", "logout", "forgot-password", "reset-password", "invite", "forbidden", "_next",
  "products", "collections", "cart", "my-reservations", "account", "about", "contact", "sign-in"];

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
const num = (v: unknown, min: number, max: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const color = (v: unknown, d: string) => (typeof v === "string" && HEX.test(v) ? v.toLowerCase() : d);

/** Links: site-relative paths, in-page anchors, http(s), mailto and tel only. */
export function safeHref(v: unknown): string {
  const s = str(v, 500).trim();
  if (!s) return "";
  if (/^\/(?!\/)/.test(s) || s.startsWith("#")) return s;
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  return "";
}
/** Images: files from our media store or https URLs. */
export function safeImage(v: unknown): string {
  const s = str(v, 500).trim();
  if (/^\/media\/[\w\-./]+$/.test(s) && !s.includes("..")) return s;
  if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
  return "";
}

const HREF_KEY = /(href|url|link)$/i;
const IMG_KEY = /^(image\d?|img|cover|logo|_)$/i;

function cleanProps(v: unknown, depth = 0, key = ""): unknown {
  if (depth > 4) return undefined;
  if (Array.isArray(v)) return v.slice(0, 60).map((x) => cleanProps(x, depth + 1, key)).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 60)) {
      if (!/^[A-Za-z_][\w]{0,40}$/.test(k)) continue;
      const c = cleanProps(x, depth + 1, k);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  if (typeof v === "string") {
    if (HREF_KEY.test(key) && key !== "url") return safeHref(v);
    if (key === "url") return v.trim() === "" ? "" : safeHref(v);
    if (IMG_KEY.test(key) || key === "images") return safeImage(v);
    return v.slice(0, 5000);
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v;
  return undefined;
}

function cleanStyle(st: unknown): SectionStyle {
  const s = (st && typeof st === "object" ? st : {}) as Record<string, unknown>;
  const out: SectionStyle = {};
  if (s.bg) out.bg = color(s.bg, "") || undefined;
  if (s.text) out.text = color(s.text, "") || undefined;
  for (const k of ["paddingTop", "paddingBottom", "paddingX", "marginTop", "marginBottom"] as const) if (s[k] !== undefined && s[k] !== "" && s[k] !== null) out[k] = num(s[k], 0, 400, 0);
  if (s.radius !== undefined && s.radius !== "" && s.radius !== null) out.radius = num(s.radius, 0, 80, 0);
  if (s.fontSize !== undefined && s.fontSize !== "" && s.fontSize !== null) out.fontSize = num(s.fontSize, 12, 140, 40);
  if (s.fontWeight !== undefined && s.fontWeight !== "" && s.fontWeight !== null) out.fontWeight = num(s.fontWeight, 300, 900, 600);
  if (s.align) out.align = oneOf(s.align, ["left", "center", "right"] as const, "left");
  if (s.hideDesktop === true) out.hideDesktop = true;
  if (s.hideMobile === true) out.hideMobile = true;
  if (s.fullWidth === true) out.fullWidth = true;
  return out;
}

const FUNCTIONAL_PAGE: Record<string, PageType> = {
  catalog: "catalog", "product-detail": "product", "collections-list": "collections", "collection-detail": "collection",
  cart: "cart", "my-reservations": "my_reservations", "reservation-detail": "reservation", account: "account", "login-form": "login",
};

function cleanSection(raw: any, pageType: PageType): Section | null {
  const meta = SECTION_MAP[raw?.type];
  if (!meta) return null;
  if (meta.functional && FUNCTIONAL_PAGE[meta.type] !== pageType) return null; // functional blocks only on their own page
  const id = typeof raw.id === "string" && /^[\w-]{1,64}$/.test(raw.id) ? raw.id : `s_${Math.random().toString(36).slice(2, 12)}`;
  return {
    id, type: meta.type,
    variant: meta.variants.some(([v]) => v === raw.variant) ? raw.variant : meta.variants[0][0],
    props: { ...structuredClone(meta.defaults), ...((cleanProps(raw.props ?? {}) as Record<string, unknown>) ?? {}) },
    style: cleanStyle(raw.style),
    hidden: raw.hidden === true,
  };
}

function cleanTheme(t: any): Theme {
  const d = DEFAULT_THEME;
  const c = t?.colors ?? {};
  const f = t?.fonts ?? {};
  return {
    colors: Object.fromEntries(Object.entries(d.colors).map(([k, v]) => [k, color(c[k], v)])) as Theme["colors"],
    fonts: {
      heading: oneOf(f.heading, FONT_OPTIONS, d.fonts.heading as (typeof FONT_OPTIONS)[number]),
      body: oneOf(f.body, FONT_OPTIONS, d.fonts.body as (typeof FONT_OPTIONS)[number]),
      headingWeight: num(f.headingWeight, 300, 900, d.fonts.headingWeight),
      headingCase: oneOf(f.headingCase, ["none", "uppercase"] as const, "none"),
      headingTracking: num(f.headingTracking, -0.08, 0.3, d.fonts.headingTracking),
    },
    radius: num(t?.radius, 0, 40, d.radius),
    buttonRadius: num(t?.buttonRadius, 0, 999, d.buttonRadius),
    buttonStyle: oneOf(t?.buttonStyle, ["solid", "outline", "underline"] as const, d.buttonStyle),
    cardStyle: oneOf(t?.cardStyle, ["bordered", "shadow", "minimal", "overlay", "polaroid", "caption"] as const, d.cardStyle),
    imageRatio: oneOf(t?.imageRatio, ["square", "portrait", "landscape"] as const, d.imageRatio),
    containerWidth: num(t?.containerWidth, 960, 1600, d.containerWidth),
    density: oneOf(t?.density, ["compact", "comfortable", "airy"] as const, d.density),
    logoUrl: safeImage(t?.logoUrl) || null,
    logoText: str(t?.logoText, 60) || d.logoText,
    faviconUrl: safeImage(t?.faviconUrl) || null,
  };
}

function cleanHeader(h: any): HeaderConfig {
  return {
    variant: oneOf(h?.variant, ["classic", "centered", "split", "minimal", "bold", "transparent", "stacked"] as const, "classic"),
    sticky: h?.sticky !== false, showSearch: h?.showSearch !== false,
    announcement: str(h?.announcement, 200), ctaLabel: str(h?.ctaLabel, 40), ctaHref: safeHref(h?.ctaHref) || "/cart",
  };
}
function cleanFooter(f: any): FooterConfig {
  return {
    variant: oneOf(f?.variant, ["columns", "minimal", "bigtype", "centered", "split"] as const, "columns"),
    tagline: str(f?.tagline, 300), address: str(f?.address, 200), email: str(f?.email, 120), phone: str(f?.phone, 60), copyright: str(f?.copyright, 200),
  };
}
function cleanNav(n: any): NavLink[] {
  return (Array.isArray(n) ? n : []).slice(0, 12).map((x) => ({ label: str(x?.label, 40).trim(), href: safeHref(x?.href) })).filter((x) => x.label && x.href);
}

/** Validates a full snapshot. Throws SnapshotError for structural problems the user must fix. */
export function validateSnapshot(input: unknown): SiteSnapshot {
  const s = (input ?? {}) as any;
  if (!Array.isArray(s.pages)) throw new SnapshotError("Struktur website tidak valid. / Invalid website structure.");
  if (s.pages.length > 60) throw new SnapshotError("Maksimal 60 halaman. / At most 60 pages.");
  const pages: SitePage[] = [];
  const seenSlugs = new Set<string>();
  const seenTypes = new Set<string>();
  for (const raw of s.pages) {
    const type = oneOf(raw?.page_type, ["home", "catalog", "product", "collections", "collection", "about", "contact", "cart", "login", "my_reservations", "reservation", "account", "custom"] as const, "custom");
    let slug: string;
    if (type === "custom") {
      slug = str(raw?.slug, 80).trim().toLowerCase().replace(/^\/+|\/+$/g, "");
      if (!SLUG.test(slug)) throw new SnapshotError(`URL halaman "${raw?.title ?? slug}" tidak valid (huruf kecil, angka, tanda hubung). / Invalid page URL "${slug}".`);
      if (RESERVED_SLUGS.includes(slug.split("/")[0])) throw new SnapshotError(`URL "/${slug}" dipakai sistem. / URL "/${slug}" is reserved.`);
    } else {
      if (seenTypes.has(type)) throw new SnapshotError(`Halaman sistem "${type}" duplikat. / Duplicate system page.`);
      seenTypes.add(type);
      slug = SYSTEM_PAGE_SLUGS[type];
    }
    if (seenSlugs.has(slug)) throw new SnapshotError(`URL "/${slug}" dipakai lebih dari satu halaman. / URL used by more than one page.`);
    seenSlugs.add(slug);
    const sections = (Array.isArray(raw?.sections) ? raw.sections : []).slice(0, 50).map((x: unknown) => cleanSection(x, type)).filter(Boolean) as Section[];
    const ids = new Set<string>();
    for (const sec of sections) { while (ids.has(sec.id)) sec.id = `${sec.id}x`; ids.add(sec.id); }
    pages.push({
      slug, page_type: type, is_home: type === "home", is_system: type !== "custom",
      title: str(raw?.title, 80).trim() || slug || "Beranda",
      seo_title: str(raw?.seo_title, 120) || null, seo_description: str(raw?.seo_description, 300) || null,
      sections,
    });
  }
  if (!seenTypes.has("home")) throw new SnapshotError("Website harus memiliki beranda. / The website needs a homepage.");
  // every system page must exist (templates always provide them; restore any that are missing)
  for (const sp of systemPages()) if (!seenTypes.has(sp.page_type)) pages.push(sp);
  return {
    name: str(s.name, 120) || "RII Furniture Catalog",
    templateId: typeof s.templateId === "string" ? s.templateId.slice(0, 60) : null,
    theme: cleanTheme(s.theme), header: cleanHeader(s.header), footer: cleanFooter(s.footer), navigation: cleanNav(s.navigation),
    seo: { title: str(s.seo?.title, 120), description: str(s.seo?.description, 300) },
    pages,
  };
}

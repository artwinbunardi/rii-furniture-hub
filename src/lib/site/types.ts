// Website Builder data model — shared by the editor (client) and the live renderer (server).

export type ThemeColors = {
  primary: string; secondary: string; accent: string; background: string; surface: string;
  text: string; muted: string; border: string; headerBg: string; headerText: string; footerBg: string; footerText: string;
};

export type Theme = {
  colors: ThemeColors;
  fonts: { heading: string; body: string; headingWeight: number; headingCase: "none" | "uppercase"; headingTracking: number };
  radius: number;          // cards / images (px)
  buttonRadius: number;    // px (999 = pill)
  buttonStyle: "solid" | "outline" | "underline";
  cardStyle: "bordered" | "shadow" | "minimal" | "overlay" | "polaroid" | "caption";
  imageRatio: "square" | "portrait" | "landscape";
  containerWidth: number;  // px
  density: "compact" | "comfortable" | "airy";
  logoUrl: string | null;
  logoText: string;
  faviconUrl: string | null;
};

export type SectionStyle = {
  bg?: string; text?: string;
  paddingTop?: number; paddingBottom?: number; paddingX?: number;
  marginTop?: number; marginBottom?: number;
  align?: "left" | "center" | "right";
  radius?: number;
  fontSize?: number;     // heading size override (px)
  fontWeight?: number;
  hideDesktop?: boolean; hideMobile?: boolean;
  fullWidth?: boolean;
};

export type Section = {
  id: string;
  type: string;
  variant: string;
  props: Record<string, any>;
  style: SectionStyle;
  hidden?: boolean;
};

export type NavLink = { label: string; href: string };

export type HeaderConfig = {
  variant: "classic" | "centered" | "split" | "minimal" | "bold" | "transparent" | "stacked";
  sticky: boolean;
  showSearch: boolean;
  announcement: string;
  ctaLabel: string;
  ctaHref: string;
};

export type FooterConfig = {
  variant: "columns" | "minimal" | "bigtype" | "centered" | "split";
  tagline: string;
  address: string;
  email: string;
  phone: string;
  copyright: string;
};

export type PageType =
  | "home" | "catalog" | "product" | "collections" | "collection" | "about" | "contact" | "cart" | "login"
  | "my_reservations" | "reservation" | "account" | "custom";

export type SitePage = {
  id?: string;
  slug: string;
  title: string;
  page_type: PageType;
  is_home: boolean;
  is_system: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  sections: Section[];
};

export type SiteSnapshot = {
  name: string;
  templateId: string | null;
  theme: Theme;
  header: HeaderConfig;
  footer: FooterConfig;
  navigation: NavLink[];
  seo: { title?: string; description?: string };
  pages: SitePage[];
};

export const SYSTEM_PAGE_SLUGS: Record<Exclude<PageType, "custom">, string> = {
  home: "",
  catalog: "products",
  product: "products/:slug",
  collections: "collections",
  collection: "collections/:slug",
  about: "about",
  contact: "contact",
  cart: "cart",
  login: "sign-in",
  my_reservations: "my-reservations",
  reservation: "my-reservations/:id",
  account: "account",
};

import type { Theme } from "./types";

export const FONT_OPTIONS = [
  "Inter", "Manrope", "DM Sans", "Plus Jakarta Sans", "Work Sans", "Space Grotesk", "Outfit", "Sora", "Poppins", "Montserrat",
  "Playfair Display", "Cormorant Garamond", "Libre Baskerville", "DM Serif Display", "Fraunces", "Lora", "Bodoni Moda",
  "Syne", "Archivo", "Archivo Black", "Bebas Neue", "Oswald", "IBM Plex Sans", "IBM Plex Mono", "Jost", "Josefin Sans",
  "Italiana", "Marcellus", "Raleway", "Nunito Sans", "Karla", "Rubik", "Unbounded", "Instrument Serif", "Tenor Sans",
] as const;

const SERIF = new Set(["Playfair Display", "Cormorant Garamond", "Libre Baskerville", "DM Serif Display", "Fraunces", "Lora", "Bodoni Moda", "Instrument Serif", "Italiana", "Marcellus"]);
const MONO = new Set(["IBM Plex Mono"]);

export function fontStack(f: string) {
  const fallback = SERIF.has(f) ? "Georgia, 'Times New Roman', serif" : MONO.has(f) ? "ui-monospace, Menlo, monospace" : "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
  return `'${f}', ${fallback}`;
}

export function googleFontsHref(theme: Theme) {
  const fams = [...new Set([theme.fonts.heading, theme.fonts.body])];
  return `https://fonts.googleapis.com/css2?${fams.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`).join("&")}&display=swap`;
}

export const DEFAULT_THEME: Theme = {
  colors: {
    primary: "#1f1f23", secondary: "#f4efe7", accent: "#b08d57", background: "#ffffff", surface: "#f7f6f3",
    text: "#1b1b1d", muted: "#6b6b73", border: "#e8e6e1", headerBg: "#ffffff", headerText: "#1b1b1d", footerBg: "#151515", footerText: "#e9e7e2",
  },
  fonts: { heading: "Inter", body: "Inter", headingWeight: 600, headingCase: "none", headingTracking: -0.02 },
  radius: 14,
  buttonRadius: 10,
  buttonStyle: "solid",
  cardStyle: "bordered",
  imageRatio: "landscape",
  containerWidth: 1240,
  density: "comfortable",
  logoUrl: null,
  logoText: "RII Furniture",
  faviconUrl: null,
};

/** CSS custom properties consumed by the site components (see site.css). */
export function themeVars(t: Theme): Record<string, string> {
  const c = t.colors;
  const gap = t.density === "compact" ? 0.75 : t.density === "airy" ? 1.35 : 1;
  return {
    "--c-primary": c.primary, "--c-secondary": c.secondary, "--c-accent": c.accent, "--c-bg": c.background,
    "--c-surface": c.surface, "--c-text": c.text, "--c-muted": c.muted, "--c-border": c.border,
    "--c-header-bg": c.headerBg, "--c-header-text": c.headerText, "--c-footer-bg": c.footerBg, "--c-footer-text": c.footerText,
    "--c-on-primary": readableOn(c.primary),
    "--font-heading": fontStack(t.fonts.heading), "--font-body": fontStack(t.fonts.body),
    "--heading-weight": String(t.fonts.headingWeight), "--heading-case": t.fonts.headingCase,
    "--heading-tracking": `${t.fonts.headingTracking}em`,
    "--radius": `${t.radius}px`, "--btn-radius": `${t.buttonRadius}px`, "--container": `${t.containerWidth}px`,
    "--space": String(gap),
    "--img-ratio": t.imageRatio === "square" ? "1 / 1" : t.imageRatio === "portrait" ? "4 / 5" : "4 / 3",
  };
}

export function readableOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#ffffff";
}

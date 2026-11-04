import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "Asia/Jakarta";

/** Today's date (YYYY-MM-DD) in Asia/Jakarta. */
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function fmtDate(iso: string | null | undefined, lang: "id" | "en" = "id") {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00+07:00" : iso);
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function fmtDateTime(iso: string | Date | null | undefined, lang: "id" | "en" = "id") {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

export function fmtNum(n: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(n ?? 0);
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 864e5);
}

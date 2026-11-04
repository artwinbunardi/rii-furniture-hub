"use server";
import { revalidatePath } from "next/cache";
import { authorize } from "@/lib/auth/session";
import { run, str, int, type ActionState } from "@/lib/action";
import { AppError } from "@/lib/errors";
import { withTx } from "@/lib/db";
import * as web from "@/lib/services/website";
import { saveUpload, replaceMedia, deleteMedia } from "@/lib/services/media";
import { audit } from "@/lib/services/audit";
import { makeSection } from "@/lib/site/registry";
import { RESERVED_SLUGS } from "@/lib/site/validate";
import type { SiteSnapshot, SitePage } from "@/lib/site/types";
import { slugify } from "@/lib/utils";

const refresh = () => { revalidatePath("/app/builder", "layout"); revalidatePath("/", "layout"); };

/* ── Editor ───────────────────────────────────────────────────────────── */
export async function saveDraftAction(json: string, rev: number): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("website.edit");
    if (json.length > 2_000_000) throw new AppError("Draf terlalu besar. / Draft is too large.");
    let parsed: unknown;
    try { parsed = JSON.parse(json); } catch { throw new AppError("Data draf rusak. / Corrupt draft data."); }
    const r = await web.saveDraft(u, parsed, rev);
    refresh();
    return { ok: true, message: "Draf disimpan. / Draft saved.", data: { rev: r.rev, snapshot: r.snapshot } };
  });
}

export async function publishAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("website.publish");
    const r = await web.publishDraft(u, str(fd, "note"));
    refresh();
    return { ok: true, message: `Versi ${r.versionNo} dipublikasikan — website langsung diperbarui. / Version ${r.versionNo} is live.`, data: { versionNo: r.versionNo } };
  });
}

export async function restoreVersionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const publish = str(fd, "publish") === "1";
    const u = await authorize(publish ? "website.publish" : "website.edit");
    const r = await web.restoreVersion(u, int(fd, "id"), publish);
    refresh();
    return { ok: true, message: publish ? `Dipulihkan dan dipublikasikan sebagai versi ${r.versionNo}. / Restored and published.` : `Versi ${r.versionNo} dimuat ke draf. / Version loaded into the draft.` };
  });
}

export async function applyTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("website.edit");
    await web.applyTemplate(u, str(fd, "id"), { keepCustomPages: fd.get("keep_pages") === "on", keepBranding: fd.get("keep_branding") === "on" });
    refresh();
    return { ok: true, message: "Template diterapkan ke draf. Website live tidak berubah sampai Anda mempublikasikan. / Template applied to the draft — the live site changes only when you publish." };
  });
}

/* ── Draft mutations used by the Pages / Theme / Navigation / SEO screens ── */
async function mutateDraft(perm: string, fd: FormData, fn: (s: SiteSnapshot) => void | string) {
  const u = await authorize(perm);
  const { snapshot, meta } = await web.getDraft(u.ctx);
  const rev = fd.has("rev") ? int(fd, "rev") : meta.rev;
  const msg = fn(snapshot);
  await web.saveDraft(u, snapshot, rev);
  refresh();
  return { ok: true, message: (msg as string) || "Draf disimpan. / Draft saved." };
}

const findPage = (s: SiteSnapshot, slug: string) => {
  const p = s.pages.find((x) => x.slug === slug);
  if (!p) throw new AppError("Halaman tidak ditemukan. / Page not found.");
  return p;
};
function freeSlug(s: SiteSnapshot, base: string) {
  let slug = slugify(base) || "halaman";
  if (RESERVED_SLUGS.includes(slug)) slug = `${slug}-page`;
  let i = 2; const b = slug;
  while (s.pages.some((p) => p.slug === slug)) slug = `${b}-${i++}`;
  return slug;
}
const cloneSections = (p: SitePage) => p.sections.map((x) => ({ ...structuredClone(x), id: makeSection(x.type).id }));

export async function pageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => mutateDraft("website.edit", fd, (s) => {
    const op = str(fd, "op");
    const slug = str(fd, "slug");
    switch (op) {
      case "create": {
        const title = str(fd, "title").trim();
        if (title.length < 2) throw new AppError("Judul halaman wajib diisi. / Page title is required.");
        const newSlug = str(fd, "new_slug") ? slugify(str(fd, "new_slug")) : freeSlug(s, title);
        const tpl = str(fd, "starter");
        const sections = tpl === "landing" ? [makeSection("hero", "minimal", { heading: title, eyebrow: "", subheading: "" }), makeSection("featured-products", "grid"), makeSection("reservation-cta", "band")]
          : tpl === "faq" ? [makeSection("hero", "minimal", { heading: title, eyebrow: "", subheading: "" }), makeSection("faq", "two-column")]
          : [makeSection("custom-content", "single", { heading: title, body: "Tulis konten Anda di sini." })];
        s.pages.push({ slug: newSlug, title, page_type: "custom", is_home: false, is_system: false, sections, seo_title: null, seo_description: null });
        return `Halaman "/${newSlug}" dibuat di draf. / Page created in the draft.`;
      }
      case "rename": { const p = findPage(s, slug); p.title = str(fd, "title").trim() || p.title; return "Nama halaman diubah. / Page renamed."; }
      case "slug": {
        const p = findPage(s, slug);
        if (p.is_system) throw new AppError("URL halaman sistem tidak dapat diubah. / System page URLs are fixed.");
        const ns = slugify(str(fd, "new_slug")) || p.slug;
        if (s.pages.some((x) => x !== p && x.slug === ns)) throw new AppError(`URL "/${ns}" sudah dipakai. / URL already used.`);
        s.navigation.forEach((n) => { if (n.href === `/${p.slug}`) n.href = `/${ns}`; });
        p.slug = ns; return `URL diubah menjadi /${ns}. Tautan navigasi ikut diperbarui. / URL changed; navigation links updated.`;
      }
      case "seo": { const p = findPage(s, slug); p.seo_title = str(fd, "seo_title") || null; p.seo_description = str(fd, "seo_description") || null; return "SEO halaman disimpan. / Page SEO saved."; }
      case "duplicate": {
        const p = findPage(s, slug);
        const ns = freeSlug(s, `${p.slug || "beranda"}-salinan`);
        s.pages.push({ ...structuredClone(p), id: undefined, slug: ns, title: `${p.title} (salinan)`, page_type: "custom", is_home: false, is_system: false, sections: cloneSections(p).filter((x) => !["catalog", "product-detail", "collections-list", "collection-detail", "cart", "my-reservations", "reservation-detail", "account", "login-form"].includes(x.type)) });
        return `Disalin ke /${ns}. / Duplicated.`;
      }
      case "delete": {
        const p = findPage(s, slug);
        if (p.is_system) throw new AppError("Halaman sistem tidak dapat dihapus. Sembunyikan bagiannya saja. / System pages cannot be deleted.");
        s.pages = s.pages.filter((x) => x !== p);
        s.navigation = s.navigation.filter((n) => n.href !== `/${p.slug}`);
        return "Halaman dihapus dari draf. / Page deleted from the draft.";
      }
      case "set_home": {
        // the homepage URL is "/", so "setting" another page as home swaps the two pages' content
        const p = findPage(s, slug);
        if (p.page_type !== "custom") throw new AppError("Hanya halaman kustom yang dapat dijadikan beranda. / Only custom pages can become the homepage.");
        const home = s.pages.find((x) => x.is_home)!;
        [home.sections, p.sections] = [p.sections, home.sections];
        [home.title, p.title] = [p.title, home.title];
        return `Konten "/${p.slug}" kini menjadi beranda; beranda lama dipindah ke /${p.slug}. / Homepage swapped.`;
      }
      default: throw new AppError("Operasi tidak dikenal.");
    }
  }));
}

export async function themeAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => mutateDraft("website.edit", fd, (s) => {
    const c = s.theme.colors as Record<string, string>;
    for (const k of Object.keys(c)) if (fd.has(`c_${k}`)) c[k] = str(fd, `c_${k}`);
    const t = s.theme as any;
    for (const k of ["buttonStyle", "cardStyle", "imageRatio", "density", "logoText"]) if (fd.has(k)) t[k] = str(fd, k);
    for (const k of ["radius", "buttonRadius", "containerWidth"]) if (fd.has(k)) t[k] = Number(str(fd, k));
    if (fd.has("logoUrl")) t.logoUrl = str(fd, "logoUrl") || null;
    if (fd.has("faviconUrl")) t.faviconUrl = str(fd, "faviconUrl") || null;
    if (fd.has("headingFont")) s.theme.fonts.heading = str(fd, "headingFont");
    if (fd.has("bodyFont")) s.theme.fonts.body = str(fd, "bodyFont");
    if (fd.has("headingWeight")) s.theme.fonts.headingWeight = Number(str(fd, "headingWeight"));
    if (fd.has("headingCase")) s.theme.fonts.headingCase = str(fd, "headingCase") as any;
    if (fd.has("headerVariant")) s.header.variant = str(fd, "headerVariant") as any;
    if (fd.has("headerVariant")) { s.header.sticky = fd.get("headerSticky") === "on"; s.header.showSearch = fd.get("headerSearch") === "on"; }
    if (fd.has("footerVariant")) s.footer.variant = str(fd, "footerVariant") as any;
    return "Tema disimpan ke draf. / Theme saved to the draft.";
  }));
}

export async function navigationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => mutateDraft("website.edit", fd, (s) => {
    const labels = fd.getAll("nav_label").map(String), hrefs = fd.getAll("nav_href").map(String);
    s.navigation = labels.map((label, i) => ({ label, href: hrefs[i] ?? "" })).filter((n) => n.label.trim() && n.href.trim());
    s.header.ctaLabel = str(fd, "ctaLabel"); s.header.ctaHref = str(fd, "ctaHref") || "/cart"; s.header.announcement = str(fd, "announcement");
    for (const k of ["tagline", "address", "email", "phone", "copyright"] as const) s.footer[k] = str(fd, k);
    return "Navigasi & footer disimpan ke draf. / Navigation saved to the draft.";
  }));
}

export async function seoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(() => mutateDraft("website.edit", fd, (s) => {
    s.seo = { title: str(fd, "seo_title").slice(0, 120), description: str(fd, "seo_description").slice(0, 320) };
    s.name = str(fd, "name").trim() || s.name;
    return "SEO disimpan ke draf (berlaku setelah dipublikasikan). / SEO saved to the draft (goes live when published).";
  }));
}

/** Access & domain settings are configuration, not page content: they apply immediately. */
export async function siteAccessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("website.publish");
    await web.updateSiteSettings(u, { requireLogin: fd.get("require_login") === "on", domain: { custom: str(fd, "domain"), subdomain: str(fd, "subdomain") } });
    refresh();
    return { ok: true, message: "Pengaturan akses & domain disimpan. / Access & domain settings saved." };
  });
}

/* ── Media library ─────────────────────────────────────────────────────── */
export async function uploadMediaAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("media.manage");
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) throw new AppError("Pilih minimal satu file. / Choose at least one file.");
    if (files.length > 20) throw new AppError("Maksimal 20 file sekaligus. / At most 20 files at once.");
    const rows = await withTx(u.ctx, async (tx) => {
      const out = [];
      for (const f of files) out.push(await saveUpload(tx, u, f, str(fd, "category") || "general", str(fd, "alt") || undefined, str(fd, "folder") || undefined));
      await audit(tx, u.id, "media.upload", "media", null, `Uploaded ${files.length} file(s)`);
      return out;
    });
    revalidatePath("/app/builder/media");
    return { ok: true, message: `${rows.length} file diunggah. / uploaded.`, data: { items: rows.map((r) => ({ id: r.id, url: `/media/${r.storage_key}`, name: r.filename })) } };
  });
}

export async function mediaOpAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => {
    const u = await authorize("media.manage");
    const id = str(fd, "id");
    const op = str(fd, "op");
    if (op === "replace") {
      const f = fd.get("file");
      if (!(f instanceof File) || !f.size) throw new AppError("Pilih file pengganti. / Choose a replacement file.");
      await replaceMedia(u, id, f);
      await withTx(u.ctx, (tx) => audit(tx, u.id, "media.replace", "media", id, `Replaced media file`));
    } else if (op === "delete") {
      await deleteMedia(u, id);
      await withTx(u.ctx, (tx) => audit(tx, u.id, "media.delete", "media", id, `Deleted media`));
    } else if (op === "meta") {
      await withTx(u.ctx, async (tx) => {
        const cat = str(fd, "category");
        const r = await tx.query(`UPDATE media_assets SET alt_text = nullif($2,''), category = CASE WHEN $3 IN ('product','banner','logo','favicon','general','gallery') THEN $3 ELSE category END, folder = nullif($4,''), updated_at = now() WHERE id = $1`, [id, str(fd, "alt").slice(0, 300), cat, str(fd, "folder").slice(0, 60)]);
        if (!r.rowCount) throw new AppError("Media tidak ditemukan.");
      });
    } else throw new AppError("Operasi tidak dikenal.");
    revalidatePath("/app/builder/media");
    return { ok: true, message: op === "delete" ? "Media dihapus. / Deleted." : op === "replace" ? "File diganti — semua tautan tetap berfungsi. / File replaced." : "Disimpan. / Saved." };
  });
}

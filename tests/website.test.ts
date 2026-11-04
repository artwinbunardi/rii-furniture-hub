import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { resetData, actor, admin } from "./helpers";
import * as web from "../src/lib/services/website";
import { validateSnapshot, safeHref } from "../src/lib/site/validate";
import { TEMPLATES, TEMPLATE_CATEGORIES, templateSnapshot, templateFingerprint } from "../src/lib/site/templates";
import { SECTIONS, makeSection } from "../src/lib/site/registry";
import { withTx, closePool } from "../src/lib/db";
import type { CurrentUser } from "../src/lib/auth/user";
import type { SiteSnapshot } from "../src/lib/site/types";

let adminU: CurrentUser, manager: CurrentUser, decor: CurrentUser, editorOnly: CurrentUser;

/** The published snapshot, exactly as the live site reads it. */
const liveSnapshot = () => admin(async (c) => (await c.query(`SELECT v.snapshot, v.version_no FROM websites w JOIN website_versions v ON v.id = w.published_version_id WHERE w.is_primary`)).rows[0]);
const home = (s: SiteSnapshot) => s.pages.find((p) => p.is_home)!;

beforeAll(async () => {
  await resetData();
  [adminU, manager, decor] = await Promise.all(["admin@rii.demo", "manager@rii.demo", "decor@rii.demo"].map(actor));
  // a content editor: may edit drafts but not publish
  const perms = [...manager.perms, "website.edit", "media.manage"];
  editorOnly = { ...manager, perms, ctx: { ...manager.ctx, perms } };
});
afterAll(async () => { await closePool(); });

describe("Templates", () => {
  it("ships 50 templates, 5 in each of the 10 categories, all valid and visually distinct", () => {
    expect(TEMPLATES).toHaveLength(50);
    for (const [cat] of TEMPLATE_CATEGORIES) expect(TEMPLATES.filter((t) => t.category === cat)).toHaveLength(5);
    const prints = new Set<string>(), homes = new Set<string>();
    for (const t of TEMPLATES) {
      const s = templateSnapshot(t.id)!;
      expect(() => validateSnapshot(s)).not.toThrow();
      prints.add(templateFingerprint(s));
      homes.add(home(s).sections.map((x) => `${x.type}:${x.variant}`).join("|"));
    }
    expect(prints.size).toBe(50);
    expect(homes.size).toBe(50);
  });

  it("every section type in the registry is used by at least one template and can be created", () => {
    const used = new Set(TEMPLATES.flatMap((t) => templateSnapshot(t.id)!.pages.flatMap((p) => p.sections.map((s) => s.type))));
    for (const s of SECTIONS.filter((x) => !x.functional)) {
      expect(makeSection(s.type).type).toBe(s.type);
      expect(used.has(s.type), `${s.type} unused`).toBe(true);
    }
  });

  it("templates are seeded as configuration rows in the database", async () => {
    const n = await admin(async (c) => (await c.query(`SELECT count(*)::int n FROM website_templates`)).rows[0].n);
    expect(n).toBe(50);
  });
});

describe("Snapshot validation (never trust the editor)", () => {
  it("strips unsafe links and images", () => {
    expect(safeHref("javascript:alert(1)")).toBe("");
    expect(safeHref(" JaVaScRiPt:alert(1)")).toBe("");
    expect(safeHref("data:text/html,x")).toBe("");
    expect(safeHref("/products?x=1")).toBe("/products?x=1");
    expect(safeHref("https://example.com")).toBe("https://example.com");
    const s = templateSnapshot("min-line")!;
    home(s).sections.unshift(makeSection("hero", "split", { ctaHref: "javascript:alert(1)", image: "javascript:x", heading: "<img src=x onerror=alert(1)>" }) as any);
    s.navigation.push({ label: "x", href: "javascript:alert(document.cookie)" });
    const v = validateSnapshot(s);
    const hero = home(v).sections[0];
    expect(hero.props.ctaHref).toBe("");
    expect(hero.props.image).toBe("");
    expect(hero.props.heading).toBe("<img src=x onerror=alert(1)>"); // stored as text; React escapes it on render
    expect(v.navigation.some((n) => n.href.startsWith("javascript"))).toBe(false);
  });

  it("rejects reserved and duplicate slugs, unknown sections, and functional sections outside their page", () => {
    const s = templateSnapshot("min-line")!;
    s.pages.push({ slug: "app", title: "Bad", page_type: "custom", is_home: false, is_system: false, sections: [] });
    expect(() => validateSnapshot(s)).toThrow(/reserved|dipakai sistem/);
    const d = templateSnapshot("min-line")!;
    d.pages.push({ slug: "promo", title: "A", page_type: "custom", is_home: false, is_system: false, sections: [] }, { slug: "promo", title: "B", page_type: "custom", is_home: false, is_system: false, sections: [] });
    expect(() => validateSnapshot(d)).toThrow();
    const u = templateSnapshot("min-line")!;
    home(u).sections.push({ id: "x1", type: "evil-widget", variant: "a", props: {}, style: {} });
    home(u).sections.push({ id: "x2", type: "cart", variant: "two-column", props: {}, style: {} });
    const vu = validateSnapshot(u);
    expect(home(vu).sections.some((x) => x.type === "evil-widget" || x.type === "cart")).toBe(false);
  });

  it("clamps theme values and whitelists fonts and colors", () => {
    const s = templateSnapshot("min-line")!;
    (s.theme as any).containerWidth = 99999;
    (s.theme.colors as any).primary = "red; background:url(x)";
    (s.theme.fonts as any).heading = "Comic Sans'; }";
    const v = validateSnapshot(s);
    expect(v.theme.containerWidth).toBe(1600);
    expect(v.theme.colors.primary).toMatch(/^#[0-9a-f]{6}$/i);
    expect(v.theme.fonts.heading).not.toContain("Comic");
  });
});

describe("Draft → publish → restore", () => {
  it("saving a draft does not change the live website", async () => {
    const before = await liveSnapshot();
    const { snapshot, meta } = await web.getDraft(adminU.ctx);
    home(snapshot).sections[0].props.heading = "Judul draf baru";
    await web.saveDraft(adminU, snapshot, meta.rev);
    const after = await liveSnapshot();
    expect(after.version_no).toBe(before.version_no);
    expect(JSON.stringify(after.snapshot)).not.toContain("Judul draf baru");
    const d = await web.getDraft(adminU.ctx);
    expect(JSON.stringify(d.snapshot)).toContain("Judul draf baru");
    expect(d.meta.changedSincePublish).toBe(true);
  });

  it("refuses a stale draft revision (no silent overwrite of someone else's edits)", async () => {
    const { snapshot, meta } = await web.getDraft(adminU.ctx);
    await web.saveDraft(adminU, snapshot, meta.rev);
    await expect(web.saveDraft(adminU, snapshot, meta.rev)).rejects.toThrow(/elsewhere|tempat lain/);
  });

  it("publishing makes the draft live as a new version", async () => {
    const r = await web.publishDraft(adminU, "uji publikasi");
    const live = await liveSnapshot();
    expect(live.version_no).toBe(r.versionNo);
    expect(JSON.stringify(live.snapshot)).toContain("Judul draf baru");
    expect((await web.getDraft(adminU.ctx)).meta.changedSincePublish).toBe(false);
  });

  it("restore loads an old version into the draft only; restore+publish makes it live", async () => {
    const versions = await web.listVersions(adminU.ctx);
    const v1 = versions.find((v) => v.version_no === 1)!;
    await web.restoreVersion(adminU, v1.id, false);
    expect(JSON.stringify((await liveSnapshot()).snapshot)).toContain("Judul draf baru");
    expect(JSON.stringify((await web.getDraft(adminU.ctx)).snapshot)).not.toContain("Judul draf baru");
    const r = await web.restoreVersion(adminU, v1.id, true);
    const live = await liveSnapshot();
    expect(live.version_no).toBe(r.versionNo);
    expect(JSON.stringify(live.snapshot)).not.toContain("Judul draf baru");
  });

  it("applying a template changes only the draft and keeps custom pages and branding", async () => {
    const { snapshot, meta } = await web.getDraft(adminU.ctx);
    snapshot.pages.push({ slug: "paket-wedding", title: "Paket Wedding", page_type: "custom", is_home: false, is_system: false, sections: [makeSection("custom-content") as any] });
    snapshot.theme.logoUrl = "/media/demo/rii-logo.svg";
    await web.saveDraft(adminU, snapshot, meta.rev);
    const liveBefore = await liveSnapshot();
    await web.applyTemplate(adminU, "lux-noir-or", { keepCustomPages: true, keepBranding: true });
    const d = await web.getDraft(adminU.ctx);
    expect(d.snapshot.templateId).toBe("lux-noir-or");
    expect(d.snapshot.pages.some((p) => p.slug === "paket-wedding")).toBe(true);
    expect(d.snapshot.theme.logoUrl).toBe("/media/demo/rii-logo.svg");
    expect((await liveSnapshot()).version_no).toBe(liveBefore.version_no);
    await web.applyTemplate(adminU, "min-line", { keepCustomPages: false, keepBranding: false });
    expect((await web.getDraft(adminU.ctx)).snapshot.pages.some((p) => p.slug === "paket-wedding")).toBe(false);
  });

  it("summarises pending changes for the publish screen", async () => {
    const live = (await liveSnapshot()).snapshot;
    const { snapshot } = await web.getDraft(adminU.ctx);
    const d = web.diffSnapshots(validateSnapshot(live), validateSnapshot(snapshot));
    expect(d.theme || d.changed.length > 0).toBe(true);
    expect(web.diffSnapshots(validateSnapshot(live), validateSnapshot(live)).changed).toEqual([]);
  });
});

describe("Builder permissions (service AND database)", () => {
  it("users without website.edit cannot save drafts", async () => {
    const { snapshot } = await web.getDraft(adminU.ctx);
    await expect(web.saveDraft(decor, snapshot, null)).rejects.toThrow();
    await expect(web.saveDraft(manager, snapshot, null)).rejects.toThrow();
    // and the database refuses direct writes too
    const r = await withTx(decor.ctx, (tx) => tx.query(`UPDATE website_sections SET props = '{}'`));
    expect(r.rowCount).toBe(0);
  });

  it("an editor can save drafts but cannot publish or change access settings", async () => {
    const { snapshot, meta } = await web.getDraft(editorOnly.ctx);
    await expect(web.saveDraft(editorOnly, snapshot, meta.rev)).resolves.toBeTruthy();
    await expect(web.publishDraft(editorOnly)).rejects.toThrow();
    const versions = await web.listVersions(editorOnly.ctx);
    await expect(web.restoreVersion(editorOnly, versions[0].id, true)).rejects.toThrow();
    // bypassing the service: the publish guard trigger + RLS still refuse
    await expect(withTx(editorOnly.ctx, (tx) => tx.query(`UPDATE websites SET published_version_id = $1 WHERE is_primary`, [versions[versions.length - 1].id]))).rejects.toThrow(/website.publish|permission/);
    await expect(withTx(editorOnly.ctx, (tx) => tx.query(`INSERT INTO website_versions(website_id, version_no, snapshot, published_by) SELECT id, 999, '{}', $1 FROM websites LIMIT 1`, [editorOnly.id]))).rejects.toThrow(/row-level security/);
  });

  it("published versions are immutable", async () => {
    await expect(admin(async (c) => {
      // even through the app role (not the owner) UPDATE/DELETE are revoked
      await c.query(`SET ROLE rii_app`);
      try { return await c.query(`DELETE FROM website_versions`); } finally { await c.query(`RESET ROLE`); }
    })).rejects.toThrow(/permission denied/);
  });

  it("validates domain settings", async () => {
    await expect(web.updateSiteSettings(adminU, { requireLogin: true, domain: { custom: "not a domain" } })).rejects.toThrow();
    await expect(web.updateSiteSettings(adminU, { requireLogin: true, domain: { custom: "furniture.rii.co.id", subdomain: "furniture" } })).resolves.toBeUndefined();
  });
});

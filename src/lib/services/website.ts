import { withTx, type Tx, type DbCtx } from "../db";
import { AppError, ForbiddenError } from "../errors";
import { hasPerm } from "../rbac";
import type { SiteSnapshot, SitePage } from "../site/types";
import { validateSnapshot, SnapshotError } from "../site/validate";
import { templateSnapshot } from "../site/templates";
import { audit } from "./audit";
import type { Actor } from "./reservations";

export type DraftMeta = {
  websiteId: string; rev: number; templateId: string | null; requireLogin: boolean; domain: Record<string, any>;
  publishedVersionId: number | null; publishedVersionNo: number | null; publishedAt: string | null; draftUpdatedAt: string; changedSincePublish: boolean;
};

function need(actor: Actor, perm: string) { if (!hasPerm(actor.perms, perm)) throw new ForbiddenError(); }

async function primaryWebsite(tx: Tx, lock = false) {
  const w = (await tx.query(`SELECT * FROM websites WHERE is_primary ${lock ? "FOR UPDATE" : ""}`)).rows[0];
  if (!w) throw new AppError("Website utama belum dibuat. Jalankan seed. / Primary website missing — run the seed.");
  return w;
}

/** Assemble the draft snapshot from the normalised draft tables. */
async function readDraft(tx: Tx, w: any): Promise<SiteSnapshot> {
  // sequential: a single pg client must not run concurrent queries
  const theme = await tx.query(`SELECT theme FROM website_themes WHERE website_id = $1`, [w.id]);
  const settings = await tx.query(`SELECT * FROM website_settings WHERE website_id = $1`, [w.id]);
  const pages = await tx.query(`SELECT * FROM website_pages WHERE website_id = $1 ORDER BY sort, slug`, [w.id]);
  const sections = await tx.query(`SELECT s.* FROM website_sections s JOIN website_pages p ON p.id = s.page_id WHERE p.website_id = $1 ORDER BY s.sort`, [w.id]);
  const st = settings.rows[0] ?? {};
  return {
    name: w.name, templateId: w.template_id,
    theme: theme.rows[0]?.theme,
    header: st.header, footer: st.footer, navigation: st.navigation ?? [], seo: st.seo ?? {},
    pages: pages.rows.map((p): SitePage => ({
      id: p.id, slug: p.slug, title: p.title, page_type: p.page_type, is_home: p.is_home, is_system: p.is_system,
      seo_title: p.seo_title, seo_description: p.seo_description,
      sections: sections.rows.filter((s) => s.page_id === p.id).map((s) => ({ id: s.id, type: s.type, variant: s.variant, props: s.props, style: s.style, hidden: s.hidden })),
    })),
  };
}

/** Replace the draft tables with a (validated) snapshot. */
async function writeDraft(tx: Tx, websiteId: string, snap: SiteSnapshot) {
  await tx.query(`UPDATE websites SET name = $2, template_id = $3, draft_updated_at = now(), draft_rev = draft_rev + 1 WHERE id = $1`, [websiteId, snap.name, snap.templateId && (await tx.query(`SELECT 1 FROM website_templates WHERE id = $1`, [snap.templateId])).rowCount ? snap.templateId : null]);
  await tx.query(`INSERT INTO website_themes(website_id, theme) VALUES ($1, $2) ON CONFLICT (website_id) DO UPDATE SET theme = EXCLUDED.theme`, [websiteId, snap.theme]);
  await tx.query(
    `INSERT INTO website_settings(website_id, header, footer, navigation, seo) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (website_id) DO UPDATE SET header = EXCLUDED.header, footer = EXCLUDED.footer, navigation = EXCLUDED.navigation, seo = EXCLUDED.seo`,
    [websiteId, snap.header, snap.footer, JSON.stringify(snap.navigation), snap.seo],
  );
  await tx.query(`DELETE FROM website_pages WHERE website_id = $1`, [websiteId]);
  for (const [i, p] of snap.pages.entries()) {
    const pid = (await tx.query(
      `INSERT INTO website_pages(website_id, slug, title, page_type, is_home, is_system, seo_title, seo_description, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [websiteId, p.slug, p.title, p.page_type, p.is_home, p.is_system, p.seo_title ?? null, p.seo_description ?? null, i],
    )).rows[0].id;
    for (const [j, s] of p.sections.entries()) {
      await tx.query(`INSERT INTO website_sections(id, page_id, type, variant, props, style, sort, hidden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [s.id, pid, s.type, s.variant, s.props, s.style ?? {}, j, !!s.hidden]);
    }
  }
}

/** Canonical JSON (sorted keys, page ids dropped): jsonb reorders keys, so plain stringify can't compare snapshots. */
function canon(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).filter((k) => (v as any)[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canon((v as any)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}
const strip = (s: SiteSnapshot) => canon({ ...s, pages: s.pages.map(({ id: _id, ...p }) => p) });

export async function getDraft(ctx: DbCtx): Promise<{ snapshot: SiteSnapshot; meta: DraftMeta }> {
  return withTx(ctx, async (tx) => {
    const w = await primaryWebsite(tx);
    const snapshot = await readDraft(tx, w);
    const st = (await tx.query(`SELECT require_login, domain FROM website_settings WHERE website_id = $1`, [w.id])).rows[0] ?? {};
    const pub = w.published_version_id ? (await tx.query(`SELECT id, version_no, snapshot, published_at FROM website_versions WHERE id = $1`, [w.published_version_id])).rows[0] : null;
    return {
      snapshot,
      meta: {
        websiteId: w.id, rev: w.draft_rev, templateId: w.template_id, requireLogin: st.require_login ?? true, domain: st.domain ?? {},
        publishedVersionId: pub?.id ?? null, publishedVersionNo: pub?.version_no ?? null, publishedAt: pub?.published_at?.toISOString?.() ?? null,
        draftUpdatedAt: w.draft_updated_at.toISOString(),
        changedSincePublish: !pub || strip(validateSnapshot(pub.snapshot)) !== strip(validateSnapshot(snapshot)),
      },
    };
  });
}

/** Save the editor's snapshot as the new draft. `rev` guards against overwriting someone else's newer draft. */
export async function saveDraft(actor: Actor, input: unknown, rev: number | null) {
  need(actor, "website.edit");
  let snap: SiteSnapshot;
  try { snap = validateSnapshot(input); } catch (e) { if (e instanceof SnapshotError) throw new AppError(e.message); throw e; }
  return withTx(actor.ctx, async (tx) => {
    const w = await primaryWebsite(tx, true);
    if (rev !== null && w.draft_rev !== rev) throw new AppError("Draf telah diubah di tempat lain sejak Anda membukanya. Muat ulang editor untuk melihat versi terbaru. / The draft was changed elsewhere — reload the editor.");
    await writeDraft(tx, w.id, snap);
    await audit(tx, actor.id, "website.draft_save", "website", w.id, `Saved website draft (${snap.pages.length} pages)`);
    return { rev: (w.draft_rev as number) + 1, snapshot: snap };
  });
}

/** Apply a template to the draft. Keeps logo/favicon, footer contact details and custom pages unless `fresh`. */
export async function applyTemplate(actor: Actor, templateId: string, opts: { keepCustomPages?: boolean; keepBranding?: boolean } = {}) {
  need(actor, "website.edit");
  const tpl = templateSnapshot(templateId);
  if (!tpl) throw new AppError("Template tidak ditemukan. / Template not found.");
  return withTx(actor.ctx, async (tx) => {
    const w = await primaryWebsite(tx, true);
    const current = await readDraft(tx, w);
    if (opts.keepBranding !== false && current.theme) {
      tpl.theme.logoUrl = current.theme.logoUrl ?? null;
      tpl.theme.faviconUrl = current.theme.faviconUrl ?? null;
      if (current.theme.logoText) tpl.theme.logoText = current.theme.logoText;
      if (current.footer) Object.assign(tpl.footer, { address: current.footer.address, email: current.footer.email, phone: current.footer.phone });
    }
    if (opts.keepCustomPages !== false) tpl.pages.push(...current.pages.filter((p) => p.page_type === "custom"));
    const snap = validateSnapshot(tpl);
    await writeDraft(tx, w.id, snap);
    await audit(tx, actor.id, "website.template_apply", "website", w.id, `Applied template ${templateId} to draft`);
  });
}

export async function publishDraft(actor: Actor, note?: string) {
  need(actor, "website.publish");
  return withTx(actor.ctx, async (tx) => {
    const w = await primaryWebsite(tx, true);
    const snap = validateSnapshot(await readDraft(tx, w));
    const no = (await tx.query(`SELECT coalesce(max(version_no), 0) + 1 AS n FROM website_versions WHERE website_id = $1`, [w.id])).rows[0].n;
    const v = (await tx.query(`INSERT INTO website_versions(website_id, version_no, snapshot, note, published_by) VALUES ($1,$2,$3,$4,$5) RETURNING id`, [w.id, no, snap, note?.slice(0, 300) || null, actor.id])).rows[0];
    await tx.query(`UPDATE websites SET published_version_id = $2 WHERE id = $1`, [w.id, v.id]);
    await audit(tx, actor.id, "website.publish", "website", w.id, `Published website version ${no}${note ? `: ${note}` : ""}`);
    return { versionNo: no as number, versionId: v.id as number };
  });
}

/** Load an old version into the draft (website.edit). With `publish`, also make it live as a new version (website.publish). */
export async function restoreVersion(actor: Actor, versionId: number, publish: boolean) {
  need(actor, publish ? "website.publish" : "website.edit");
  const versionNo = await withTx(actor.ctx, async (tx) => {
    const w = await primaryWebsite(tx, true);
    const v = (await tx.query(`SELECT version_no, snapshot FROM website_versions WHERE id = $1 AND website_id = $2`, [versionId, w.id])).rows[0];
    if (!v) throw new AppError("Versi tidak ditemukan. / Version not found.");
    await writeDraft(tx, w.id, validateSnapshot(v.snapshot));
    await audit(tx, actor.id, "website.restore", "website", w.id, `Restored version ${v.version_no} into the draft`);
    return v.version_no as number;
  });
  if (publish) return publishDraft(actor, `Dipulihkan dari versi ${versionNo} / Restored from v${versionNo}`);
  return { versionNo };
}

export async function updateSiteSettings(actor: Actor, s: { requireLogin: boolean; domain: { custom?: string; subdomain?: string } }) {
  need(actor, "website.edit");
  const custom = (s.domain.custom ?? "").trim().toLowerCase();
  if (custom && !/^(?=.{3,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(custom)) throw new AppError("Nama domain tidak valid. / Invalid domain name.");
  const sub = (s.domain.subdomain ?? "").trim().toLowerCase();
  if (sub && !/^[a-z0-9]([a-z0-9-]{0,40}[a-z0-9])?$/.test(sub)) throw new AppError("Subdomain tidak valid. / Invalid subdomain.");
  // NOTE: require_login is applied immediately (it is an access-control setting, not page content).
  await withTx(actor.ctx, async (tx) => {
    const w = await primaryWebsite(tx, true);
    await tx.query(`UPDATE website_settings SET require_login = $2, domain = $3 WHERE website_id = $1`, [w.id, s.requireLogin, { custom, subdomain: sub }]);
    await audit(tx, actor.id, "website.settings", "website", w.id, `Website access/domain settings: login ${s.requireLogin ? "required" : "optional"}, domain ${custom || "—"}`);
  });
}

export async function listVersions(ctx: DbCtx) {
  return withTx(ctx, async (tx) => (await tx.query(
    `SELECT v.id, v.version_no, v.note, v.published_at, u.name AS published_by, w.published_version_id = v.id AS is_live,
            jsonb_array_length(v.snapshot->'pages') AS pages, v.snapshot->>'templateId' AS template_id
       FROM website_versions v JOIN websites w ON w.id = v.website_id LEFT JOIN users u ON u.id = v.published_by
      WHERE w.is_primary ORDER BY v.version_no DESC LIMIT 100`)).rows);
}

export async function getVersionSnapshot(ctx: DbCtx, versionId: number): Promise<SiteSnapshot | null> {
  return withTx(ctx, async (tx) => (await tx.query(`SELECT snapshot FROM website_versions WHERE id = $1`, [versionId])).rows[0]?.snapshot ?? null);
}

/** Human-readable summary of what differs between the published snapshot and the draft. */
export function diffSnapshots(live: SiteSnapshot | null, draft: SiteSnapshot) {
  if (!live) return { firstPublish: true, theme: false, header: false, navigation: false, footer: false, seo: false, added: draft.pages.map((p) => p.title), removed: [] as string[], changed: [] as string[] };
  const key = (p: SitePage) => (p.page_type === "custom" ? `c:${p.slug}` : p.page_type);
  const lm = new Map(live.pages.map((p) => [key(p), p])), dm = new Map(draft.pages.map((p) => [key(p), p]));
  const strip1 = ({ id: _id, ...p }: SitePage) => canon(p);
  return {
    firstPublish: false,
    theme: canon(live.theme) !== canon(draft.theme),
    header: canon(live.header) !== canon(draft.header),
    navigation: canon(live.navigation) !== canon(draft.navigation),
    footer: canon(live.footer) !== canon(draft.footer),
    seo: canon(live.seo) !== canon(draft.seo) || live.name !== draft.name,
    added: draft.pages.filter((p) => !lm.has(key(p))).map((p) => p.title),
    removed: live.pages.filter((p) => !dm.has(key(p))).map((p) => p.title),
    changed: draft.pages.filter((p) => lm.has(key(p)) && strip1(lm.get(key(p))!) !== strip1(p)).map((p) => p.title),
  };
}

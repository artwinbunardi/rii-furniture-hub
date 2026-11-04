import type { Client } from "pg";
import { TEMPLATES, templateSnapshot, DEFAULT_TEMPLATE_ID } from "../src/lib/site/templates";
import { validateSnapshot } from "../src/lib/site/validate";

/**
 * Seeds the 50 website templates (as reusable configuration rows) and the primary website:
 * draft tables filled from the default template, plus a first published version.
 * Runs inside the main seed transaction as the database owner.
 */
export async function seedWebsite(db: Client, adminId: string, log: (...a: unknown[]) => void, opts: { demoBranding?: boolean } = {}) {
  for (const t of TEMPLATES) {
    await db.query(`INSERT INTO website_templates(id, name, category, description, config, sort) VALUES ($1,$2,$3,$4,$5,$6)`,
      [t.id, t.name, t.category, t.description, templateSnapshot(t.id), t.sort]);
  }
  const snap = validateSnapshot(templateSnapshot(DEFAULT_TEMPLATE_ID));
  snap.name = "RII Furniture Catalog";
  snap.theme.logoUrl = opts.demoBranding === false ? null : "/media/demo/rii-logo.svg";
  snap.theme.logoText = "RII Furniture";
  const w = (await db.query(`INSERT INTO websites(name, template_id, is_primary, created_by) VALUES ($1,$2,true,$3) RETURNING id`, [snap.name, DEFAULT_TEMPLATE_ID, adminId])).rows[0].id;
  await db.query(`INSERT INTO website_themes(website_id, theme) VALUES ($1,$2)`, [w, snap.theme]);
  await db.query(`INSERT INTO website_settings(website_id, header, footer, navigation, seo, domain, require_login) VALUES ($1,$2,$3,$4,$5,'{}',true)`,
    [w, snap.header, snap.footer, JSON.stringify(snap.navigation), snap.seo]);
  for (const [i, p] of snap.pages.entries()) {
    const pid = (await db.query(`INSERT INTO website_pages(website_id, slug, title, page_type, is_home, is_system, sort) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [w, p.slug, p.title, p.page_type, p.is_home, p.is_system, i])).rows[0].id;
    for (const [j, s] of p.sections.entries())
      await db.query(`INSERT INTO website_sections(id, page_id, type, variant, props, style, sort, hidden) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [s.id, pid, s.type, s.variant, s.props, s.style, j, !!s.hidden]);
  }
  const v = (await db.query(`INSERT INTO website_versions(website_id, version_no, snapshot, note, published_by) VALUES ($1,1,$2,$4,$3) RETURNING id`, [w, snap, adminId, opts.demoBranding === false ? "Versi awal" : "Versi awal (demo seed)"])).rows[0].id;
  await db.query(`UPDATE websites SET published_version_id = $2 WHERE id = $1`, [w, v]);
  log(`seeded ${TEMPLATES.length} website templates and the primary website (published v1, template ${DEFAULT_TEMPLATE_ID})`);
}

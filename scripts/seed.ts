/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import bcrypt from "bcryptjs";
import { loadEnv } from "./env";
import { USERS, CATEGORIES, WAREHOUSES, PRODUCTS, COLLECTIONS, PROJECTS, DEMO_PASSWORD } from "./seed-data";
import { productSvg, bannerSvg, logoSvg, type BannerScene } from "./demo-images";

loadEnv();

export async function seed(opts: { adminUrl: string; withReservations?: boolean; log?: boolean; uploadDir?: string }) {
  const log = (...a: unknown[]) => opts.log !== false && console.log(...a);
  const { ROLES, PERMISSIONS, ROLE_PERMISSIONS } = await import("../src/lib/rbac");
  const db = new Client({ connectionString: opts.adminUrl });
  await db.connect();
  const uploadDir = path.resolve(opts.uploadDir ?? process.env.UPLOAD_DIR ?? "./storage/uploads");
  fs.mkdirSync(path.join(uploadDir, "demo"), { recursive: true });

  const today = (await db.query(`SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text AS d`)).rows[0].d as string;
  const plus = (n: number) => {
    const d = new Date(today + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };

  try {
    await db.query("BEGIN");
    const tables = (await db.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations'`)).rows.map((r) => r.tablename);
    await db.query(`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
    await db.query(`ALTER SEQUENCE reservation_number_seq RESTART WITH 1`);

    // settings
    const settings: Record<string, unknown> = {
      turnaround_days: 1,
      company_name: "PT RII (Demo)",
      default_locale: "id",
      timezone: "Asia/Jakarta",
      currency: "IDR",
      low_availability_threshold: 0.2,
      require_reservation_approval: true,
    };
    for (const [k, v] of Object.entries(settings)) await db.query(`INSERT INTO app_settings(key, value) VALUES ($1,$2)`, [k, JSON.stringify(v)]);

    // roles & permissions
    for (const r of ROLES) await db.query(`INSERT INTO roles(code,name_id,name_en,description,sort) VALUES ($1,$2,$3,$4,$5)`, [r.code, r.name_id, r.name_en, r.description, r.sort]);
    for (const [code, p] of Object.entries(PERMISSIONS)) await db.query(`INSERT INTO permissions(code,description,module) VALUES ($1,$2,$3)`, [code, p.description, p.module]);
    await db.query(`INSERT INTO permissions(code,description,module) VALUES ('*','All permissions (administrator)','admin')`);
    for (const [role, perms] of Object.entries(ROLE_PERMISSIONS))
      for (const p of perms) await db.query(`INSERT INTO role_permissions VALUES ($1,$2) ON CONFLICT DO NOTHING`, [role, p]);

    // users
    const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userIds: Record<string, string> = {};
    for (const u of USERS) {
      const { rows } = await db.query(
        `INSERT INTO users(email,name,password_hash,department,is_demo) VALUES ($1,$2,$3,$4,true) RETURNING id`,
        [u.email, u.name, hash, u.department],
      );
      userIds[u.email] = rows[0].id;
      await db.query(`INSERT INTO user_roles VALUES ($1,$2)`, [rows[0].id, u.role]);
    }
    const admin = userIds["admin@rii.demo"];

    // media helper
    async function media(key: string, svg: string, category: string, alt: string) {
      fs.writeFileSync(path.join(uploadDir, key), svg);
      const { rows } = await db.query(
        `INSERT INTO media_assets(filename, storage_key, mime_type, size_bytes, width, height, category, alt_text, is_demo, uploaded_by)
         VALUES ($1,$2,'image/svg+xml',$3,800,600,$4,$5,true,$6) RETURNING id`,
        [path.basename(key), key, Buffer.byteLength(svg), category, alt, admin],
      );
      return rows[0].id as string;
    }

    // categories
    const catIds: Record<string, string> = {};
    const catKind: Record<string, string> = {};
    let sort = 0;
    for (const c of CATEGORIES) {
      const { rows } = await db.query(`INSERT INTO categories(slug,name_id,name_en,sort) VALUES ($1,$2,$3,$4) RETURNING id`, [c.slug, c.name_id, c.name_en, sort++]);
      catIds[c.slug] = rows[0].id;
      catKind[c.slug] = c.kind;
    }
    // example subcategories (editable by admins)
    await db.query(`INSERT INTO categories(slug,name_id,name_en,parent_id,sort) VALUES ('sofa-modular','Sofa Modular','Modular Sofa',$1,0),('sofa-klasik','Sofa Klasik','Classic Sofa',$1,1)`, [catIds.sofa]);

    // warehouses
    const locIds: Record<string, string> = {};
    for (const w of WAREHOUSES) {
      const { rows } = await db.query(`INSERT INTO warehouses(code,name,address,is_demo) VALUES ($1,$2,$3,true) RETURNING id`, [w.code, w.name, w.address]);
      for (const l of w.locations) {
        const r = await db.query(`INSERT INTO storage_locations(warehouse_id,code,name) VALUES ($1,$2,$3) RETURNING id`, [rows[0].id, l, `Rak ${l}`]);
        locIds[l] = r.rows[0].id;
      }
    }

    // products, images, initial stock (through the movement ledger)
    const prodIds: Record<string, string> = {};
    for (const p of PRODUCTS) {
      const slug = p.sku.toLowerCase() + "-" + p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { rows } = await db.query(
        `INSERT INTO products(sku,slug,name,category_id,description,length_cm,width_cm,height_cm,weight_kg,color,material,location_id,min_stock,track_units,is_demo,condition_grade)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,$15) RETURNING id`,
        [p.sku, slug, p.name, catIds[p.cat], p.desc + " (Data demo)", p.l, p.w, p.h, p.kg ?? null, p.color, p.material, locIds[p.loc], p.min ?? 0, !!p.units, p.qty > 30 ? "good" : "excellent"],
      );
      const id = rows[0].id;
      prodIds[p.sku] = id;
      for (let v = 0; v < 3; v++) {
        const m = await media(`demo/${p.sku.toLowerCase()}-${v + 1}.svg`, productSvg({ kind: catKind[p.cat], color: p.color, accent: p.accent, name: p.name, sku: p.sku, variant: v }), "product", `${p.name} — demo image ${v + 1}`);
        await db.query(`INSERT INTO product_images(product_id, media_id, sort) VALUES ($1,$2,$3)`, [id, m, v]);
      }
      const after = { owned: p.qty, in_warehouse: p.qty, checked_out: 0, pending_inspection: 0, damaged: 0, under_repair: 0, lost: 0 };
      await db.query(`INSERT INTO inventory_balances(product_id, owned, in_warehouse) VALUES ($1,$2,$2)`, [id, p.qty]);
      await db.query(
        `INSERT INTO inventory_movements(product_id, movement_type, quantity, from_bucket, to_bucket, before_state, after_state, reason, performed_by, created_at)
         VALUES ($1,'initial',$2,'external','in_warehouse',$3,$4,'Registrasi stok awal (data demo) / Initial stock registration (demo data)',$5, now() - interval '60 days')`,
        [id, p.qty, JSON.stringify({ ...after, owned: 0, in_warehouse: 0 }), JSON.stringify(after), admin],
      );
      if (p.units) {
        for (let i = 1; i <= p.qty; i++)
          await db.query(`INSERT INTO asset_units(product_id, asset_code, location_id) VALUES ($1,$2,$3)`, [id, `${p.sku}-U${String(i).padStart(3, "0")}`, locIds[p.loc]]);
      }
    }

    // collections
    let cs = 0;
    for (const c of COLLECTIONS) {
      const cover = await media(`demo/collection-${c.slug}.svg`, bannerSvg(c.name, c.description, ["#3b3631", "#8c7a66", "#d8c7a8"]), "banner", c.name);
      const { rows } = await db.query(`INSERT INTO collections(slug,name,description,kind,cover_media_id,sort) VALUES ($1,$2,$3,'official',$4,$5) RETURNING id`, [c.slug, c.name, c.description + " (Demo)", cover, cs++]);
      let i = 0;
      for (const sku of c.skus) await db.query(`INSERT INTO collection_products VALUES ($1,$2,$3)`, [rows[0].id, prodIds[sku], i++]);
    }
    // a personal wishlist + favorites for the decor demo user
    const wl = await db.query(`INSERT INTO collections(slug,name,kind,owner_id,is_published) VALUES ('ide-booth-aurora','Ide Booth Aurora','wishlist',$1,false) RETURNING id`, [userIds["decor@rii.demo"]]);
    for (const sku of ["LNG-003", "CTR-001", "DSP-003"]) await db.query(`INSERT INTO collection_products VALUES ($1,$2,0)`, [wl.rows[0].id, prodIds[sku]]);
    for (const sku of ["SOF-002", "LNG-001", "COF-001"]) await db.query(`INSERT INTO favorites(user_id, product_id) VALUES ($1,$2)`, [userIds["decor@rii.demo"], prodIds[sku]]);

    // website media (banners & logo)
    const banners: [string, string, [string, string, string], BannerScene][] = [
      ["Lounge", "Koleksi lounge untuk acara premium", ["#2e2a26", "#6d5d4b", "#cdb48e"], "sofa"],
      ["Exhibition", "Furnitur booth & display", ["#1d2733", "#3f5a7a", "#9fb3c8"], "booth"],
      ["Wedding", "Gala & wedding collection", ["#5b4a42", "#c9a99a", "#efe2d6"], "banquet"],
      ["Natural", "Rotan, kayu, tekstur alami", ["#3d4a36", "#8ea08a", "#e2d6bd"], "arch"],
      ["Studio", "Bold creative studio sets", ["#2a1f3d", "#b8603e", "#f0c27b"], "chairs"],
      ["Corporate", "Corporate & conference furniture", ["#1f2428", "#59636e", "#c9d1d9"], "chairs"],
      ["Minimal", "Ruang tenang, bentuk sederhana", ["#d9d6d0", "#efedea", "#9c968c"], "sofa"],
      ["Luxury", "Material mewah untuk tamu VIP", ["#0f0e0c", "#2b2620", "#c8a46a"], "arch"],
      ["Nordic", "Kayu terang & tekstil lembut", ["#e9e3d8", "#cfc4b2", "#8a7a63"], "chairs"],
      ["Contemporary", "Warna tanah, garis modern", ["#7a3e2b", "#c47b5a", "#f1d3bf"], "sofa"],
      ["Industrial", "Baja, beton, kayu daur ulang", ["#2b2b2b", "#5a5651", "#b3633b"], "shelves"],
      ["Premium", "Lounge premium & bar area", ["#10231d", "#2d4a3e", "#c9a961"], "arch"],
      ["Creative", "Set warna untuk studio kreatif", ["#ff5a36", "#ffb800", "#2440ff"], "chairs"],
      ["Office", "Workspace & meeting set", ["#e8edf2", "#b9c6d3", "#2f4a63"], "booth"],
      ["Editorial", "Kurasi furnitur ala majalah", ["#efe9df", "#d9cfc0", "#1d1b18"], "shelves"],
    ];
    for (const [t, s, tone, kind] of banners) await media(`demo/banner-${t.toLowerCase()}.svg`, bannerSvg(t, s, tone, kind), "banner", `${t} banner (demo)`);
    await media("demo/rii-logo.svg", logoSvg(), "logo", "RII logo (demo wordmark)");

    // projects
    const projIds: Record<string, string> = {};
    for (const p of PROJECTS) {
      const { rows } = await db.query(
        `INSERT INTO projects(code,name,client_name,event_name,location,start_date,end_date,pic_user_id,department,status,is_demo,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Decor',$9,true,$10) RETURNING id`,
        [p.code, p.name, p.client, p.event, p.location, plus(p.offset[0]), plus(p.offset[1]), userIds["decor@rii.demo"], "active", admin],
      );
      projIds[p.code] = rows[0].id;
    }

    await db.query("COMMIT");
    log(`seeded ${USERS.length} users, ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${PROJECTS.length} projects`);

    // website templates & primary website (Phase 6) — optional module
    const mod = await import("./seed-website");
    await mod.seedWebsite(db, admin, log);

    if (opts.withReservations !== false) await seedReservations(db, { userIds, prodIds, projIds, plus, log });
  } catch (e) {
    await db.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

async function seedReservations(
  db: Client,
  s: { userIds: Record<string, string>; prodIds: Record<string, string>; projIds: Record<string, string>; plus: (n: number) => string; log: (...a: unknown[]) => void },
) {
  // Reservations are created through the real service layer (as the app DB role, with RLS),
  // so their status history, movements and audit logs are genuine.
  const svc = await import("../src/lib/services/reservations");
  const { loadUserByIdPlain } = await import("./actor");
  const A = async (email: string) => (await loadUserByIdPlain(s.userIds[email]))!;
  const decor = await A("decor@rii.demo"), decor2 = await A("decor2@rii.demo");
  const staff = await A("staff@rii.demo"), manager = await A("manager@rii.demo");
  const { plus, prodIds: P, projIds: J } = s;

  async function build(user: typeof decor, project: string, from: number, to: number, lines: [string, number][], extra: Partial<{ instructions: string; location: string }> = {}) {
    let cartId = "";
    for (const [sku, q] of lines) cartId = await svc.addToCart(user, P[sku], q);
    await svc.updateDraft(user, cartId, {
      project_id: J[project], loading_date: plus(from), return_date: plus(to), event_location: extra.location ?? null,
      special_instructions: extra.instructions ?? null, department: "Decor",
    });
    return cartId;
  }
  async function submitted(user: typeof decor, project: string, from: number, to: number, lines: [string, number][], extra = {}) {
    const id = await build(user, project, from, to, lines, extra);
    await svc.submitReservation(user, id);
    return id;
  }
  const shift = async (id: string, from: number, to: number) =>
    db.query(`UPDATE reservations SET loading_date = $2, return_date = $3 WHERE id = $1`, [id, plus(from), plus(to)]);

  // 1 approved
  const r1 = await submitted(decor, "PRJ-2026-001", 3, 9, [["SOF-001", 8], ["LNG-001", 4], ["COF-001", 2]], { instructions: "Mohon dibungkus wrapping (demo).", location: "Hall A, JCC" });
  await svc.approveReservation(manager, r1, { note: "OK — demo approval" });
  // 2 pending
  await submitted(decor2, "PRJ-2026-002", 10, 13, [["DIN-002", 80], ["DTB-002", 8], ["DEC-001", 10]], { location: "Grand Ballroom" });
  // 3 checked out (currently on site)
  const r3 = await submitted(decor, "PRJ-2026-003", 0, 8, [["CTR-001", 2], ["DSP-001", 4], ["BAR-001", 10]], { location: "Hall 5 Booth C12" });
  await svc.approveReservation(manager, r3);
  await svc.confirmPicking(staff, r3, {});
  await svc.dispatchReservation(staff, r3, {});
  await shift(r3, -6, 2);
  // 4 completed, with damage found at inspection
  const r4 = await submitted(decor2, "PRJ-2026-005", 0, 1, [["DIN-001", 30], ["DTB-001", 4]]);
  await svc.approveReservation(manager, r4);
  await svc.confirmPicking(staff, r4, {});
  await svc.dispatchReservation(staff, r4, {});
  await svc.registerReturn(staff, r4, { [P["DIN-001"]]: { returned: 30 }, [P["DTB-001"]]: { returned: 4 } });
  await svc.inspectReturn(staff, r4, P["DIN-001"], { good: 28, damaged: 2, lost: 0, severity: "moderate", damageDescription: "Kaki kursi retak (demo)" });
  await svc.inspectReturn(staff, r4, P["DTB-001"], { good: 4, damaged: 0, lost: 0 });
  await shift(r4, -20, -15);
  // 5 saved draft
  const r5 = await build(decor, "PRJ-2026-004", 20, 24, [["LNG-002", 6], ["OTH-003", 4]], { location: "Taman resort (demo)" });
  await svc.saveCartAsDraft(decor, r5);
  // 6 rejected
  const r6 = await submitted(decor2, "PRJ-2026-001", 3, 9, [["SOF-002", 3]]);
  await svc.rejectReservation(manager, r6, "Unit dialokasikan untuk proyek lain (demo).");
  // 7 cancelled
  const r7 = await submitted(decor, "PRJ-2026-002", 10, 13, [["COF-001", 4]]);
  await svc.cancelReservation(decor, r7, "Desain berubah (demo).");
  // 8 preparing
  const r8 = await submitted(decor2, "PRJ-2026-004", 19, 25, [["DIN-003", 20], ["OTH-001", 6]]);
  await svc.approveReservation(manager, r8);
  await svc.startPreparing(staff, r8);
  // 9 ready for dispatch
  const r9 = await submitted(decor, "PRJ-2026-001", 2, 9, [["DSP-002", 2], ["DEC-002", 4]]);
  await svc.approveReservation(manager, r9);
  await svc.confirmPicking(staff, r9, {});
  // 10 partially returned AND overdue
  const r10 = await submitted(decor, "PRJ-2026-005", 0, 1, [["SOF-003", 10], ["OTH-001", 8]]);
  await svc.approveReservation(manager, r10);
  await svc.confirmPicking(staff, r10, {});
  await svc.dispatchReservation(staff, r10, {});
  await svc.registerReturn(staff, r10, { [P["SOF-003"]]: { returned: 6 }, [P["OTH-001"]]: { returned: 8 } });
  await svc.inspectReturn(staff, r10, P["OTH-001"], { good: 8, damaged: 0, lost: 0 });
  await shift(r10, -20, -3);
  // current cart for decor user
  await svc.addToCart(decor, P["LNG-003"], 2);

  // pending stock adjustment & a repair in progress
  await db.query(
    `INSERT INTO stock_adjustments(product_id, kind, quantity, reason, requested_by) VALUES ($1,'increase',2,'Ditemukan 2 unit tambahan saat stock opname (demo).',$2)`,
    [P["BAR-002"], staff.id],
  );
  const { moveStock } = await import("../src/lib/services/inventory");
  const { withTx } = await import("../src/lib/db");
  await withTx(manager.ctx, async (tx) => {
    await moveStock(tx, manager, { productId: P["DIN-001"], type: "repair_start", qty: 1, from: "damaged", to: "under_repair", reason: "Dikirim ke bengkel (demo)" });
    await tx.query(`UPDATE damage_reports SET status = 'in_repair' WHERE product_id = $1`, [P["DIN-001"]]);
  });
  // spread demo timestamps so trend charts have history
  await db.query(`UPDATE reservations SET created_at = created_at - ((random()*40)::int || ' days')::interval, submitted_at = submitted_at - ((random()*30)::int || ' days')::interval WHERE submitted_at IS NOT NULL`);
  await db.query(`UPDATE projects SET status = 'completed' WHERE end_date < (now() AT TIME ZONE 'Asia/Jakarta')::date`);
  s.log("seeded 10 reservations across statuses (+1 active cart)");
}

if (require.main === module) {
  const adminUrl = process.env.DATABASE_ADMIN_URL;
  if (!adminUrl) throw new Error("DATABASE_ADMIN_URL is not set");
  seed({ adminUrl })
    .then(async () => {
      const { closePool } = await import("../src/lib/db");
      await closePool();
      console.log("seed complete — demo password for all accounts:", DEMO_PASSWORD);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

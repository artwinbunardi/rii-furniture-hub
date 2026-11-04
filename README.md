# RII Furniture Hub

**RII Furniture Collection & Reservation System** — an internal web application for browsing RII's
furniture collection, reserving furniture for projects without overbooking, running warehouse
operations (picking, dispatch, returns, inspection, damage, adjustments), monitoring utilisation, and
designing the internal catalog website with a visual Website Builder. All parts share **one PostgreSQL
database**: the catalog website shows live inventory and availability, never copies.

> All seeded products, stock levels, users, projects and reservations are **demonstration data**
> (names end in “(Demo)”, images are marked “DEMO IMAGE”). They are not RII company records.

Bahasa Indonesia is the default UI language (English switch in every screen). Timezone Asia/Jakarta, currency IDR.

## Quick start (local)

Requirements: Node.js 22+, PostgreSQL 15/16 (local or Docker).

```bash
npm ci
cp .env.example .env              # set SESSION_SECRET: openssl rand -hex 32
createdb rii && createdb rii_test # or use docker compose (below)
npm run db:reset                  # migrations + demo data (wipes the database!)
npm run dev                       # http://localhost:3000
```

The owner role in `DATABASE_ADMIN_URL` runs migrations and seeds. The app itself connects as the
non-owner role `rii_app` (created by migration 003), so **row-level security applies to every request**.

### Demo accounts (password `Demo1234!`)

| Email | Role | Lands on |
|---|---|---|
| admin@rii.demo | System Administrator | Dashboard (everything incl. Website Builder) |
| management@rii.demo | Management | Dashboard, reports, audit |
| manager@rii.demo | Warehouse Manager | Approval queue, adjustments, repairs |
| staff@rii.demo | Warehouse Staff | Warehouse operations |
| decor@rii.demo, decor2@rii.demo | Decor Team | Catalog → cart → reservations |

## Docker

```bash
cp .env.example .env && echo "SESSION_SECRET=$(openssl rand -hex 32)" >> .env
docker compose up -d db
docker compose run --rm migrate          # migrations + demo data
docker compose up -d app                 # http://localhost:3000
```

For a real installation without demo data see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm run db:migrate` | Apply pending SQL migrations (`migrations/*.sql`) |
| `npm run db:seed` | **Wipe** and load demo data (users, 32 products, stock, projects, reservations, 50 templates, website) |
| `npm run db:reset` | Drop schema, migrate, seed |
| `npm run db:bootstrap` | Production install: migrations + roles + first admin + templates, **no demo data**, never truncates |
| `npm run typecheck` | TypeScript check |
| `npm test` | Service/database tests (Vitest, uses `TEST_DATABASE_*`, wipes that DB) |
| `npm run test:e2e` | Browser tests (Playwright) against a running, freshly seeded app |
| `npm run thumbs` | Regenerate template-library thumbnails from the live template previews |

## Modules

- **Catalog** — search, category/colour/material filters, availability for chosen dates, product detail with gallery & availability calendar, favourites, wishlists, collections.
- **Cart & reservations** — project, loading/return dates, live availability; submit for approval. Pending requests are *soft holds* (shown, not locked); approval re-validates atomically and locks stock (*hard holds*) incl. a configurable turnaround buffer. Overbooking is prevented in the database transaction, not the browser.
- **Warehouse** — picking lists (printable, QR), dispatch/check-out, returns/check-in, inspection, damage & repair, stock adjustments with approval, discrepancies, QR/barcode scanning, movement ledger (append-only).
- **Dashboard & reports** — KPIs, utilisation chart, weekly submissions, loading schedule, low availability, top products, damage and project usage; CSV exports (audited, formula-injection safe).
- **Admin** — users & invitations, role-permission matrix, categories, collections, warehouses & locations, projects, settings, audit log, email outbox.
- **Website Builder** — 50 templates in 10 categories, visual drag-and-drop editor with inline text editing and responsive preview, 18 content & product section types plus editable header and footer, and functional system sections, theme & branding, pages, navigation, media library, SEO, domain & access, draft/publish/version history/restore. See [docs/WEBSITE_BUILDER.md](docs/WEBSITE_BUILDER.md).

## Documentation

- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — production setup (Docker, Supabase/managed Postgres, storage, secrets)
- [docs/TESTING.md](docs/TESTING.md) — test suites and what they cover
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — data model, security model, availability rules
- [docs/WEBSITE_BUILDER.md](docs/WEBSITE_BUILDER.md) — how the builder works
- [docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md) — what is not done or not verified

## Tech stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Tailwind CSS · PostgreSQL (raw SQL via `pg`, RLS) ·
bcrypt · Recharts · dnd-kit · Vitest · Playwright. No payment gateway (internal system).

## Licensing & assets

Original code. No Booqable (or other third-party) code, branding, logos or images are used; Booqable was
only a UX reference. Demo images are generated SVGs (`scripts/demo-images.ts`). Fonts load from Google Fonts.

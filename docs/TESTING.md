# Testing

## Automated suites

| Suite | Command | Runs against | Count |
|---|---|---|---|
| Service & database tests | `npm test` | `TEST_DATABASE_URL` (re-seeded, wiped) | 46 tests in 3 files |
| End-to-end browser tests | `npm run test:e2e` | running app at `E2E_BASE_URL` (default `http://localhost:3000`) | 16 tests (15 desktop + 1 phone) |
| Types | `npm run typecheck` | — | — |

Last results recorded by the author (2026-11-04): **46/46** Vitest, **16/16** Playwright against the
production build (`npm run build && npm start`), typecheck clean.

### Service & database tests (`tests/`)
- `reservations.test.ts` — submission (project + dates required), pending requests as soft holds,
  approval turning them into hard holds, double-booking prevention on overlapping dates, the turnaround
  buffer, re-validation at approval time, **concurrent approvals never oversubscribe stock** (incl. a
  6-way race), picking + dispatch, returns waiting for inspection, damaged stock staying unavailable,
  no negative stock, and permissions enforced by the service layer, DB triggers and RLS.
- `admin.test.ts` — invitations, last-admin guard, disabling users kills sessions, role matrix, RLS
  against privilege escalation, settings validation, categories/collections/locations/projects permissions.
- `website.test.ts` — 50 templates (5 × 10 categories, all distinct, all valid), every section type used,
  snapshot sanitising (javascript: links, unsafe images, bad colours/fonts, reserved slugs, functional
  sections out of place), draft vs live isolation, stale-revision protection, publish, restore,
  template apply keeping custom pages, builder permissions enforced in services **and** in the database
  (publish trigger, RLS), immutable versions, domain validation.

These tests call the real service layer as the real `rii_app` role, so RLS and triggers are exercised.

### End-to-end tests (`e2e/`)
Reset data first: `npm run db:reset`, start the app, then `npm run test:e2e`.
- `auth.spec.ts` — login redirects, wrong password, each role's landing page, Decor and Warehouse Manager blocked from admin/builder/export.
- `reservation.spec.ts` — Decor adds a product, picks project & dates, submits; Warehouse Manager approves; Decor sees “Disetujui”. Quantity above availability cannot be added.
- `builder.spec.ts` — inline edit in the visual editor → save → draft preview shows it, live site does not → publish → live shows it → restore v1 → gone again; add/reorder sections; template library filter/search/preview/apply.
- `mobile.spec.ts` — catalog on a Pixel 7 viewport without horizontal overflow.

## Manual verification done during development
Every screen was opened and screenshotted as each role; warehouse flows (pick → dispatch → return →
inspect → damage → repair) and CSV exports were exercised in the browser; the Docker image was built
and served the catalog against PostgreSQL 16.

## Not covered by automated tests
Camera QR scanning (needs a device camera; manual entry path is covered), print layouts, email
delivery (not implemented), performance/load testing, accessibility audit with assistive technology,
browsers other than Chromium.

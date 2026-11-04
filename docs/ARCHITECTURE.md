# Architecture

## Overview

One Next.js 15 application (App Router, React Server Components, server actions) and one PostgreSQL
database. There is no separate API server: pages query the database on the server, mutations are
server actions that call a service layer (`src/lib/services/*`). The catalog website, the operations
app and the Website Builder all read the same tables.

```
src/app/(site)/…          catalog website (rendered from the published website snapshot)
src/app/app/…             operations app (/app, role-based navigation)
src/app/app/builder/…     Website Builder screens; /app/builder/editor = visual editor
src/app/builder-canvas    editor canvas (iframe), src/app/preview/* draft/template/version previews
src/app/api/app/…         CSV exports, template list
src/lib/services/…        business logic (reservations, warehouse, inventory, admin, website, media, reports)
src/lib/site/…            website model: section registry, 50 templates, validation, theme, loaders
src/components/site/…     section components shared by live site, previews and editor canvas
migrations/*.sql          schema, RLS policies, triggers (applied in order by scripts/migrate.ts)
```

## Data model (main tables)

- **Identity & access**: `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sessions`, `auth_tokens`
- **Catalog**: `categories` (2 levels), `products`, `product_images`, `media_assets`, `collections` (official + personal wishlists), `collection_products`, `favorites`
- **Inventory**: `inventory_balances` (per product: `in_warehouse`, `checked_out`, `pending_inspection`, `damaged`, `under_repair`, `lost`; owned = their sum), optional serialised `asset_units`, `warehouses`, `storage_locations`
- **Reservations**: `projects`, `reservations` (status, dates, `is_cart`), `reservation_items` (requested/approved/picked/checked-out/returned/missing quantities), `reservation_status_history`
- **Ledgers & operations**: `inventory_movements` (append-only), `stock_adjustments`, `damage_reports`, `return_inspections`, `stock_discrepancies`, `audit_logs` (append-only)
- **Website**: `website_templates` (50 config rows), `websites`, draft tables `website_themes`, `website_settings`, `website_pages`, `website_sections`, and immutable `website_versions` (published snapshots)

## Availability rules

`reservation_holds` (view) turns active reservations into holds per product:
- `pending_approval` → **soft hold** of the requested quantity (displayed, does not block booking)
- `approved` / `preparing` / `ready_for_dispatch` → **hard hold** of the approved quantity
- `checked_out` / `partially_returned` → hard hold of what is still out, extended to today if overdue
- every hold covers loading date → return date **+ turnaround days** (per product, else the global setting)

`product_availability(ids, from, to)` returns, per product, usable stock (owned minus units pending
inspection, damaged, under repair or lost) minus the **peak daily hard holds** in the window.
Approval locks the affected `inventory_balances` rows (`SELECT … FOR UPDATE`, ordered to avoid
deadlocks) and re-checks availability in the same transaction, so concurrent approvals cannot overbook (covered by a 6-way race test).

Reservation statuses: `draft → pending_approval → approved | rejected → preparing → ready_for_dispatch
→ checked_out → partially_returned → returned → completed`, plus `cancelled`. Allowed transitions are
enforced by a database trigger, not only by the UI.

## Security model

- **Sessions**: random 256-bit tokens, stored as HMAC-SHA256 hashes; HttpOnly, SameSite=Lax, Secure on HTTPS. Passwords: bcrypt. Login throttled per email (8 tries / 10 min, in-memory).
- **Authorisation in three layers**: (1) route/page guards (`requireUser(perm)`), (2) service checks (`authorize(perm)` / `need()` in every server action and service), (3) **PostgreSQL row-level security**: the app connects as `rii_app` (not the owner); each transaction sets `app.user_id` and `app.perms`, and FORCE RLS policies plus triggers (status transitions, publish guard) check them. Ledgers and published website versions are append-only (UPDATE/DELETE revoked).
- **Input**: all SQL is parameterised; website snapshots are re-validated server-side (link/image whitelist, colour/font whitelist, clamped numbers, reserved slugs); uploads are content-sniffed, size-limited, SVG scripts rejected; CSV exports neutralise formula injection.
- **Headers**: `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'`, `nosniff`, strict referrer, camera permission only for the scanner.
- **Audit**: password resets, accepted invitations, approvals, stock changes, settings, user/role changes, exports, website saves/publishes/restores and media changes are written to `audit_logs`.

## Internationalisation

`src/lib/i18n/dict.ts` holds Indonesian/English strings; the language is a cookie (`/lang` switch).
Dates are computed in Asia/Jakarta; quantities only (no prices/IDR amounts are required by the workflow).

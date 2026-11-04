-- RII Furniture Hub — core schema
-- PostgreSQL 14+ (tested on 16). Compatible with Supabase Postgres.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- Request context helpers (used by RLS policies)
-- The application sets these per transaction with set_config(..., true).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app_user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app_has_perm(p text) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.perms', true), '') LIKE '%|' || p || '|%'
      OR coalesce(current_setting('app.perms', true), '') LIKE '%|*|%'
$$;

-- ---------------------------------------------------------------------------
-- Users, roles, permissions
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  code        text PRIMARY KEY,
  name_id     text NOT NULL,
  name_en     text NOT NULL,
  description text,
  sort        int NOT NULL DEFAULT 0
);

CREATE TABLE permissions (
  code        text PRIMARY KEY,
  description text NOT NULL,
  module      text NOT NULL
);

CREATE TABLE role_permissions (
  role_code       text NOT NULL REFERENCES roles(code) ON DELETE CASCADE,
  permission_code text NOT NULL REFERENCES permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_code, permission_code)
);

CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text,
  department    text,
  phone         text,
  status        text NOT NULL DEFAULT 'active' CHECK (status IN ('active','invited','disabled')),
  locale        text NOT NULL DEFAULT 'id' CHECK (locale IN ('id','en')),
  is_demo       boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_roles (
  user_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES roles(code),
  PRIMARY KEY (user_id, role_code)
);

CREATE TABLE sessions (
  token_hash   text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  remember     boolean NOT NULL DEFAULT false,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE auth_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('reset','invite')),
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Development mail sink: every outgoing email is recorded here (and sent via SMTP when configured)
CREATE TABLE email_outbox (
  id         bigserial PRIMARY KEY,
  to_email   text NOT NULL,
  subject    text NOT NULL,
  body       text NOT NULL,
  link       text,
  sent       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
CREATE TABLE app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Media
-- ---------------------------------------------------------------------------
CREATE TABLE media_assets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename     text NOT NULL,
  storage_key  text NOT NULL UNIQUE,
  mime_type    text NOT NULL,
  size_bytes   int NOT NULL CHECK (size_bytes >= 0),
  width        int,
  height       int,
  category     text NOT NULL DEFAULT 'general' CHECK (category IN ('product','banner','logo','favicon','general','gallery')),
  alt_text     text,
  is_demo      boolean NOT NULL DEFAULT false,
  uploaded_by  uuid REFERENCES users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_category_idx ON media_assets(category);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid REFERENCES categories(id) ON DELETE RESTRICT,
  slug        text NOT NULL UNIQUE,
  name_id     text NOT NULL,
  name_en     text NOT NULL,
  description text,
  sort        int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  address    text,
  is_demo    boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE storage_locations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  code         text NOT NULL,
  name         text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  UNIQUE (warehouse_id, code)
);

CREATE TABLE products (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              text NOT NULL UNIQUE,
  slug             text NOT NULL UNIQUE,
  name             text NOT NULL,
  category_id      uuid NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description      text,
  length_cm        numeric(8,1) CHECK (length_cm >= 0),
  width_cm         numeric(8,1) CHECK (width_cm >= 0),
  height_cm        numeric(8,1) CHECK (height_cm >= 0),
  weight_kg        numeric(8,2) CHECK (weight_kg >= 0),
  color            text,
  material         text,
  condition_grade  text NOT NULL DEFAULT 'good' CHECK (condition_grade IN ('new','excellent','good','fair')),
  location_id      uuid REFERENCES storage_locations(id) ON DELETE SET NULL,
  min_stock        int NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  turnaround_days  int CHECK (turnaround_days >= 0),
  track_units      boolean NOT NULL DEFAULT false,
  is_active        boolean NOT NULL DEFAULT true,
  is_demo          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category_idx ON products(category_id);
CREATE INDEX products_search_idx ON products USING gin (to_tsvector('simple', name || ' ' || sku || ' ' || coalesce(color,'') || ' ' || coalesce(material,'')));

CREATE TABLE product_images (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  media_id   uuid NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  sort       int NOT NULL DEFAULT 0,
  UNIQUE (product_id, media_id)
);
CREATE INDEX product_images_product_idx ON product_images(product_id, sort);

CREATE TABLE collections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL,
  name        text NOT NULL,
  description text,
  kind        text NOT NULL DEFAULT 'official' CHECK (kind IN ('official','wishlist')),
  owner_id    uuid REFERENCES users(id) ON DELETE CASCADE,
  cover_media_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  sort        int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK ((kind = 'official' AND owner_id IS NULL) OR (kind = 'wishlist' AND owner_id IS NOT NULL))
);
CREATE UNIQUE INDEX collections_official_slug ON collections(slug) WHERE kind = 'official';
CREATE UNIQUE INDEX collections_wishlist_slug ON collections(owner_id, slug) WHERE kind = 'wishlist';

CREATE TABLE collection_products (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sort          int NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

CREATE TABLE favorites (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Inventory
--   owned = in_warehouse + checked_out + pending_inspection + damaged + under_repair + lost
--   Bookable (usable) stock = owned - pending_inspection - damaged - under_repair - lost
--   Reservations reduce bookable availability per date range (see reservation_holds),
--   they never change these physical buckets.
-- ---------------------------------------------------------------------------
CREATE TABLE inventory_balances (
  product_id          uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  owned               int NOT NULL DEFAULT 0 CHECK (owned >= 0),
  in_warehouse        int NOT NULL DEFAULT 0 CHECK (in_warehouse >= 0),
  checked_out         int NOT NULL DEFAULT 0 CHECK (checked_out >= 0),
  pending_inspection  int NOT NULL DEFAULT 0 CHECK (pending_inspection >= 0),
  damaged             int NOT NULL DEFAULT 0 CHECK (damaged >= 0),
  under_repair        int NOT NULL DEFAULT 0 CHECK (under_repair >= 0),
  lost                int NOT NULL DEFAULT 0 CHECK (lost >= 0),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_balance_consistent CHECK (
    owned = in_warehouse + checked_out + pending_inspection + damaged + under_repair + lost
  )
);

CREATE TABLE asset_units (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  asset_code  text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'in_warehouse' CHECK (status IN ('in_warehouse','checked_out','pending_inspection','damaged','under_repair','lost')),
  location_id uuid REFERENCES storage_locations(id) ON DELETE SET NULL,
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX asset_units_product_idx ON asset_units(product_id);

-- ---------------------------------------------------------------------------
-- Projects & reservations
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  client_name text,
  event_name  text,
  location    text,
  start_date  date,
  end_date    date,
  pic_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  department  text,
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('planning','active','completed','cancelled')),
  notes       text,
  is_demo     boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);

CREATE SEQUENCE reservation_number_seq START 1;

CREATE TABLE reservations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number               text UNIQUE,
  project_id           uuid REFERENCES projects(id) ON DELETE RESTRICT,
  requester_id         uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  department           text,
  event_location       text,
  loading_date         date,
  return_date          date,
  special_instructions text,
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft','pending_approval','approved','rejected','preparing','ready_for_dispatch',
                          'checked_out','partially_returned','returned','completed','cancelled')),
  is_cart              boolean NOT NULL DEFAULT false,
  submitted_at         timestamptz,
  approved_by          uuid REFERENCES users(id),
  approved_at          timestamptz,
  approval_note        text,
  rejection_reason     text,
  dispatched_at        timestamptz,
  completed_at         timestamptz,
  is_demo              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (return_date IS NULL OR loading_date IS NULL OR return_date >= loading_date),
  CHECK (status = 'draft' OR (number IS NOT NULL AND project_id IS NOT NULL AND loading_date IS NOT NULL AND return_date IS NOT NULL))
);
CREATE UNIQUE INDEX reservations_one_cart_per_user ON reservations(requester_id) WHERE is_cart;
CREATE INDEX reservations_status_idx ON reservations(status);
CREATE INDEX reservations_dates_idx ON reservations(loading_date, return_date);
CREATE INDEX reservations_requester_idx ON reservations(requester_id);

CREATE TABLE reservation_items (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id        uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  product_id            uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_requested         int NOT NULL CHECK (qty_requested > 0),
  qty_approved          int NOT NULL DEFAULT 0 CHECK (qty_approved >= 0),
  qty_picked            int NOT NULL DEFAULT 0 CHECK (qty_picked >= 0),
  qty_checked_out       int NOT NULL DEFAULT 0 CHECK (qty_checked_out >= 0),
  qty_returned          int NOT NULL DEFAULT 0 CHECK (qty_returned >= 0),
  qty_missing           int NOT NULL DEFAULT 0 CHECK (qty_missing >= 0),
  qty_inspected_good    int NOT NULL DEFAULT 0 CHECK (qty_inspected_good >= 0),
  qty_inspected_damaged int NOT NULL DEFAULT 0 CHECK (qty_inspected_damaged >= 0),
  qty_inspected_lost    int NOT NULL DEFAULT 0 CHECK (qty_inspected_lost >= 0),
  notes                 text,
  UNIQUE (reservation_id, product_id),
  CHECK (qty_approved <= qty_requested),
  CHECK (qty_checked_out <= greatest(qty_approved, qty_picked)),
  CHECK (qty_returned + qty_missing <= qty_checked_out),
  CHECK (qty_inspected_good + qty_inspected_damaged + qty_inspected_lost <= qty_returned)
);
CREATE INDEX reservation_items_product_idx ON reservation_items(product_id);

CREATE TABLE reservation_status_history (
  id             bigserial PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  from_status    text,
  to_status      text NOT NULL,
  changed_by     uuid REFERENCES users(id),
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rsh_res_idx ON reservation_status_history(reservation_id, created_at);

-- Movement ledger: every change to inventory_balances writes exactly one row here.
CREATE TABLE inventory_movements (
  id             bigserial PRIMARY KEY,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  movement_type  text NOT NULL CHECK (movement_type IN (
                   'initial','receive','adjustment','checkout','checkin','inspect_good','inspect_damaged','inspect_lost',
                   'missing','repair_start','repair_done','release_damaged','write_off','found','relocate')),
  quantity       int NOT NULL CHECK (quantity >= 0),
  from_bucket    text,
  to_bucket      text,
  before_state   jsonb NOT NULL,
  after_state    jsonb NOT NULL,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  project_id     uuid REFERENCES projects(id) ON DELETE SET NULL,
  reason         text,
  performed_by   uuid REFERENCES users(id),
  approved_by    uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX inv_mov_product_idx ON inventory_movements(product_id, created_at DESC);
CREATE INDEX inv_mov_created_idx ON inventory_movements(created_at DESC);

CREATE TABLE stock_adjustments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  kind         text NOT NULL CHECK (kind IN ('increase','decrease','write_off','found')),
  quantity     int NOT NULL CHECK (quantity > 0),
  reason       text NOT NULL,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by uuid NOT NULL REFERENCES users(id),
  decided_by   uuid REFERENCES users(id),
  decided_at   timestamptz,
  decision_note text,
  movement_id  bigint REFERENCES inventory_movements(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE damage_reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  quantity       int NOT NULL CHECK (quantity > 0),
  remaining_qty  int NOT NULL CHECK (remaining_qty >= 0),
  severity       text NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor','moderate','severe')),
  description    text NOT NULL,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_repair','resolved')),
  reported_by    uuid REFERENCES users(id),
  resolved_by    uuid REFERENCES users(id),
  resolved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (remaining_qty <= quantity)
);

CREATE TABLE return_inspections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_good       int NOT NULL DEFAULT 0 CHECK (qty_good >= 0),
  qty_damaged    int NOT NULL DEFAULT 0 CHECK (qty_damaged >= 0),
  qty_lost       int NOT NULL DEFAULT 0 CHECK (qty_lost >= 0),
  notes          text,
  inspected_by   uuid REFERENCES users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE stock_discrepancies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  reservation_id uuid REFERENCES reservations(id) ON DELETE SET NULL,
  kind           text NOT NULL CHECK (kind IN ('picking_short','return_missing','count_mismatch','other')),
  expected_qty   int NOT NULL,
  actual_qty     int NOT NULL,
  notes          text,
  status         text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  reported_by    uuid REFERENCES users(id),
  resolved_by    uuid REFERENCES users(id),
  resolution     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id          bigserial PRIMARY KEY,
  user_id     uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  summary     text,
  before_data jsonb,
  after_data  jsonb,
  ip          text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_created_idx ON audit_logs(created_at DESC);
CREATE INDEX audit_entity_idx ON audit_logs(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Availability
-- reservation_holds: the quantity each reservation removes from bookable stock and the
-- inclusive date window it occupies (loading_date .. return_date + turnaround buffer).
--   pending_approval            -> soft hold (shown, does NOT block other bookings)
--   approved/preparing/ready    -> hard hold of qty_approved
--   checked_out/partially_ret.  -> hard hold of items still outside; window extends to today when overdue
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION setting_int(k text, dflt int) RETURNS int LANGUAGE sql STABLE AS $$
  SELECT coalesce((SELECT (value #>> '{}')::int FROM app_settings WHERE key = k), dflt)
$$;

CREATE OR REPLACE VIEW reservation_holds AS
SELECT r.id AS reservation_id,
       ri.product_id,
       CASE
         WHEN r.status = 'pending_approval' THEN ri.qty_requested
         WHEN r.status IN ('approved','preparing','ready_for_dispatch') THEN ri.qty_approved
         ELSE ri.qty_checked_out - ri.qty_returned - ri.qty_missing
       END AS qty,
       (r.status <> 'pending_approval') AS is_hard,
       r.loading_date AS hold_start,
       (CASE WHEN r.status IN ('checked_out','partially_returned')
             THEN greatest(r.return_date, (now() AT TIME ZONE 'Asia/Jakarta')::date)
             ELSE r.return_date END)
         + coalesce(p.turnaround_days, setting_int('turnaround_days', 1)) AS hold_end,
       r.status
FROM reservations r
JOIN reservation_items ri ON ri.reservation_id = r.id
JOIN products p ON p.id = ri.product_id
WHERE r.status IN ('pending_approval','approved','preparing','ready_for_dispatch','checked_out','partially_returned');

-- Availability of products for an inclusive date window [p_start, p_end].
-- Reserved = PEAK simultaneous hard-held quantity on any single day inside the window.
CREATE OR REPLACE FUNCTION product_availability(p_ids uuid[], p_start date, p_end date, p_exclude uuid DEFAULT NULL)
RETURNS TABLE (product_id uuid, usable int, reserved int, pending int, available int)
LANGUAGE sql STABLE AS $$
  WITH days AS (
    SELECT pid, d::date AS day
    FROM unnest(p_ids) AS pid, generate_series(p_start, p_end, interval '1 day') AS d
  ), per_day AS (
    SELECT days.pid, days.day,
           coalesce(sum(h.qty) FILTER (WHERE h.is_hard), 0)::int AS hard,
           coalesce(sum(h.qty) FILTER (WHERE NOT h.is_hard), 0)::int AS soft
    FROM days
    LEFT JOIN reservation_holds h
      ON h.product_id = days.pid AND days.day BETWEEN h.hold_start AND h.hold_end
     AND (p_exclude IS NULL OR h.reservation_id <> p_exclude)
    GROUP BY days.pid, days.day
  )
  SELECT b.product_id,
         (b.owned - b.pending_inspection - b.damaged - b.under_repair - b.lost)::int AS usable,
         coalesce(max(pd.hard), 0)::int AS reserved,
         coalesce(max(pd.soft), 0)::int AS pending,
         greatest(0, (b.owned - b.pending_inspection - b.damaged - b.under_repair - b.lost) - coalesce(max(pd.hard), 0))::int AS available
  FROM inventory_balances b
  LEFT JOIN per_day pd ON pd.pid = b.product_id
  WHERE b.product_id = ANY(p_ids)
  GROUP BY b.product_id, b.owned, b.pending_inspection, b.damaged, b.under_repair, b.lost
$$;

-- Daily availability series for calendars
CREATE OR REPLACE FUNCTION product_daily_availability(p_id uuid, p_start date, p_end date)
RETURNS TABLE (day date, usable int, reserved int, pending int, available int)
LANGUAGE sql STABLE AS $$
  WITH b AS (
    SELECT (owned - pending_inspection - damaged - under_repair - lost)::int AS usable
    FROM inventory_balances WHERE product_id = p_id
  )
  SELECT d::date,
         b.usable,
         coalesce(sum(h.qty) FILTER (WHERE h.is_hard), 0)::int,
         coalesce(sum(h.qty) FILTER (WHERE NOT h.is_hard), 0)::int,
         greatest(0, b.usable - coalesce(sum(h.qty) FILTER (WHERE h.is_hard), 0))::int
  FROM b, generate_series(p_start, p_end, interval '1 day') d
  LEFT JOIN reservation_holds h ON h.product_id = p_id AND d::date BETWEEN h.hold_start AND h.hold_end
  GROUP BY d, b.usable
  ORDER BY d
$$;

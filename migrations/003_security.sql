-- Defense-in-depth: Row-Level Security + transition triggers.
-- The web application connects as the NON-owner role `rii_app` (see .env.example: DATABASE_URL).
-- Every request runs inside a transaction that sets:
--   app.user_id = <uuid of the signed-in user>
--   app.perms   = '|perm.a|perm.b|...|'   (permissions resolved from the user's roles)
-- Migrations/seeds run as the owner (DATABASE_ADMIN_URL) and are not subject to these policies.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rii_app') THEN
    CREATE ROLE rii_app LOGIN PASSWORD 'rii_app';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO rii_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rii_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rii_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO rii_app;
-- audit & movement ledgers are append-only for the application
REVOKE UPDATE, DELETE ON audit_logs, inventory_movements, reservation_status_history, website_versions FROM rii_app;

CREATE OR REPLACE FUNCTION app_is_privileged() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname = current_user
$$;

CREATE OR REPLACE FUNCTION app_can_move_stock() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT app_has_perm('warehouse.checkout') OR app_has_perm('warehouse.checkin') OR app_has_perm('warehouse.inspect')
      OR app_has_perm('inventory.adjust_approve') OR app_has_perm('inventory.receive') OR app_has_perm('inventory.repair')
      OR app_has_perm('product.manage')
$$;

-- inventory_balances -------------------------------------------------------
ALTER TABLE inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_balances FORCE ROW LEVEL SECURITY;
CREATE POLICY inv_bal_read ON inventory_balances FOR SELECT USING (true);
CREATE POLICY inv_bal_insert ON inventory_balances FOR INSERT WITH CHECK (app_has_perm('product.manage'));
CREATE POLICY inv_bal_update ON inventory_balances FOR UPDATE USING (app_can_move_stock()) WITH CHECK (app_can_move_stock());

-- inventory_movements ------------------------------------------------------
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
CREATE POLICY inv_mov_read ON inventory_movements FOR SELECT USING (app_has_perm('inventory.view'));
CREATE POLICY inv_mov_insert ON inventory_movements FOR INSERT
  WITH CHECK (app_can_move_stock() AND performed_by = app_user_id());

-- stock adjustments --------------------------------------------------------
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments FORCE ROW LEVEL SECURITY;
CREATE POLICY adj_read ON stock_adjustments FOR SELECT USING (app_has_perm('inventory.view'));
CREATE POLICY adj_insert ON stock_adjustments FOR INSERT
  WITH CHECK (app_has_perm('inventory.adjust_request') AND requested_by = app_user_id());
CREATE POLICY adj_update ON stock_adjustments FOR UPDATE USING (app_has_perm('inventory.adjust_approve'));

-- reservations -------------------------------------------------------------
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations FORCE ROW LEVEL SECURITY;
CREATE POLICY res_read ON reservations FOR SELECT
  USING (requester_id = app_user_id() OR app_has_perm('reservation.view_all'));
CREATE POLICY res_insert ON reservations FOR INSERT
  WITH CHECK (requester_id = app_user_id() AND app_has_perm('reservation.create'));
CREATE POLICY res_update ON reservations FOR UPDATE
  USING (requester_id = app_user_id() OR app_has_perm('reservation.view_all'));
CREATE POLICY res_delete ON reservations FOR DELETE
  USING (requester_id = app_user_id() AND status = 'draft');

ALTER TABLE reservation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_items FORCE ROW LEVEL SECURITY;
CREATE POLICY resi_all ON reservation_items FOR ALL
  USING (EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id))
  WITH CHECK (EXISTS (SELECT 1 FROM reservations r WHERE r.id = reservation_id));

-- Status transitions are permission-checked inside the database as well.
CREATE OR REPLACE FUNCTION enforce_reservation_transition() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ok boolean := true;
BEGIN
  IF app_is_privileged() OR NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status IN ('approved','rejected') THEN
    ok := app_has_perm('reservation.approve') AND OLD.status = 'pending_approval';
  ELSIF NEW.status IN ('preparing','ready_for_dispatch') THEN
    ok := app_has_perm('warehouse.pick');
  ELSIF NEW.status = 'checked_out' THEN
    ok := app_has_perm('warehouse.checkout');
  ELSIF NEW.status IN ('partially_returned','returned','completed') THEN
    ok := app_has_perm('warehouse.checkin');
  ELSIF NEW.status = 'pending_approval' THEN
    ok := OLD.status = 'draft' AND NEW.requester_id = app_user_id();
  ELSIF NEW.status = 'cancelled' THEN
    ok := app_has_perm('reservation.cancel_any')
       OR (NEW.requester_id = app_user_id() AND OLD.status IN ('draft','pending_approval','approved'));
  ELSIF NEW.status = 'draft' THEN
    ok := false;
  END IF;
  IF NOT ok THEN
    RAISE EXCEPTION 'permission denied for reservation transition % -> %', OLD.status, NEW.status
      USING ERRCODE = '42501';
  END IF;
  -- A requester can never approve their own reservation
  IF NEW.status = 'approved' AND NEW.requester_id = app_user_id() AND NOT app_has_perm('*') THEN
    RAISE EXCEPTION 'requester cannot approve own reservation' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reservations_transition BEFORE UPDATE OF status ON reservations
  FOR EACH ROW EXECUTE FUNCTION enforce_reservation_transition();

-- website publishing -------------------------------------------------------
ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY wv_read ON website_versions FOR SELECT USING (true);
CREATE POLICY wv_insert ON website_versions FOR INSERT
  WITH CHECK (app_has_perm('website.publish') AND published_by = app_user_id());

CREATE OR REPLACE FUNCTION enforce_website_publish() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF app_is_privileged() THEN RETURN NEW; END IF;
  IF NEW.published_version_id IS DISTINCT FROM OLD.published_version_id AND NOT app_has_perm('website.publish') THEN
    RAISE EXCEPTION 'permission denied: website.publish required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER websites_publish_guard BEFORE UPDATE ON websites
  FOR EACH ROW EXECUTE FUNCTION enforce_website_publish();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['websites','website_themes','website_settings','website_pages','website_sections'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (true)', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (app_has_perm(''website.edit''))', t || '_ins', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (app_has_perm(''website.edit'') OR app_has_perm(''website.publish''))', t || '_upd', t);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (app_has_perm(''website.edit''))', t || '_del', t);
  END LOOP;
END $$;

-- audit logs ---------------------------------------------------------------
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON audit_logs FOR SELECT USING (app_has_perm('audit.view'));
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (user_id IS NULL OR user_id = app_user_id());

-- products & categories: writes require product/category management ---------
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY products_read ON products FOR SELECT USING (true);
CREATE POLICY products_ins ON products FOR INSERT WITH CHECK (app_has_perm('product.manage'));
CREATE POLICY products_upd ON products FOR UPDATE USING (app_has_perm('product.manage') OR app_has_perm('warehouse.relocate'));
CREATE POLICY products_del ON products FOR DELETE USING (app_has_perm('product.manage'));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories FORCE ROW LEVEL SECURITY;
CREATE POLICY cat_read ON categories FOR SELECT USING (true);
CREATE POLICY cat_write ON categories FOR ALL USING (app_has_perm('category.manage')) WITH CHECK (app_has_perm('category.manage'));

-- 004: database-level guards for administrative tables written by Phase 5 screens.
-- The application checks permissions too; these policies make the database refuse writes
-- even if an application-level check were missing.

-- role assignments & the role→permission matrix: users.manage only
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY ur_read ON user_roles FOR SELECT USING (true);
CREATE POLICY ur_write ON user_roles FOR ALL USING (app_has_perm('users.manage')) WITH CHECK (app_has_perm('users.manage'));

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY rp_read ON role_permissions FOR SELECT USING (true);
CREATE POLICY rp_write ON role_permissions FOR ALL USING (app_has_perm('users.manage')) WITH CHECK (app_has_perm('users.manage'));

-- application settings: settings.manage only
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings FORCE ROW LEVEL SECURITY;
CREATE POLICY set_read ON app_settings FOR SELECT USING (true);
CREATE POLICY set_write ON app_settings FOR ALL USING (app_has_perm('settings.manage')) WITH CHECK (app_has_perm('settings.manage'));

-- warehouses & storage locations: location.manage only
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses FORCE ROW LEVEL SECURITY;
CREATE POLICY wh_read ON warehouses FOR SELECT USING (true);
CREATE POLICY wh_write ON warehouses FOR ALL USING (app_has_perm('location.manage')) WITH CHECK (app_has_perm('location.manage'));

ALTER TABLE storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_locations FORCE ROW LEVEL SECURITY;
CREATE POLICY sl_read ON storage_locations FOR SELECT USING (true);
CREATE POLICY sl_write ON storage_locations FOR ALL USING (app_has_perm('location.manage')) WITH CHECK (app_has_perm('location.manage'));

-- collections: official ones need category.manage; wishlists belong to their owner
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections FORCE ROW LEVEL SECURITY;
CREATE POLICY col_read ON collections FOR SELECT
  USING (kind = 'official' OR owner_id = app_user_id() OR app_has_perm('category.manage'));
CREATE POLICY col_write ON collections FOR ALL
  USING ((kind = 'official' AND app_has_perm('category.manage')) OR (kind = 'wishlist' AND owner_id = app_user_id()))
  WITH CHECK ((kind = 'official' AND app_has_perm('category.manage')) OR (kind = 'wishlist' AND owner_id = app_user_id()));

ALTER TABLE collection_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_products FORCE ROW LEVEL SECURITY;
CREATE POLICY cp_read ON collection_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id));
CREATE POLICY cp_write ON collection_products FOR ALL
  USING (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id
                  AND ((c.kind = 'official' AND app_has_perm('category.manage')) OR (c.kind = 'wishlist' AND c.owner_id = app_user_id()))))
  WITH CHECK (EXISTS (SELECT 1 FROM collections c WHERE c.id = collection_id
                  AND ((c.kind = 'official' AND app_has_perm('category.manage')) OR (c.kind = 'wishlist' AND c.owner_id = app_user_id()))));

-- projects: anyone with project.create may insert; edits need project.manage or being the creator/PIC
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
CREATE POLICY prj_read ON projects FOR SELECT USING (true);
CREATE POLICY prj_ins ON projects FOR INSERT WITH CHECK (app_has_perm('project.create') OR app_has_perm('project.manage'));
CREATE POLICY prj_upd ON projects FOR UPDATE USING (app_has_perm('project.manage'));
CREATE POLICY prj_del ON projects FOR DELETE USING (app_has_perm('project.manage'));

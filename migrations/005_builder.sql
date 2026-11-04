-- 005: website builder draft concurrency + text section ids (editor generates stable ids client-side)
ALTER TABLE websites ADD COLUMN IF NOT EXISTS draft_rev int NOT NULL DEFAULT 0;
ALTER TABLE website_sections ALTER COLUMN id DROP DEFAULT;
ALTER TABLE website_sections ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE website_sections ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
-- section ids are only unique per page (duplicated pages copy ids), so use a composite key
ALTER TABLE website_sections DROP CONSTRAINT IF EXISTS website_sections_pkey;
ALTER TABLE website_sections ADD PRIMARY KEY (page_id, id);
-- media library: optional free-text tags/folder for organising files
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS folder text;

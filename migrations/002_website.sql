-- Website Builder schema
-- Draft state lives in websites / website_themes / website_settings / website_pages / website_sections.
-- Published state is an immutable snapshot in website_versions referenced by websites.published_version_id.
-- The live site renders ONLY the published snapshot; product & availability data is always read live
-- from the catalog/inventory tables (templates never store inventory).

CREATE TABLE website_templates (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL,
  description text NOT NULL,
  config      jsonb NOT NULL,
  sort        int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX website_templates_category_idx ON website_templates(category);

CREATE TABLE websites (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  template_id          text REFERENCES website_templates(id) ON DELETE SET NULL,
  is_primary           boolean NOT NULL DEFAULT false,
  published_version_id bigint,
  draft_updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES users(id),
  created_at           timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX websites_one_primary ON websites(is_primary) WHERE is_primary;

CREATE TABLE website_themes (
  website_id uuid PRIMARY KEY REFERENCES websites(id) ON DELETE CASCADE,
  theme      jsonb NOT NULL
);

CREATE TABLE website_settings (
  website_id   uuid PRIMARY KEY REFERENCES websites(id) ON DELETE CASCADE,
  header       jsonb NOT NULL,
  footer       jsonb NOT NULL,
  navigation   jsonb NOT NULL DEFAULT '[]',
  seo          jsonb NOT NULL DEFAULT '{}',
  domain       jsonb NOT NULL DEFAULT '{}',
  require_login boolean NOT NULL DEFAULT true
);

CREATE TABLE website_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id      uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  title           text NOT NULL,
  page_type       text NOT NULL DEFAULT 'custom' CHECK (page_type IN (
                    'home','catalog','product','collections','collection','about','contact','cart','login',
                    'my_reservations','reservation','account','custom')),
  is_home         boolean NOT NULL DEFAULT false,
  is_system       boolean NOT NULL DEFAULT false,
  seo_title       text,
  seo_description text,
  sort            int NOT NULL DEFAULT 0,
  UNIQUE (website_id, slug),
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*(/[a-z0-9:]+(-[a-z0-9]+)*)*$' OR slug = '')
);
CREATE UNIQUE INDEX website_pages_one_home ON website_pages(website_id) WHERE is_home;

CREATE TABLE website_sections (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id    uuid NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  type       text NOT NULL,
  variant    text NOT NULL DEFAULT 'default',
  props      jsonb NOT NULL DEFAULT '{}',
  style      jsonb NOT NULL DEFAULT '{}',
  sort       int NOT NULL DEFAULT 0,
  hidden     boolean NOT NULL DEFAULT false
);
CREATE INDEX website_sections_page_idx ON website_sections(page_id, sort);

CREATE TABLE website_versions (
  id           bigserial PRIMARY KEY,
  website_id   uuid NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  version_no   int NOT NULL,
  snapshot     jsonb NOT NULL,
  note         text,
  published_by uuid REFERENCES users(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (website_id, version_no)
);

ALTER TABLE websites ADD CONSTRAINT websites_published_version_fk
  FOREIGN KEY (published_version_id) REFERENCES website_versions(id) ON DELETE SET NULL;

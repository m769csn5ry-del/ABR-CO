-- Listing Studio — schéma relationnel.
--
-- La version navigateur reproduit ces tables dans le stockage local
-- (src/core/db.js). Ce fichier décrit la cible serveur : PostgreSQL avec
-- Row Level Security, afin qu'un utilisateur n'accède qu'à ses propres
-- données, y compris en cas d'erreur applicative.
--
--   psql "$DATABASE_URL" -f server/schema.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Identité de l'appelant, positionnée par la couche applicative :
--   SET LOCAL app.user_id = '<uuid>';
CREATE OR REPLACE FUNCTION app_current_user() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------- Users
CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE,
  name          text NOT NULL DEFAULT '',
  company       text NOT NULL DEFAULT '',
  plan          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','agency')),
  settings      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------- Clients
CREATE TABLE IF NOT EXISTS clients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text NOT NULL,
  email            text,
  phone            text,
  company          text,
  properties_count integer NOT NULL DEFAULT 0,
  status           text NOT NULL DEFAULT 'prospect'
                   CHECK (status IN ('prospect','discussion','client','termine')),
  notes            text NOT NULL DEFAULT '',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clients_user_idx ON clients(user_id);

-- ---------------------------------------------------------- Properties
CREATE TABLE IF NOT EXISTS properties (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES clients(id) ON DELETE SET NULL,
  name        text NOT NULL DEFAULT '',
  type        text NOT NULL DEFAULT 'appartement',
  address     text, city text, country text, district text,
  guests      integer, bedrooms integer, beds integer, bathrooms integer,
  surface     numeric, floor integer, elevator boolean, year integer,
  currency    text NOT NULL DEFAULT 'EUR',
  amenities   jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_user_idx ON properties(user_id);

-- ------------------------------------------------------------ Projects
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id     uuid REFERENCES clients(id) ON DELETE SET NULL,
  property_id   uuid REFERENCES properties(id) ON DELETE CASCADE,
  name          text NOT NULL DEFAULT 'Nouveau projet',
  status        text NOT NULL DEFAULT 'brouillon'
                CHECK (status IN ('brouillon','en_cours','pret','publie','archive')),
  positioning   jsonb NOT NULL DEFAULT '{}'::jsonb,
  platforms     jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing       jsonb NOT NULL DEFAULT '{}'::jsonb,
  step          integer NOT NULL DEFAULT 1,
  is_demo       boolean NOT NULL DEFAULT false,
  export_count  integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_user_idx ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_client_idx ON projects(client_id);

-- ------------------------------------------------------------ Listings
CREATE TABLE IF NOT EXISTS listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tone        text NOT NULL DEFAULT 'premium',
  content     jsonb NOT NULL,           -- titre, descriptions, sections…
  score       jsonb,                    -- Listing Score détaillé
  engine      text NOT NULL DEFAULT 'local',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listings_project_idx ON listings(project_id);

-- ----------------------------------------------------- ListingVersions
CREATE TABLE IF NOT EXISTS listing_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  label       text NOT NULL,
  snapshot    jsonb NOT NULL,
  score_total numeric,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS listing_versions_project_idx ON listing_versions(project_id, created_at DESC);

-- -------------------------------------------------------------- Photos
CREATE TABLE IF NOT EXISTS photos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  storage_key   text NOT NULL,          -- objet en stockage (S3/R2…)
  filename      text NOT NULL,
  label         text,
  mime          text NOT NULL DEFAULT 'image/jpeg',
  size_bytes    bigint,
  width         integer, height integer,
  category      text,
  category_confidence numeric,
  category_source text,
  position      integer NOT NULL DEFAULT 0,
  order_reason  text,
  is_demo       boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photos_project_idx ON photos(project_id, position);

-- ------------------------------------------------------ PhotoAnalyses
CREATE TABLE IF NOT EXISTS photo_analyses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_id    uuid NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  scores      jsonb NOT NULL,           -- netteté, luminosité, composition…
  metrics     jsonb NOT NULL,           -- mesures brutes
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  engine      text NOT NULL DEFAULT 'local-vision',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS photo_analyses_photo_idx ON photo_analyses(photo_id);

-- ----------------------------------------------------------- Platforms
-- Table de référence, partagée (pas de RLS) : chaque ligne décrit les
-- contraintes d'un canal de diffusion. En ajouter une ne demande aucun
-- changement de code côté application (voir src/platforms/).
CREATE TABLE IF NOT EXISTS platforms (
  id          text PRIMARY KEY,         -- 'airbnb', 'booking'…
  label       text NOT NULL,
  group_name  text NOT NULL DEFAULT 'Autres',
  limits      jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules       jsonb NOT NULL DEFAULT '[]'::jsonb,
  active      boolean NOT NULL DEFAULT true
);

INSERT INTO platforms (id, label, group_name, limits) VALUES
  ('airbnb','Airbnb','Location courte durée','{"title":50,"short":500,"long":5000}'),
  ('booking','Booking.com','Location courte durée','{"title":70,"short":300,"long":4000}'),
  ('vrbo','Vrbo','Location courte durée','{"title":80,"short":400,"long":10000}'),
  ('abritel','Abritel','Location courte durée','{"title":80,"short":400,"long":10000}'),
  ('expedia','Expedia','Distribution','{"title":60,"short":250,"long":2500}'),
  ('leboncoin','Leboncoin','Petites annonces','{"title":50,"short":250,"long":4000}'),
  ('pap','PAP','Petites annonces','{"title":60,"short":200,"long":2000}'),
  ('facebook','Facebook Marketplace','Petites annonces','{"title":100,"short":200,"long":5000}'),
  ('generic','Format universel','Universel','{"title":90,"short":600,"long":12000}')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------- Templates
CREATE TABLE IF NOT EXISTS templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,  -- NULL = template intégré
  label       text NOT NULL,
  category    text NOT NULL DEFAULT 'Mes templates',
  description text NOT NULL DEFAULT '',
  preset      jsonb NOT NULL DEFAULT '{}'::jsonb,
  builtin     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS templates_user_idx ON templates(user_id);

-- ------------------------------------------------------------- Reports
CREATE TABLE IF NOT EXISTS reports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES clients(id) ON DELETE SET NULL,
  title          text NOT NULL,
  score_before   numeric,
  score_potential numeric,
  is_demo        boolean NOT NULL DEFAULT false,
  model          jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_user_idx ON reports(user_id, created_at DESC);

-- ------------------------------------------ PricingRecommendations
CREATE TABLE IF NOT EXISTS pricing_recommendations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  recommended  numeric NOT NULL,
  floor_price  numeric,
  ceiling_price numeric,
  positioning  text,
  season       text,
  inputs       jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Traçabilité exigée : d'où vient l'estimation, et de quand.
  source       text NOT NULL DEFAULT 'internal',
  source_label text NOT NULL DEFAULT 'Estimation interne Listing Studio',
  external_data boolean NOT NULL DEFAULT false,
  as_of        timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pricing_project_idx ON pricing_recommendations(project_id, created_at DESC);

-- ------------------------------------------------- Row Level Security
-- Chaque table porteuse de données utilisateur n'expose que les lignes de
-- l'utilisateur courant. `platforms` reste en lecture partagée.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','properties','projects','listings','listing_versions',
                           'photos','photo_analyses','reports','pricing_recommendations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON %I', t, t);
    EXECUTE format(
      'CREATE POLICY %I_isolation ON %I USING (user_id = app_current_user())
                                        WITH CHECK (user_id = app_current_user())', t, t);
  END LOOP;
END $$;

-- Les templates intégrés (user_id NULL) sont visibles de tous, en lecture.
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS templates_isolation ON templates;
CREATE POLICY templates_isolation ON templates
  USING (user_id = app_current_user() OR (user_id IS NULL AND builtin))
  WITH CHECK (user_id = app_current_user());

-- Un utilisateur ne lit que sa propre fiche.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_self ON users
  USING (id = app_current_user()) WITH CHECK (id = app_current_user());

-- ------------------------------------------------------- updated_at
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','clients','properties','projects','listings']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch ON %I', t, t);
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON %I
                    FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t, t);
  END LOOP;
END $$;

COMMIT;

-- MVP-002 base migration: PostGIS + tenant tables + RLS.
-- FINCA has only tercero_id (no usuario_id column by design);
-- its tenant isolation resolves indirectly via the finca->tercero->usuario_id join.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Merchant profiles (tenant root).
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL
);

-- Business partners (tenant-scoped owner).
CREATE TABLE IF NOT EXISTS terceros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios (id),
  nombre text NOT NULL,
  documento text NOT NULL,
  contacto text NOT NULL
);

-- Farms (only tercero_id; spatial point derived from latitud/longitud).
CREATE TABLE IF NOT EXISTS fincas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id uuid NOT NULL REFERENCES terceros (id),
  nombre text NOT NULL,
  direccion text NOT NULL,
  latitud double precision NOT NULL,
  longitud double precision NOT NULL,
  ubicacion geometry(Point, 4326)
);

-- Row-Level Security: every query must run with app.usuario_id set
-- (e.g. SET LOCAL app.usuario_id = '<usuario_id>').
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE terceros ENABLE ROW LEVEL SECURITY;
ALTER TABLE fincas ENABLE ROW LEVEL SECURITY;

-- Owners bypass RLS by default; force it so the app role is always isolated,
-- even when it owns the tables.
ALTER TABLE usuarios FORCE ROW LEVEL SECURITY;
ALTER TABLE terceros FORCE ROW LEVEL SECURITY;
ALTER TABLE fincas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_usuarios ON usuarios;
CREATE POLICY aislamiento_usuarios ON usuarios
  USING (
    id::text = current_setting('app.usuario_id', true)
    OR email = current_setting('app.auth_email', true)
  )
  WITH CHECK (
    id::text = current_setting('app.usuario_id', true)
    OR email = current_setting('app.auth_email', true)
  );

DROP POLICY IF EXISTS aislamiento_terceros ON terceros;
CREATE POLICY aislamiento_terceros ON terceros
  USING (usuario_id::text = current_setting('app.usuario_id', true));
ALTER POLICY aislamiento_terceros ON terceros
  WITH CHECK (usuario_id::text = current_setting('app.usuario_id', true));

-- Indirect tenant isolation for FINCA via join finca->tercero->usuario_id.
DROP POLICY IF EXISTS aislamiento_fincas ON fincas;
CREATE POLICY aislamiento_fincas ON fincas
  USING (
    EXISTS (
      SELECT 1 FROM terceros
      WHERE terceros.id = fincas.tercero_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM terceros
      WHERE terceros.id = fincas.tercero_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

-- The application never runs as the migration/admin role.
GRANT USAGE ON SCHEMA public TO elinain_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios, terceros, fincas TO elinain_runtime;

-- REFRESH-001: tabla sesiones + FKs + RLS + índices + permisos runtime.

CREATE TABLE IF NOT EXISTS sesiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios (id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  familia_id uuid NOT NULL,
  reemplazado_por uuid REFERENCES sesiones (id) ON DELETE SET NULL,
  revocado boolean NOT NULL DEFAULT false,
  revocado_en timestamp with time zone,
  revocado_motivo text,
  creado_en timestamp with time zone NOT NULL DEFAULT now(),
  expira_en timestamp with time zone NOT NULL,
  ip text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_sesiones_token_hash ON sesiones (token_hash);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_familia_id ON sesiones (familia_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira_en ON sesiones (expira_en);

ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_sesiones ON sesiones;
CREATE POLICY aislamiento_sesiones ON sesiones
  USING (
    usuario_id::text = current_setting('app.usuario_id', true)
    OR token_hash = current_setting('app.auth_token_hash', true)
  )
  WITH CHECK (
    usuario_id::text = current_setting('app.usuario_id', true)
    OR token_hash = current_setting('app.auth_token_hash', true)
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON sesiones TO elinain_runtime;
  END IF;
END
$$;

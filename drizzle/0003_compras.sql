-- MVP-015: tabla compras + FKs + RLS + permisos runtime.

CREATE TABLE IF NOT EXISTS compras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos (id),
  fecha timestamp with time zone NOT NULL,
  cantidad integer NOT NULL,
  peso_promedio double precision NOT NULL,
  precio_kilo double precision NOT NULL,
  valor_total double precision NOT NULL,
  nota text NOT NULL
);

-- Row-Level Security
ALTER TABLE compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_compras ON compras;
CREATE POLICY aislamiento_compras ON compras
  USING (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = compras.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = compras.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON compras TO elinain_runtime;
  END IF;
END
$$;


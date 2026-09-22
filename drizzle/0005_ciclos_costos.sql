-- MVP-027 y MVP-028: tablas ciclos y costos + FKs + RLS + permisos runtime.

CREATE TABLE IF NOT EXISTS ciclos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos (id),
  fecha timestamp with time zone NOT NULL,
  peso_observado double precision,
  notas text
);

ALTER TABLE ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciclos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_ciclos ON ciclos;
CREATE POLICY aislamiento_ciclos ON ciclos
  USING (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = ciclos.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = ciclos.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ciclos TO elinain_runtime;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS costos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos (id),
  tipo text NOT NULL,
  monto double precision NOT NULL,
  fecha timestamp with time zone NOT NULL,
  descripcion text NOT NULL
);

ALTER TABLE costos ENABLE ROW LEVEL SECURITY;
ALTER TABLE costos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_costos ON costos;
CREATE POLICY aislamiento_costos ON costos
  USING (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = costos.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = costos.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON costos TO elinain_runtime;
  END IF;
END
$$;

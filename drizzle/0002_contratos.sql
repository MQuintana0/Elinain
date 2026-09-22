-- MVP-012: tabla contratos + FKs + RLS + permisos runtime.

CREATE TABLE IF NOT EXISTS contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tercero_id uuid NOT NULL REFERENCES terceros (id),
  finca_id uuid NOT NULL REFERENCES fincas (id),
  fecha_apertura timestamp with time zone NOT NULL,
  porcentaje_comerciante double precision NOT NULL,
  porcentaje_tercero double precision NOT NULL,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  fecha_cierre timestamp with time zone,
  raza text,
  peso_promedio_actual double precision,
  cantidad_actual integer,
  valor_kilo_referencia double precision
);

-- Row-Level Security
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contratos FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_contratos ON contratos;
CREATE POLICY aislamiento_contratos ON contratos
  USING (
    EXISTS (
      SELECT 1 FROM terceros
      WHERE terceros.id = contratos.tercero_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM terceros
      WHERE terceros.id = contratos.tercero_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON contratos TO elinain_runtime;
  END IF;
END
$$;


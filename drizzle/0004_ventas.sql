-- MVP-021: tabla ventas + FKs + RLS + permisos runtime.

CREATE TABLE IF NOT EXISTS ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES contratos (id),
  fecha timestamp with time zone NOT NULL,
  cantidad_vendida integer NOT NULL,
  peso_promedio_venta double precision NOT NULL,
  precio_kilo_venta double precision NOT NULL,
  valor_bruto double precision NOT NULL,
  precio_compra_por_animal_promedio double precision NOT NULL,
  peso_promedio_compra_simple double precision NOT NULL,
  costo_estimado_compra double precision NOT NULL,
  utilidad_total double precision NOT NULL,
  valor_comerciante double precision NOT NULL,
  valor_tercero double precision NOT NULL,
  kilos_ganados_promedio double precision NOT NULL,
  utilidad_real double precision NOT NULL,
  porcentaje_utilidad_total double precision NOT NULL
);

-- Row-Level Security
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS aislamiento_ventas ON ventas;
CREATE POLICY aislamiento_ventas ON ventas
  USING (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = ventas.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contratos
      JOIN terceros ON terceros.id = contratos.tercero_id
      WHERE contratos.id = ventas.contrato_id
        AND terceros.usuario_id::text = current_setting('app.usuario_id', true)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON ventas TO elinain_runtime;

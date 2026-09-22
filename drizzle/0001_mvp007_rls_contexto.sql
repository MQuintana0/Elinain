-- MVP-007: actualiza las políticas RLS para el contexto transaccional runtime.
-- El acceso público a usuarios solo ocurre para el email solicitado,
-- establecido en app.auth_email con set_config(..., true) dentro de la
-- transacción de auth; no se abre una política de lectura global.

ALTER POLICY aislamiento_usuarios ON usuarios
  USING (
    id::text = current_setting('app.usuario_id', true)
    OR email = current_setting('app.auth_email', true)
  )
  WITH CHECK (
    id::text = current_setting('app.usuario_id', true)
    OR email = current_setting('app.auth_email', true)
  );

ALTER POLICY aislamiento_terceros ON terceros
  USING (usuario_id::text = current_setting('app.usuario_id', true))
  WITH CHECK (usuario_id::text = current_setting('app.usuario_id', true));

ALTER POLICY aislamiento_fincas ON fincas
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'elinain_runtime') THEN
    GRANT USAGE ON SCHEMA public TO elinain_runtime;
    GRANT SELECT, INSERT, UPDATE, DELETE ON usuarios, terceros, fincas TO elinain_runtime;
  END IF;
END
$$;


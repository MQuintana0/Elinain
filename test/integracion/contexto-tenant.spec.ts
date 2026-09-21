import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';

const urlConexion =
  process.env.DATABASE_URL ?? 'postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain';

describe('Contexto tenant transaccional (MVP-007)', () => {
  it('usa SET LOCAL semántico y no contamina la siguiente conexión del pool', async () => {
    const conexion = crearConexionDb(urlConexion);
    const contexto = new ContextoTenant();
    try {
      const tenantId = '8f3d2c5e-0d17-4ad7-90f2-8fd579b5e1ca';
      const tenantDentro = await contexto.ejecutar(tenantId, () =>
        conexion.ejecutarConTenant(async (transaccion) => {
          const resultado = await transaccion.execute(
            sql`SELECT current_setting('app.usuario_id', true) AS usuario_id`,
          );
          return resultado.rows[0]?.usuario_id;
        }),
      );

      expect(tenantDentro).toBe(tenantId);

      const siguientePeticion = await conexion.db.execute(
        sql`SELECT current_setting('app.usuario_id', true) AS usuario_id`,
      );
      // PostgreSQL devuelve cadena vacía para un parámetro personalizado no
      // definido cuando current_setting(..., true) se consulta fuera del tx.
      expect(siguientePeticion.rows[0]?.usuario_id).toBe('');
    } finally {
      await conexion.cerrar();
    }
  }, 15000);

  it('falla cerrado cuando una ruta protegida intenta consultar sin tenant', async () => {
    const conexion = crearConexionDb('postgres://no-debe-conectar:invalid@localhost:1/ninguna');
    try {
      await expect(
        conexion.ejecutarConTenant(() => Promise.resolve('no debe ejecutarse')),
      ).rejects.toThrow('Contexto tenant obligatorio');
    } finally {
      await conexion.cerrar();
    }
  });
});

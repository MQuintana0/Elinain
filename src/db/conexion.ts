// Single entry point to the database: every repository must go through Drizzle.
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';

export type TransaccionDb = Parameters<Parameters<NodePgDatabase['transaction']>[0]>[0];

export type TrabajoTransaccional<T> = (transaccion: TransaccionDb) => Promise<T>;

export interface ConexionDb {
  db: NodePgDatabase;
  cerrar: () => Promise<void>;
  ejecutarConTenant: <T>(trabajo: TrabajoTransaccional<T>) => Promise<T>;
}

export function crearConexionDb(urlConexion: string): ConexionDb {
  const pool = new Pool({ connectionString: urlConexion });
  const db = drizzle(pool);
  async function ejecutarConTenant<T>(trabajo: TrabajoTransaccional<T>): Promise<T> {
    const usuarioId = obtenerUsuarioIdTenantActual();
    if (!usuarioId) {
      throw new Error('Contexto tenant obligatorio');
    }
    return db.transaction(async (transaccion) => {
      // set_config(..., true) es el equivalente parametrizable de SET LOCAL:
      // el valor vive únicamente durante esta transacción y nunca en el pool.
      await transaccion.execute(
        sql`SELECT set_config('app.usuario_id', ${usuarioId}, true) AS usuario_id`,
      );
      return trabajo(transaccion);
    });
  }

  return { db, cerrar: () => pool.end(), ejecutarConTenant };
}

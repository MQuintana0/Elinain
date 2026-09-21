// Acceso a la base de datos del módulo usuarios/ (MVP-005).
// La conexión se crea de forma perezosa en la primera consulta: así los
// tests que solo compilan AppModule (p. ej. arranque-modular de MVP-001)
// no dejan un pool abierto que cuelgue jest. El ciclo de vida (cierre del
// pool) lo gestiona UsuariosModule en onApplicationShutdown.
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { crearConexionDb, type ConexionDb, type TrabajoTransaccional } from '../db/conexion';

export const BD_USUARIOS = 'BD_USUARIOS';

export class AccesoBdUsuarios {
  private conexion?: ConexionDb;

  obtenerDb(): NodePgDatabase {
    if (!this.conexion) {
      const urlConexion =
        process.env.DATABASE_URL ??
        'postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain';
      this.conexion = crearConexionDb(urlConexion);
    }
    return this.conexion.db;
  }

  ejecutarEnContextoAutenticacion<T>(email: string, trabajo: TrabajoTransaccional<T>): Promise<T> {
    const conexion = this.obtenerConexion();
    return conexion.db.transaction(async (transaccion) => {
      await transaccion.execute(
        sql`SELECT set_config('app.auth_email', ${email}, true) AS auth_email`,
      );
      return trabajo(transaccion);
    });
  }

  private obtenerConexion(): ConexionDb {
    this.obtenerDb();
    if (!this.conexion) {
      throw new Error('No se pudo inicializar la conexión de usuarios');
    }
    return this.conexion;
  }

  async cerrar(): Promise<void> {
    await this.conexion?.cerrar();
    this.conexion = undefined;
  }
}

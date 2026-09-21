// Acceso a la base de datos del módulo usuarios/ (MVP-005).
// La conexión se crea de forma perezosa en la primera consulta: así los
// tests que solo compilan AppModule (p. ej. arranque-modular de MVP-001)
// no dejan un pool abierto que cuelgue jest. El ciclo de vida (cierre del
// pool) lo gestiona UsuariosModule en onApplicationShutdown.
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { crearConexionDb, type ConexionDb } from '../db/conexion';

export const BD_USUARIOS = 'BD_USUARIOS';

export class AccesoBdUsuarios {
  private conexion?: ConexionDb;

  obtenerDb(): NodePgDatabase {
    if (!this.conexion) {
      const urlConexion =
        process.env.DATABASE_URL ?? 'postgres://elinain:elinain@localhost:5433/elinain';
      this.conexion = crearConexionDb(urlConexion);
    }
    return this.conexion.db;
  }

  async cerrar(): Promise<void> {
    await this.conexion?.cerrar();
    this.conexion = undefined;
  }
}

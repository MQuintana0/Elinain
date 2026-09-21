// Single entry point to the database: every repository must go through Drizzle.
import { Pool } from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';

export interface ConexionDb {
  db: NodePgDatabase;
  cerrar: () => Promise<void>;
}

export function crearConexionDb(urlConexion: string): ConexionDb {
  const pool = new Pool({ connectionString: urlConexion });
  const db = drizzle(pool);
  return { db, cerrar: () => pool.end() };
}

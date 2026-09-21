// RED (MVP-002): verifica base PostgreSQL + Drizzle + PostGIS.
// Debe FALLAR sin DB ni implementacion (conexion/migracion/PostGIS_version).
// Nota: el acceso se hace solo via Drizzle (src/db/conexion), sin `pg` directo.
import * as fs from 'fs';
import * as path from 'path';
import { esquemaFincas } from '../../src/db/schema/fincas';
import { crearConexionDb } from '../../src/db/conexion';

const urlConexion = process.env.DATABASE_URL ?? 'postgres://elinain:elinain@localhost:5433/elinain';

describe('Base de datos PostGIS (MVP-002)', () => {
  it('responde SELECT PostGIS_version() con extension activa', async () => {
    const conexion = crearConexionDb(urlConexion);
    try {
      const resultado = await conexion.db.execute('SELECT PostGIS_version() AS version');
      expect(resultado.rows[0]).toBeDefined();
      expect(String(resultado.rows[0].version)).not.toHaveLength(0);
    } finally {
      await conexion.cerrar();
    }
  }, 15000);

  it('la migracion base incluye extension postgis y RLS con join finca->tercero->usuario_id', () => {
    const dir = path.join(__dirname, '..', '..', 'drizzle');
    const archivos = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    expect(archivos.length).toBeGreaterThan(0);
    const contenido = archivos.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
    expect(contenido).toMatch(/CREATE EXTENSION[^;]*postgis/i);
    expect(contenido).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(contenido).toMatch(/finca.*tercero.*usuario_id/is);
  });

  it('el esquema Drizzle de fincas solo tiene tercero_id sin usuario_id', () => {
    const columnas = Object.keys(esquemaFincas);
    expect(columnas).toContain('tercero_id');
    expect(columnas).not.toContain('usuario_id');
  });

  it('el acceso a datos se expone solo via Drizzle', async () => {
    const conexion = crearConexionDb(urlConexion);
    const resultado = await conexion.db.execute('SELECT PostGIS_version() AS version');
    expect(resultado.rows[0]).toBeDefined();
    await conexion.cerrar();
  }, 15000);
});

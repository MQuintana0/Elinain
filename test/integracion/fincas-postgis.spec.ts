import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { TercerosRepository } from '../../src/terceros/terceros.repository';
import { TercerosService } from '../../src/terceros/terceros.service';
import { FincasRepository } from '../../src/fincas/fincas.repository';
import { FincasService } from '../../src/fincas/fincas.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('CRUD Fincas y PostGIS — Integración (MVP-010)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoTerceros = new TercerosRepository(accesoDb);
  const servicioTerceros = new TercerosService(repoTerceros);
  const repoFincas = new FincasRepository(accesoDb);
  const servicioFincas = new FincasService(repoFincas);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  let terceroIdA: string;
  let terceroIdB: string;
  const fincasCreadas: string[] = [];
  const tercerosCreados: string[] = [];

  beforeAll(async () => {
    await admin.db.execute(
      sql`INSERT INTO usuarios (id, nombre, email, password_hash) VALUES 
        (${usuarioA}, 'Comerciante A', ${`${usuarioA}@fincas.com`}, 'hash'),
        (${usuarioB}, 'Comerciante B', ${`${usuarioB}@fincas.com`}, 'hash')`,
    );

    const tA = await contexto.ejecutar(usuarioA, () =>
      servicioTerceros.crear({
        nombre: 'Dueño Finca A',
        documento: 'Doc-A',
        contacto: '3001',
      }),
    );
    terceroIdA = tA.id;
    tercerosCreados.push(terceroIdA);

    const tB = await contexto.ejecutar(usuarioB, () =>
      servicioTerceros.crear({
        nombre: 'Dueño Finca B',
        documento: 'Doc-B',
        contacto: '3002',
      }),
    );
    terceroIdB = tB.id;
    tercerosCreados.push(terceroIdB);
  });

  afterAll(async () => {
    try {
      for (const id of fincasCreadas) {
        await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${id}`);
      }
      for (const id of tercerosCreados) {
        await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${id}`);
      }
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('crea una finca asociada a un tercero propio y persiste el punto PostGIS', async () => {
    const finca = await contexto.ejecutar(usuarioA, () =>
      servicioFincas.crear({
        tercero_id: terceroIdA,
        nombre: 'Hacienda La Primavera',
        direccion: 'Vereda Las Flores Km 5',
        latitud: 8.751234,
        longitud: -75.881234,
      }),
    );

    expect(finca.id).toBeDefined();
    expect(finca.tercero_id).toBe(terceroIdA);
    expect(finca.latitud).toBe(8.751234);
    expect(finca.longitud).toBe(-75.881234);
    fincasCreadas.push(finca.id);

    // Verificar en base de datos la columna PostGIS ubicación
    const punto = await admin.db.execute(sql`
      SELECT ST_AsText(ubicacion) as wkt, ST_SRID(ubicacion) as srid 
      FROM fincas WHERE id = ${finca.id}
    `);
    expect(punto.rows[0]).toEqual({
      wkt: 'POINT(-75.881234 8.751234)',
      srid: 4326,
    });
  });

  it('rechaza crear una finca si el tercero_id no existe o pertenece a otro comerciante', async () => {
    // Intentar crear finca para tercero de B desde el tenant A
    await expect(
      contexto.ejecutar(usuarioA, () =>
        servicioFincas.crear({
          tercero_id: terceroIdB,
          nombre: 'Finca Intrusión',
          direccion: 'Zona Prohibida',
          latitud: 4.5,
          longitud: -74.1,
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('listar solo devuelve fincas cuyos terceros pertenecen al tenant activo', async () => {
    const fincaB = await contexto.ejecutar(usuarioB, () =>
      servicioFincas.crear({
        tercero_id: terceroIdB,
        nombre: 'Finca Exclusiva de B',
        direccion: 'Vereda Sur',
        latitud: 5.1,
        longitud: -73.2,
      }),
    );
    fincasCreadas.push(fincaB.id);

    const listaA = await contexto.ejecutar(usuarioA, () => servicioFincas.listar());
    expect(listaA.elementos.some((f) => f.id === fincaB.id)).toBe(false);

    const listaB = await contexto.ejecutar(usuarioB, () => servicioFincas.listar());
    expect(listaB.elementos.some((f) => f.id === fincaB.id)).toBe(true);
  });

  it('actualiza coordenadas y regenera el punto PostGIS', async () => {
    const finca = await contexto.ejecutar(usuarioA, () =>
      servicioFincas.crear({
        tercero_id: terceroIdA,
        nombre: 'Finca para mover',
        direccion: 'Calle 1',
        latitud: 6.0,
        longitud: -75.0,
      }),
    );
    fincasCreadas.push(finca.id);

    const actualizada = await contexto.ejecutar(usuarioA, () =>
      servicioFincas.actualizar(finca.id, {
        latitud: 7.0,
        longitud: -76.0,
      }),
    );
    expect(actualizada.latitud).toBe(7.0);
    expect(actualizada.longitud).toBe(-76.0);

    const punto = await admin.db.execute(sql`
      SELECT ST_AsText(ubicacion) as wkt FROM fincas WHERE id = ${finca.id}
    `);
    expect(punto.rows[0]).toEqual({
      wkt: 'POINT(-76 7)',
    });
  });

  it('no permite a un tenant consultar ni actualizar una finca ajena', async () => {
    const fincaB = await contexto.ejecutar(usuarioB, () =>
      servicioFincas.crear({
        tercero_id: terceroIdB,
        nombre: 'Finca Confidencial B',
        direccion: 'Vereda Norte',
        latitud: 9.0,
        longitud: -74.0,
      }),
    );
    fincasCreadas.push(fincaB.id);

    await expect(
      contexto.ejecutar(usuarioA, () => servicioFincas.buscarPorId(fincaB.id)),
    ).rejects.toBeInstanceOf(NotFoundException);

    await expect(
      contexto.ejecutar(usuarioA, () =>
        servicioFincas.actualizar(fincaB.id, { nombre: 'Intento Hack' }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { TercerosRepository } from '../../src/terceros/terceros.repository';
import { TercerosService } from '../../src/terceros/terceros.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('CRUD Terceros — Integración (MVP-009)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repositorio = new TercerosRepository(accesoDb);
  const servicio = new TercerosService(repositorio);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const tercerosCreados: string[] = [];

  beforeAll(async () => {
    await admin.db.execute(
      sql`INSERT INTO usuarios (id, nombre, email, password_hash) VALUES 
        (${usuarioA}, 'Comerciante A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante B', ${`${usuarioB}@test.com`}, 'hash')`,
    );
  });

  afterAll(async () => {
    try {
      for (const id of tercerosCreados) {
        await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${id}`);
      }
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('crea un tercero exigiendo nombre, documento y contacto bajo el tenant', async () => {
    const tercero = await contexto.ejecutar(usuarioA, () =>
      servicio.crear({
        nombre: 'Ganadería Los Sauces',
        documento: '123456789',
        contacto: '3001112233',
      }),
    );

    expect(tercero.id).toBeDefined();
    expect(tercero.nombre).toBe('Ganadería Los Sauces');
    expect(tercero.documento).toBe('123456789');
    expect(tercero.contacto).toBe('3001112233');
    expect(tercero.usuario_id).toBe(usuarioA);
    tercerosCreados.push(tercero.id);
  });

  it('listar solo devuelve los terceros pertenecientes al tenant autenticado', async () => {
    const terceroB = await contexto.ejecutar(usuarioB, () =>
      servicio.crear({
        nombre: 'Hacienda El Retiro',
        documento: '987654321',
        contacto: '3104445566',
      }),
    );
    tercerosCreados.push(terceroB.id);

    const listaA = await contexto.ejecutar(usuarioA, () => servicio.listar());
    expect(listaA.some((t) => t.id === terceroB.id)).toBe(false);

    const listaB = await contexto.ejecutar(usuarioB, () => servicio.listar());
    expect(listaB.some((t) => t.id === terceroB.id)).toBe(true);
  });

  it('actualiza datos de un tercero propio', async () => {
    const tercero = await contexto.ejecutar(usuarioA, () =>
      servicio.crear({
        nombre: 'Tercero Inicial',
        documento: '111222',
        contacto: '300000',
      }),
    );
    tercerosCreados.push(tercero.id);

    const actualizado = await contexto.ejecutar(usuarioA, () =>
      servicio.actualizar(tercero.id, {
        nombre: 'Tercero Modificado',
      }),
    );

    expect(actualizado.nombre).toBe('Tercero Modificado');
    expect(actualizado.documento).toBe('111222');
  });

  it('lanza NotFoundException al buscar o actualizar tercero ajeno o inexistente', async () => {
    const idInexistente = randomUUID();
    await expect(
      contexto.ejecutar(usuarioA, () => servicio.buscarPorId(idInexistente)),
    ).rejects.toBeInstanceOf(NotFoundException);

    // Intentar acceder a un tercero del usuario B desde el contexto del usuario A
    const terceroB = await contexto.ejecutar(usuarioB, () =>
      servicio.crear({
        nombre: 'Tercero de B',
        documento: '555666',
        contacto: '311111',
      }),
    );
    tercerosCreados.push(terceroB.id);

    await expect(
      contexto.ejecutar(usuarioA, () => servicio.buscarPorId(terceroB.id)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

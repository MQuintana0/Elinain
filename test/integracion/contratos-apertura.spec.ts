import { randomUUID } from 'node:crypto';
import { NotFoundException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ContratosRepository } from '../../src/contratos/contratos.repository';
import { ContratosService } from '../../src/contratos/contratos.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Apertura de contrato — Integración (MVP-013)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoContratos = new ContratosRepository(accesoDb);
  const servicioContratos = new ContratosService(repoContratos);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const terceroB = randomUUID();
  const fincaA = randomUUID();
  const fincaB = randomUUID();
  const contratosCreados: string[] = [];

  beforeAll(async () => {
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Tercero A', 'Doc-A', '3001'),
        (${terceroB}, ${usuarioB}, 'Tercero B', 'Doc-B', '3002')
    `);

    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca de A', 'Km 5', 8.1, -75.1),
        (${fincaB}, ${terceroB}, 'Finca de B', 'Km 10', 8.2, -75.2)
    `);
  });

  afterAll(async () => {
    try {
      for (const id of contratosCreados) {
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${id}`);
      }
      await admin.db.execute(sql`DELETE FROM fincas WHERE id IN (${fincaA}, ${fincaB})`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id IN (${terceroA}, ${terceroB})`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('apertura exitosamente un contrato asignando automáticamente estado "activo"', async () => {
    const contrato = await contexto.ejecutar(usuarioA, () =>
      servicioContratos.crear({
        tercero_id: terceroA,
        finca_id: fincaA,
        fecha_apertura: '2026-09-21T10:00:00.000Z',
        porcentaje_comerciante: 65,
        porcentaje_tercero: 35,
        raza: 'Brahman',
        peso_promedio_actual: 360,
        cantidad_actual: 50,
        valor_kilo_referencia: 8500,
      }),
    );

    expect(contrato).toBeDefined();
    expect(contrato.id).toBeDefined();
    contratosCreados.push(contrato.id);

    expect(contrato.estado).toBe('activo');
    expect(contrato.fecha_cierre).toBeNull();
    expect(contrato.porcentaje_comerciante).toBe(65);
    expect(contrato.porcentaje_tercero).toBe(35);
    expect(contrato.raza).toBe('Brahman');
    expect(contrato.peso_promedio_actual).toBe(360);
    expect(contrato.cantidad_actual).toBe(50);
    expect(contrato.valor_kilo_referencia).toBe(8500);
  });

  it('rechaza con NotFoundException si el tercero pertenece a otro comerciante', async () => {
    await expect(
      contexto.ejecutar(usuarioA, () =>
        servicioContratos.crear({
          tercero_id: terceroB, // pertenece al tenant B
          finca_id: fincaA,
          fecha_apertura: '2026-09-21T10:00:00.000Z',
          porcentaje_comerciante: 50,
          porcentaje_tercero: 50,
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza con NotFoundException si la finca pertenece a otro tercero o comerciante', async () => {
    await expect(
      contexto.ejecutar(usuarioA, () =>
        servicioContratos.crear({
          tercero_id: terceroA,
          finca_id: fincaB, // pertenece a terceroB / tenant B
          fecha_apertura: '2026-09-21T10:00:00.000Z',
          porcentaje_comerciante: 50,
          porcentaje_tercero: 50,
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('permite consultar el contrato aperturado solo al comerciante propietario', async () => {
    const contrato = await contexto.ejecutar(usuarioA, () =>
      servicioContratos.crear({
        tercero_id: terceroA,
        finca_id: fincaA,
        fecha_apertura: '2026-09-21T12:00:00.000Z',
        porcentaje_comerciante: 70,
        porcentaje_tercero: 30,
      }),
    );
    contratosCreados.push(contrato.id);

    // Consulta tenant A -> OK
    const consultadoA = await contexto.ejecutar(usuarioA, () =>
      servicioContratos.buscarPorId(contrato.id),
    );
    expect(consultadoA.id).toBe(contrato.id);
    expect(consultadoA.porcentaje_comerciante).toBe(70);

    // Consulta tenant B -> NotFoundException
    await expect(
      contexto.ejecutar(usuarioB, () => servicioContratos.buscarPorId(contrato.id)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

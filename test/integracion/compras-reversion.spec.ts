import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { NotFoundException } from '@nestjs/common';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { ContratosRepository } from '../../src/contratos/contratos.repository';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Edición y reversión de compras sin ventas (MVP-018 / RF-13)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const repoContratos = new ContratosRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  const contrato = randomUUID();
  let compra1Id: string;
  let compra2Id: string;

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Reversion', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Reversion', 'DOC-REVERSION', '300777')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Reversion', 'Km 15', 8.6, -75.6)
    `);

    // 4. Contrato sin ventas inicial
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 60, 40, 'activo', NULL, NULL)
    `);

    // 5. Compra 1: 20 animales @ 300 kg, $8.000/kg
    const c1 = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Primera compra lote',
      }),
    );
    compra1Id = c1.id;

    // 6. Compra 2: 40 animales @ 360 kg, $8.200/kg
    const c2 = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T10:00:00.000Z',
        cantidad: 40,
        peso_promedio: 360,
        precio_kilo: 8200,
        nota: 'Segunda compra lote',
      }),
    );
    compra2Id = c2.id;
  });

  afterAll(async () => {
    try {
      await admin.db.execute(sql`DELETE FROM compras WHERE contrato_id = ${contrato}`);
      await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contrato}`);
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${finca}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${tercero}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id = ${usuario}`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('verifica el estado consolidado inicial con las dos compras (60 animales, 330 kg promedio)', async () => {
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(60);
    expect(contratoDb?.peso_promedio_actual).toBe(330);
  });

  it('permite editar la compra 2 y recalcula el inventario, valor_total y promedio simple del contrato (RF-13)', async () => {
    // Editar compra 2: cambiar a 50 animales @ 380 kg y precio 8.400
    // Nuevo valor total = 50 * 380 * 8400 = 159,600,000
    // Nueva cantidad contrato = 20 + 50 = 70
    // Nuevo peso promedio contrato = (300 + 380) / 2 = 340
    const compraActualizada = await contexto.ejecutar(usuario, () =>
      servicioCompras.actualizar(compra2Id, {
        cantidad: 50,
        peso_promedio: 380,
        precio_kilo: 8400,
        nota: 'Compra 2 ajustada tras pesaje',
      }),
    );

    expect(compraActualizada.cantidad).toBe(50);
    expect(compraActualizada.peso_promedio).toBe(380);
    expect(compraActualizada.precio_kilo).toBe(8400);
    expect(compraActualizada.valor_total).toBe(159600000);
    expect(compraActualizada.nota).toBe('Compra 2 ajustada tras pesaje');

    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(70);
    expect(contratoDb?.peso_promedio_actual).toBe(340);
  });

  it('permite eliminar la compra 2 y revierte el contrato al estado de la compra 1 (RF-13)', async () => {
    await contexto.ejecutar(usuario, () => servicioCompras.eliminar(compra2Id));

    // Compra 2 ya no debe existir
    await expect(
      contexto.ejecutar(usuario, () => servicioCompras.buscarPorId(compra2Id)),
    ).rejects.toThrow(NotFoundException);

    // Contrato debe revertirse a cantidad 20 y peso 300
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(20);
    expect(contratoDb?.peso_promedio_actual).toBe(300);
  });

  it('permite eliminar la compra 1 y revierte el contrato a cantidad 0 y peso promedio nulo (RF-13)', async () => {
    await contexto.ejecutar(usuario, () => servicioCompras.eliminar(compra1Id));

    // Compra 1 ya no debe existir
    await expect(
      contexto.ejecutar(usuario, () => servicioCompras.buscarPorId(compra1Id)),
    ).rejects.toThrow(NotFoundException);

    // Contrato debe quedar en cantidad 0 y peso_promedio_actual en null
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(0);
    expect(contratoDb?.peso_promedio_actual).toBeNull();
  });
});

import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { BadRequestException } from '@nestjs/common';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { ContratosRepository } from '../../src/contratos/contratos.repository';
import { UtilidadService } from '../../src/ventas/utilidad.service';
import { VentasRepository } from '../../src/ventas/ventas.repository';
import { VentasService } from '../../src/ventas/ventas.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Locks transaccionales ante ventas concurrentes (MVP-025 / RF-16)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);
  const repoContratos = new ContratosRepository(accesoDb);
  const utilidadService = new UtilidadService();
  const repoVentas = new VentasRepository(accesoDb, utilidadService);
  const servicioVentas = new VentasService(repoVentas);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  const contrato = randomUUID();
  let compraId: string;

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Concurrencia', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Concurrencia', 'DOC-VENTAS-CONC', '300111')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Concurrencia', 'Km 40', 9.0, -76.0)
    `);

    // 4. Contrato
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 50, 50, 'activo', NULL, NULL)
    `);

    // 5. Compra: 15 animales disponibles
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 15,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra para prueba de concurrencia',
      }),
    );
    compraId = compra.id;
  });

  afterAll(async () => {
    try {
      await admin.db.execute(sql`DELETE FROM ventas WHERE contrato_id = ${contrato}`);
      if (compraId) {
        await admin.db.execute(sql`DELETE FROM compras WHERE id = ${compraId}`);
      }
      await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contrato}`);
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${finca}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${tercero}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id = ${usuario}`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('bloquea mediante FOR UPDATE dos ventas concurrentes que sumarían más que el inventario disponible', async () => {
    // Tenemos 15 animales en inventario.
    // Disparamos 2 peticiones concurrentes de 10 animales cada una (total solicitado: 20).
    const peticion1 = contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 10,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );

    const peticion2 = contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 10,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );

    const resultados = await Promise.allSettled([peticion1, peticion2]);

    const exitosas = resultados.filter((r) => r.status === 'fulfilled');
    const fallidas = resultados.filter((r) => r.status === 'rejected');

    // Exactamente 1 debe tener éxito y exactamente 1 debe fallar
    expect(exitosas).toHaveLength(1);
    expect(fallidas).toHaveLength(1);

    // La fallida debe ser por sobreventa
    const rechazo = fallidas[0];
    if (!rechazo || rechazo.status !== 'rejected') {
      throw new Error('Se esperaba una promesa rechazada');
    }
    expect(rechazo.reason).toBeInstanceOf(BadRequestException);
    expect((rechazo.reason as Error).message).toMatch(/supera la cantidad disponible/i);

    // El inventario final debe ser exactamente 5 (15 - 10), NUNCA negativo
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(5);
  });
});

import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { MethodNotAllowedException } from '@nestjs/common';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { UtilidadService } from '../../src/ventas/utilidad.service';
import { VentasRepository } from '../../src/ventas/ventas.repository';
import { VentasService } from '../../src/ventas/ventas.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Inmutabilidad total de ventas (MVP-024 / RF-22)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);
  const utilidadService = new UtilidadService();
  const repoVentas = new VentasRepository(accesoDb, utilidadService);
  const servicioVentas = new VentasService(repoVentas);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  const contrato = randomUUID();
  let compraId: string;
  let ventaId: string;

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Inmutabilidad', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Inmutabilidad', 'DOC-VENTAS-INM', '300222')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Inmutabilidad', 'Km 35', 8.98, -75.98)
    `);

    // 4. Contrato
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 50, 50, 'activo', NULL, NULL)
    `);

    // 5. Compra
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra para prueba inmutabilidad',
      }),
    );
    compraId = compra.id;

    // 6. Venta
    const venta = await contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-21T15:00:00.000Z',
        cantidad_vendida: 10,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );
    ventaId = venta.id;
  });

  afterAll(async () => {
    try {
      if (ventaId) {
        await admin.db.execute(sql`DELETE FROM ventas WHERE id = ${ventaId}`);
      }
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

  it('bloquea cualquier intento de actualización de ventas arrojando 405 MethodNotAllowed', () => {
    expect(() => servicioVentas.actualizar()).toThrow(MethodNotAllowedException);
    expect(() => servicioVentas.actualizar()).toThrow(
      'Las ventas son inmutables y no pueden ser modificadas',
    );
  });

  it('bloquea cualquier intento de eliminación de ventas arrojando 405 MethodNotAllowed', () => {
    expect(() => servicioVentas.eliminar()).toThrow(MethodNotAllowedException);
    expect(() => servicioVentas.eliminar()).toThrow(
      'Las ventas son inmutables y no pueden ser eliminadas',
    );
  });

  it('asegura que el registro de venta original permanece intacto en base de datos', async () => {
    const venta = await contexto.ejecutar(usuario, () => servicioVentas.buscarPorId(ventaId));
    expect(venta.id).toBe(ventaId);
    expect(venta.cantidad_vendida).toBe(10);
    expect(venta.valor_bruto).toBe(34200000);
  });
});

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

describe('Validaciones de inventario y cronología en ventas (MVP-022 / RF-15)', () => {
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
        (${usuario}, 'Comerciante Validaciones', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Validaciones', 'DOC-VENTAS-VAL', '300444')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Validaciones', 'Km 25', 8.9, -75.9)
    `);

    // 4. Contrato con apertura el 2026-09-20
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-20T08:00:00.000Z', 50, 50, 'activo', NULL, NULL)
    `);

    // 5. Compra el 2026-09-21: 15 animales
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 15,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Lote de prueba validaciones',
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

  it('rechaza una venta con cantidad_vendida mayor al inventario disponible (sobreventa)', async () => {
    // Intentar vender 20 animales cuando solo hay 15 disponibles
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioVentas.registrar({
          contrato_id: contrato,
          fecha: '2026-09-21T15:00:00.000Z',
          cantidad_vendida: 20,
          peso_promedio_venta: 380,
          precio_kilo_venta: 9000,
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    // Verificar que el inventario permanece intacto
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(15);
  });

  it('rechaza una venta con fecha anterior a la fecha de apertura del contrato', async () => {
    // Apertura fue 2026-09-20T08:00:00.000Z -> intentar venta el 2026-09-19
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioVentas.registrar({
          contrato_id: contrato,
          fecha: '2026-09-19T10:00:00.000Z',
          cantidad_vendida: 5,
          peso_promedio_venta: 350,
          precio_kilo_venta: 8500,
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    // Verificar que el inventario permanece intacto
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(15);
  });

  it('rechaza una venta con fecha anterior a las compras vinculadas', async () => {
    // Compra fue 2026-09-21T09:00:00.000Z -> intentar venta el 2026-09-20T12:00:00.000Z (posterior a apertura pero previa a compra)
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioVentas.registrar({
          contrato_id: contrato,
          fecha: '2026-09-20T12:00:00.000Z',
          cantidad_vendida: 5,
          peso_promedio_venta: 350,
          precio_kilo_venta: 8500,
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    // Verificar que el inventario permanece intacto
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(15);
  });
});

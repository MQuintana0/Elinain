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

describe('Cierre automático de contrato al agotar inventario (MVP-026 / RF-21)', () => {
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
        (${usuario}, 'Comerciante Cierre', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Cierre', 'DOC-VENTAS-CIERRE', '300000')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Cierre', 'Km 50', 9.1, -76.1)
    `);

    // 4. Contrato
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 50, 50, 'activo', NULL, NULL)
    `);

    // 5. Compra: 10 animales
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 10,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Lote de 10 novillos para prueba de cierre',
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

  it('mantiene el estado activo tras una venta parcial', async () => {
    // Venta parcial de 4 animales
    await contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-21T14:00:00.000Z',
        cantidad_vendida: 4,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );

    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(6);
    expect(contratoDb?.estado).toBe('activo');
    expect(contratoDb?.fecha_cierre).toBeNull();
  });

  it('cierra automáticamente el contrato cuando una venta agota el saldo disponible a 0', async () => {
    const fechaCierreExacta = '2026-09-21T17:30:00.000Z';

    // Venta de los 6 animales restantes
    await contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: fechaCierreExacta,
        cantidad_vendida: 6,
        peso_promedio_venta: 390,
        precio_kilo_venta: 9200,
      }),
    );

    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(0);
    expect(contratoDb?.estado).toBe('cerrado');
    expect(contratoDb?.fecha_cierre).not.toBeNull();
    expect(new Date(contratoDb!.fecha_cierre!).getTime()).toBe(
      new Date(fechaCierreExacta).getTime(),
    );
  });

  it('rechaza nuevas compras y nuevas ventas sobre el contrato cerrado', async () => {
    // Intento de compra sobre contrato cerrado
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioCompras.crear({
          contrato_id: contrato,
          fecha: '2026-09-22T09:00:00.000Z',
          cantidad: 5,
          peso_promedio: 300,
          precio_kilo: 8000,
          nota: 'Intento de compra sobre contrato cerrado',
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    // Intento de venta sobre contrato cerrado
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioVentas.registrar({
          contrato_id: contrato,
          fecha: '2026-09-22T10:00:00.000Z',
          cantidad_vendida: 1,
          peso_promedio_venta: 400,
          precio_kilo_venta: 9000,
        }),
      ),
    ).rejects.toThrow(BadRequestException);
  });
});

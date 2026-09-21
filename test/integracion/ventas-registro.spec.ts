import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
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

describe('Registro de ventas y orquestación de indicadores (MVP-021 / RF-14)', () => {
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
  let ventaId: string;

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Ventas', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Ventas', 'DOC-VENTAS-REG', '300555')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Ventas', 'Km 20', 8.8, -75.8)
    `);

    // 4. Contrato (60% comerciante, 40% tercero)
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 60, 40, 'activo', NULL, NULL)
    `);

    // 5. Compra: 20 animales @ 300 kg, $8.000/kg
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra para lote de venta',
      }),
    );
    compraId = compra.id;
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

  it('registra una venta exitosamente calculando todos los indicadores financieros (RF-14, RF-18, RF-19)', async () => {
    // Venta de 10 animales @ 380 kg, $9.000/kg
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

    // Verificaciones de cálculos
    expect(venta.contrato_id).toBe(contrato);
    expect(venta.cantidad_vendida).toBe(10);
    expect(venta.peso_promedio_venta).toBe(380);
    expect(venta.precio_kilo_venta).toBe(9000);
    expect(venta.valor_bruto).toBe(34200000); // 10 * 380 * 9000
    expect(venta.precio_compra_por_animal_promedio).toBe(2400000); // 300 * 8000
    expect(venta.peso_promedio_compra_simple).toBe(300);
    expect(venta.costo_estimado_compra).toBe(24000000); // 10 * 2,400,000
    expect(venta.utilidad_total).toBe(10200000); // 34,200,000 - 24,000,000
    expect(venta.valor_comerciante).toBe(6120000); // 10,200,000 * 0.60
    expect(venta.valor_tercero).toBe(4080000); // 10,200,000 * 0.40
    expect(venta.utilidad_real).toBe(6120000); // Igual a valor_comerciante
    expect(venta.kilos_ganados_promedio).toBe(80); // 380 - 300
    expect(venta.porcentaje_utilidad_total).toBe(42.5); // (10.2M / 24M) * 100

    // Verificación de actualización de inventario del contrato
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(10); // 20 - 10
    expect(contratoDb?.estado).toBe('activo');
  });

  it('permite consultar la venta por ID y en el listado paginado', async () => {
    const venta = await contexto.ejecutar(usuario, () => servicioVentas.buscarPorId(ventaId));
    expect(venta.id).toBe(ventaId);
    expect(venta.cantidad_vendida).toBe(10);

    const pagina = await contexto.ejecutar(usuario, () => servicioVentas.listar(contrato));
    expect(pagina.total).toBe(1);
    expect(pagina.elementos[0]?.id).toBe(ventaId);
  });
});

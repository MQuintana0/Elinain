import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
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

describe('Snapshot de promedios simples inmutable por venta (MVP-023 / RF-20)', () => {
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
  let venta1Id: string;

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Snapshot', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Snapshot', 'DOC-VENTAS-SNAP', '300333')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Snapshot', 'Km 30', 8.95, -75.95)
    `);

    // 4. Contrato (60% comerciante, 40% tercero)
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-01T08:00:00.000Z', 60, 40, 'activo', NULL, NULL)
    `);

    // 5. Compra 1: 20 animales @ 300 kg, $8.000/kg ($2.400.000/animal) el 2026-09-02
    await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-02T08:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Compra inicial lote 1',
      }),
    );
  });

  afterAll(async () => {
    try {
      await admin.db.execute(sql`DELETE FROM ventas WHERE contrato_id = ${contrato}`);
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

  it('persiste el snapshot en Venta 1 y verifica que compras y ventas posteriores no lo alteran', async () => {
    // 1. Venta 1 de 10 animales el 2026-09-10
    const v1 = await contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-10T10:00:00.000Z',
        cantidad_vendida: 10,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );
    venta1Id = v1.id;

    // Snapshot inicial capturado
    expect(v1.peso_promedio_compra_simple).toBe(300);
    expect(v1.precio_compra_por_animal_promedio).toBe(2400000);
    expect(v1.costo_estimado_compra).toBe(24000000);
    expect(v1.utilidad_total).toBe(10200000);

    // 2. Compra 2 ingresa el 2026-09-15: 30 animales @ 360 kg, $9.000/kg ($3.240.000/animal)
    // El nuevo promedio simple entre compras a partir de aquí sería:
    // peso: (300 + 360) / 2 = 330 kg
    // valor/animal: (2.400.000 + 3.240.000) / 2 = 2.820.000
    await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-15T08:00:00.000Z',
        cantidad: 30,
        peso_promedio: 360,
        precio_kilo: 9000,
        nota: 'Segunda compra fusión',
      }),
    );

    // 3. Venta 2 de 15 animales el 2026-09-20
    const v2 = await contexto.ejecutar(usuario, () =>
      servicioVentas.registrar({
        contrato_id: contrato,
        fecha: '2026-09-20T10:00:00.000Z',
        cantidad_vendida: 15,
        peso_promedio_venta: 400,
        precio_kilo_venta: 9500,
      }),
    );

    // Venta 2 adopta el nuevo promedio
    expect(v2.peso_promedio_compra_simple).toBe(330);
    expect(v2.precio_compra_por_animal_promedio).toBe(2820000);

    // 4. Relectura de Venta 1 desde la base de datos: SUS SNAPSHOTS DEBEN ESTAR INTACTOS
    const venta1Releida = await contexto.ejecutar(usuario, () =>
      servicioVentas.buscarPorId(venta1Id),
    );

    expect(venta1Releida.peso_promedio_compra_simple).toBe(300);
    expect(venta1Releida.precio_compra_por_animal_promedio).toBe(2400000);
    expect(venta1Releida.costo_estimado_compra).toBe(24000000);
    expect(venta1Releida.utilidad_total).toBe(10200000);
    expect(venta1Releida.valor_comerciante).toBe(6120000);
    expect(venta1Releida.valor_tercero).toBe(4080000);
  });
});

import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ReportesRepository } from '../../src/reportes/reportes.repository';
import { ReportesService } from '../../src/reportes/reportes.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Reportes por agregación — Integración (MVP-029)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoReportes = new ReportesRepository(accesoDb);
  const servicioReportes = new ReportesService(repoReportes);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const terceroB = randomUUID();
  const fincaA = randomUUID();
  const fincaB = randomUUID();
  const contratoActivoA1 = randomUUID();
  const contratoActivoA2 = randomUUID();
  const contratoCerradoA = randomUUID();
  const contratoActivoB = randomUUID();

  beforeAll(async () => {
    // 1. Usuarios
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante Reportes A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante Reportes B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    // 2. Terceros
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Tercero Reportes A', 'DOC-RA', '3001'),
        (${terceroB}, ${usuarioB}, 'Tercero Reportes B', 'DOC-RB', '3002')
    `);

    // 3. Fincas
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca Reportes A', 'Km 1', 8.1, -75.1),
        (${fincaB}, ${terceroB}, 'Finca Reportes B', 'Km 2', 8.2, -75.2)
    `);

    // 4. Contratos
    // Usuario A: 2 activos, 1 cerrado
    // Usuario B: 1 activo
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contratoActivoA1}, ${terceroA}, ${fincaA}, '2026-09-20T10:00:00.000Z', 60, 40, 'activo', 25, 320),
        (${contratoActivoA2}, ${terceroA}, ${fincaA}, '2026-09-21T10:00:00.000Z', 70, 30, 'activo', 15, 340),
        (${contratoCerradoA}, ${terceroA}, ${fincaA}, '2026-09-19T10:00:00.000Z', 50, 50, 'cerrado', 0, null),
        (${contratoActivoB}, ${terceroB}, ${fincaB}, '2026-09-21T11:00:00.000Z', 55, 45, 'activo', 50, 300)
    `);

    // 5. Compras
    await admin.db.execute(sql`
      INSERT INTO compras (id, contrato_id, fecha, cantidad, peso_promedio, precio_kilo, valor_total, nota) VALUES
        (${randomUUID()}, ${contratoActivoA1}, '2026-09-20T11:00:00.000Z', 35, 310, 8000, 86800000, 'Compra 1 A1'),
        (${randomUUID()}, ${contratoActivoA2}, '2026-09-21T11:00:00.000Z', 15, 340, 8200, 41820000, 'Compra 1 A2'),
        (${randomUUID()}, ${contratoActivoB}, '2026-09-21T12:00:00.000Z', 50, 300, 8000, 120000000, 'Compra 1 B')
    `);

    // 6. Ventas (solo en contratoActivoA1 y contratoActivoB)
    // Venta A1: cantidad 10, bruto 35M, costo 24.8M, utilidad total 10.2M, comerciante 6.12M, tercero 4.08M
    await admin.db.execute(sql`
      INSERT INTO ventas (
        id, contrato_id, fecha, cantidad_vendida, peso_promedio_venta, precio_kilo_venta,
        valor_bruto, precio_compra_por_animal_promedio, peso_promedio_compra_simple,
        costo_estimado_compra, utilidad_total, valor_comerciante, valor_tercero,
        kilos_ganados_promedio, utilidad_real, porcentaje_utilidad_total
      ) VALUES (
        ${randomUUID()}, ${contratoActivoA1}, '2026-09-21T15:00:00.000Z', 10, 380, 9000,
        34200000, 2480000, 310, 24800000, 9400000, 5640000, 3760000,
        70, 5640000, 37.9
      ), (
        ${randomUUID()}, ${contratoActivoB}, '2026-09-21T16:00:00.000Z', 5, 360, 8800,
        15840000, 2400000, 300, 12000000, 3840000, 2112000, 1728000,
        60, 2112000, 32.0
      )
    `);

    // 7. Costos
    await admin.db.execute(sql`
      INSERT INTO costos (id, contrato_id, tipo, monto, fecha, descripcion) VALUES
        (${randomUUID()}, ${contratoActivoA1}, 'flete', 750000, '2026-09-20T12:00:00.000Z', 'Flete inicial A1'),
        (${randomUUID()}, ${contratoActivoA2}, 'insumos', 250000, '2026-09-21T12:00:00.000Z', 'Sal mineralizada A2'),
        (${randomUUID()}, ${contratoActivoB}, 'veterinaria', 400000, '2026-09-21T13:00:00.000Z', 'Vacunas B')
    `);
  });

  afterAll(async () => {
    try {
      await admin.db.execute(
        sql`DELETE FROM costos WHERE contrato_id IN (${contratoActivoA1}, ${contratoActivoA2}, ${contratoCerradoA}, ${contratoActivoB})`,
      );
      await admin.db.execute(
        sql`DELETE FROM ventas WHERE contrato_id IN (${contratoActivoA1}, ${contratoActivoA2}, ${contratoCerradoA}, ${contratoActivoB})`,
      );
      await admin.db.execute(
        sql`DELETE FROM compras WHERE contrato_id IN (${contratoActivoA1}, ${contratoActivoA2}, ${contratoCerradoA}, ${contratoActivoB})`,
      );
      await admin.db.execute(
        sql`DELETE FROM contratos WHERE id IN (${contratoActivoA1}, ${contratoActivoA2}, ${contratoCerradoA}, ${contratoActivoB})`,
      );
      await admin.db.execute(sql`DELETE FROM fincas WHERE id IN (${fincaA}, ${fincaB})`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id IN (${terceroA}, ${terceroB})`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('obtiene el dashboard con agregaciones exactas para el comerciante A (RF-26)', async () => {
    const dashboardA = await contexto.ejecutar(usuarioA, () => servicioReportes.obtenerDashboard());

    expect(dashboardA.resumen.contratos_activos).toBe(2);
    expect(dashboardA.resumen.contratos_cerrados).toBe(1);
    // 25 + 15 = 40 animales activos
    expect(dashboardA.resumen.total_animales_actual).toBe(40);
    // Utilidades de la venta de A1
    expect(dashboardA.resumen.utilidad_total_acumulada).toBe(9400000);
    expect(dashboardA.resumen.utilidad_real_comerciante_acumulada).toBe(5640000);
    expect(dashboardA.resumen.utilidad_terceros_acumulada).toBe(3760000);
    // Costos de A: 750,000 + 250,000 = 1,000,000
    expect(dashboardA.resumen.total_costos_informativos).toBe(1000000);
    expect(dashboardA.resumen.total_ventas_registradas).toBe(1);
  });

  it('aislamiento estricto: comerciante B ve únicamente sus propias métricas agregadas', async () => {
    const dashboardB = await contexto.ejecutar(usuarioB, () => servicioReportes.obtenerDashboard());

    expect(dashboardB.resumen.contratos_activos).toBe(1);
    expect(dashboardB.resumen.contratos_cerrados).toBe(0);
    expect(dashboardB.resumen.total_animales_actual).toBe(50);
    expect(dashboardB.resumen.utilidad_total_acumulada).toBe(3840000);
    expect(dashboardB.resumen.utilidad_real_comerciante_acumulada).toBe(2112000);
    expect(dashboardB.resumen.utilidad_terceros_acumulada).toBe(1728000);
    expect(dashboardB.resumen.total_costos_informativos).toBe(400000);
    expect(dashboardB.resumen.total_ventas_registradas).toBe(1);
  });

  it('reporte de contratos activos lista agregaciones por contrato sin inventar lógica (RF-26)', async () => {
    const reporte = await contexto.ejecutar(usuarioA, () =>
      servicioReportes.obtenerContratosActivos(),
    );

    expect(reporte.contratos.length).toBe(2);
    const contrato1 = reporte.contratos.find((c) => c.contrato_id === contratoActivoA1);
    expect(contrato1).toBeDefined();
    expect(contrato1?.tercero_nombre).toBe('Tercero Reportes A');
    expect(contrato1?.finca_nombre).toBe('Finca Reportes A');
    expect(contrato1?.cantidad_actual).toBe(25);
    expect(contrato1?.total_compras).toBe(1);
    expect(contrato1?.total_ventas).toBe(1);
    expect(contrato1?.utilidad_generada_comerciante).toBe(5640000);

    const contrato2 = reporte.contratos.find((c) => c.contrato_id === contratoActivoA2);
    expect(contrato2).toBeDefined();
    expect(contrato2?.cantidad_actual).toBe(15);
    expect(contrato2?.total_compras).toBe(1);
    expect(contrato2?.total_ventas).toBe(0);
    // Contrato sin ventas no aporta utilidad
    expect(contrato2?.utilidad_generada_comerciante).toBe(0);
  });

  it('reporte de historial de ventas coincide con snapshots persistidos (RF-26)', async () => {
    const historial = await contexto.ejecutar(usuarioA, () =>
      servicioReportes.obtenerHistorialVentas(),
    );

    expect(historial.resumen.total_ventas).toBe(1);
    expect(historial.resumen.total_animales_vendidos).toBe(10);
    expect(historial.resumen.valor_bruto_acumulado).toBe(34200000);
    expect(historial.resumen.costo_estimado_acumulado).toBe(24800000);
    expect(historial.resumen.utilidad_total_acumulada).toBe(9400000);
    expect(historial.resumen.utilidad_comerciante_acumulada).toBe(5640000);
    expect(historial.resumen.utilidad_terceros_acumulada).toBe(3760000);

    expect(historial.ventas.length).toBe(1);
    expect(historial.ventas[0].contrato_id).toBe(contratoActivoA1);
    expect(historial.ventas[0].cantidad_vendida).toBe(10);
    expect(historial.ventas[0].kilos_ganados_promedio).toBe(70);
  });
});

import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { CostosRepository } from '../../src/costos/costos.repository';
import { CostosService } from '../../src/costos/costos.service';
import { VentasRepository } from '../../src/ventas/ventas.repository';
import { VentasService } from '../../src/ventas/ventas.service';
import { UtilidadService } from '../../src/ventas/utilidad.service';
import { CrearCostoDto } from '../../src/costos/dto/crear-costo.dto';
import { ActualizarCostoDto } from '../../src/costos/dto/actualizar-costo.dto';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('CRUD de costos informativos — Integración (MVP-028)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCostos = new CostosRepository(accesoDb);
  const servicioCostos = new CostosService(repoCostos);
  const utilidadService = new UtilidadService();
  const repoVentas = new VentasRepository(accesoDb, utilidadService);
  const servicioVentas = new VentasService(repoVentas);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const terceroB = randomUUID();
  const fincaA = randomUUID();
  const fincaB = randomUUID();
  const contratoActivoA = randomUUID();
  const contratoCerradoA = randomUUID();
  const contratoActivoB = randomUUID();
  const costosCreados: string[] = [];
  const comprasCreadas: string[] = [];
  const ventasCreadas: string[] = [];

  beforeAll(async () => {
    // 1. Usuarios
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante Costos A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante Costos B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    // 2. Terceros
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Tercero Costos A', 'DOC-A', '3001'),
        (${terceroB}, ${usuarioB}, 'Tercero Costos B', 'DOC-B', '3002')
    `);

    // 3. Fincas
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca Costos A', 'Km 1', 8.1, -75.1),
        (${fincaB}, ${terceroB}, 'Finca Costos B', 'Km 2', 8.2, -75.2)
    `);

    // 4. Contratos
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contratoActivoA}, ${terceroA}, ${fincaA}, '2026-09-21T10:00:00.000Z', 60, 40, 'activo', 20, 300),
        (${contratoCerradoA}, ${terceroA}, ${fincaA}, '2026-09-20T10:00:00.000Z', 50, 50, 'cerrado', 0, 0),
        (${contratoActivoB}, ${terceroB}, ${fincaB}, '2026-09-21T11:00:00.000Z', 70, 30, 'activo', 15, 310)
    `);

    // 5. Compra inicial para contratoActivoA (para poder registrar venta y verificar invariante)
    const compraId = randomUUID();
    comprasCreadas.push(compraId);
    await admin.db.execute(sql`
      INSERT INTO compras (id, contrato_id, fecha, cantidad, peso_promedio, precio_kilo, valor_total, nota) VALUES
        (${compraId}, ${contratoActivoA}, '2026-09-21T11:00:00.000Z', 20, 300, 8000, 48000000, 'Compra base')
    `);
  });

  afterAll(async () => {
    try {
      for (const id of costosCreados) {
        await admin.db.execute(sql`DELETE FROM costos WHERE id = ${id}`);
      }
      for (const id of ventasCreadas) {
        await admin.db.execute(sql`DELETE FROM ventas WHERE id = ${id}`);
      }
      for (const id of comprasCreadas) {
        await admin.db.execute(sql`DELETE FROM compras WHERE id = ${id}`);
      }
      await admin.db.execute(
        sql`DELETE FROM contratos WHERE id IN (${contratoActivoA}, ${contratoCerradoA}, ${contratoActivoB})`,
      );
      await admin.db.execute(sql`DELETE FROM fincas WHERE id IN (${fincaA}, ${fincaB})`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id IN (${terceroA}, ${terceroB})`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('valida que CrearCostoDto rechaza descripción ausente y monto <= 0 (RF-24, MVP-008)', async () => {
    const dtoInvalido = new CrearCostoDto();
    dtoInvalido.contrato_id = contratoActivoA;
    dtoInvalido.tipo = 'flete';
    dtoInvalido.monto = -500;
    dtoInvalido.fecha = '2026-09-22T10:00:00.000Z';
    // Falta descripcion

    const errores = await validate(dtoInvalido);
    expect(errores.length).toBeGreaterThan(0);
    const camposConError = errores.map((e) => e.property);
    expect(camposConError).toContain('descripcion');
    expect(camposConError).toContain('monto');
  });

  it('registra un costo informativo tipo flete asociado al contrato (RF-24)', async () => {
    const dto: CrearCostoDto = {
      contrato_id: contratoActivoA,
      tipo: 'flete',
      monto: 350000,
      fecha: '2026-09-22T08:00:00.000Z',
      descripcion: 'Flete de novillos desde feria ganadera',
    };

    const costo = await contexto.ejecutar(usuarioA, () => servicioCostos.crear(dto));
    costosCreados.push(costo.id);

    expect(costo.id).toBeDefined();
    expect(costo.contrato_id).toBe(contratoActivoA);
    expect(costo.tipo).toBe('flete');
    expect(costo.monto).toBe(350000);
    expect(costo.descripcion).toBe('Flete de novillos desde feria ganadera');
    expect(costo.fecha).toBe('2026-09-22T08:00:00.000Z');
  });

  it('rechaza registrar costos en contrato cerrado (RF-25)', async () => {
    const dto: CrearCostoDto = {
      contrato_id: contratoCerradoA,
      tipo: 'medicina',
      monto: 120000,
      fecha: '2026-09-22T08:00:00.000Z',
      descripcion: 'Vacunación',
    };

    await expect(contexto.ejecutar(usuarioA, () => servicioCostos.crear(dto))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza registrar costo en contrato ajeno (aislamiento multi-tenant)', async () => {
    const dto: CrearCostoDto = {
      contrato_id: contratoActivoB,
      tipo: 'insumos',
      monto: 50000,
      fecha: '2026-09-22T08:00:00.000Z',
      descripcion: 'Sal mineralizada',
    };

    await expect(contexto.ejecutar(usuarioA, () => servicioCostos.crear(dto))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('permite actualizar y eliminar libremente un costo en contrato activo (RF-25)', async () => {
    const dtoCrear: CrearCostoDto = {
      contrato_id: contratoActivoA,
      tipo: 'veterinaria',
      monto: 200000,
      fecha: '2026-09-22T09:00:00.000Z',
      descripcion: 'Revisión sanitaria general',
    };

    const costo = await contexto.ejecutar(usuarioA, () => servicioCostos.crear(dtoCrear));
    costosCreados.push(costo.id);

    const dtoActualizar: ActualizarCostoDto = {
      monto: 250000,
      descripcion: 'Revisión sanitaria y vitaminas',
    };

    const actualizado = await contexto.ejecutar(usuarioA, () =>
      servicioCostos.actualizar(costo.id, dtoActualizar),
    );
    expect(actualizado.monto).toBe(250000);
    expect(actualizado.descripcion).toBe('Revisión sanitaria y vitaminas');

    // Eliminar
    await expect(
      contexto.ejecutar(usuarioA, () => servicioCostos.eliminar(costo.id)),
    ).resolves.toBeUndefined();

    await expect(
      contexto.ejecutar(usuarioA, () => servicioCostos.buscarPorId(costo.id)),
    ).rejects.toThrow(NotFoundException);
  });

  it('INVARIANTE CLAVE: los costos registrados no restan ni alteran la utilidad_real de ventas (RF-20, RF-24)', async () => {
    // 1. Registrar una venta de 5 animales
    const venta = await contexto.ejecutar(usuarioA, () =>
      servicioVentas.registrar({
        contrato_id: contratoActivoA,
        fecha: '2026-09-22T10:00:00.000Z',
        cantidad_vendida: 5,
        peso_promedio_venta: 380,
        precio_kilo_venta: 9000,
      }),
    );
    ventasCreadas.push(venta.id);
    const utilidadRealPrevia = venta.utilidad_real;
    expect(utilidadRealPrevia).toBeGreaterThan(0);

    // 2. Registrar múltiples costos posteriores
    const costo1 = await contexto.ejecutar(usuarioA, () =>
      servicioCostos.crear({
        contrato_id: contratoActivoA,
        tipo: 'flete',
        monto: 800000,
        fecha: '2026-09-22T11:00:00.000Z',
        descripcion: 'Flete de contingencia',
      }),
    );
    costosCreados.push(costo1.id);

    const costo2 = await contexto.ejecutar(usuarioA, () =>
      servicioCostos.crear({
        contrato_id: contratoActivoA,
        tipo: 'alimentacion',
        monto: 1200000,
        fecha: '2026-09-22T12:00:00.000Z',
        descripcion: 'Concentrado y melaza',
      }),
    );
    costosCreados.push(costo2.id);

    // 3. Re-consultar la venta: su snapshot y utilidad_real deben ser EXACTAMENTE IDÉNTICOS
    const ventaReconsultada = await contexto.ejecutar(usuarioA, () =>
      servicioVentas.buscarPorId(venta.id),
    );
    expect(ventaReconsultada.utilidad_real).toBe(utilidadRealPrevia);
    expect(ventaReconsultada.valor_comerciante).toBe(utilidadRealPrevia);
    expect(ventaReconsultada.utilidad_total).toBe(venta.utilidad_total);
    expect(ventaReconsultada.costo_estimado_compra).toBe(venta.costo_estimado_compra);
  });

  it('aislamiento RLS: comerciante B no puede acceder a costos de comerciante A', async () => {
    const dtoCrear: CrearCostoDto = {
      contrato_id: contratoActivoA,
      tipo: 'cuidado',
      monto: 100000,
      fecha: '2026-09-22T13:00:00.000Z',
      descripcion: 'Cuidado de potrero',
    };

    const costo = await contexto.ejecutar(usuarioA, () => servicioCostos.crear(dtoCrear));
    costosCreados.push(costo.id);

    // Usuario B no lo encuentra
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCostos.buscarPorId(costo.id)),
    ).rejects.toThrow(NotFoundException);

    // Usuario B no lo puede actualizar
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCostos.actualizar(costo.id, { monto: 999999 })),
    ).rejects.toThrow(NotFoundException);

    // Usuario B no lo puede eliminar
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCostos.eliminar(costo.id)),
    ).rejects.toThrow(NotFoundException);
  });

  it('lista los costos paginados y filtra por contrato', async () => {
    const resultado = await contexto.ejecutar(usuarioA, () =>
      servicioCostos.listar(contratoActivoA, { limite: 10, offset: 0 }),
    );

    expect(resultado.total).toBeGreaterThanOrEqual(1);
    expect(resultado.elementos.length).toBeGreaterThanOrEqual(1);
    expect(resultado.elementos.every((c) => c.contrato_id === contratoActivoA)).toBe(true);
  });
});

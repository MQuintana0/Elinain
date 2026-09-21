import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { CrearCompraDto } from '../../src/compras/dto/crear-compra.dto';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Registro de compras con valor total — Integración (MVP-015)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const terceroB = randomUUID();
  const fincaA = randomUUID();
  const fincaB = randomUUID();
  const contratoActivoA = randomUUID();
  const contratoCerradoA = randomUUID();
  const contratoActivoB = randomUUID();
  const comprasCreadas: string[] = [];

  beforeAll(async () => {
    // 1. Usuarios
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante Compras A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante Compras B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    // 2. Terceros
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Tercero Compra A', 'DOC-A', '3001'),
        (${terceroB}, ${usuarioB}, 'Tercero Compra B', 'DOC-B', '3002')
    `);

    // 3. Fincas
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca Compra A', 'Km 1', 8.1, -75.1),
        (${fincaB}, ${terceroB}, 'Finca Compra B', 'Km 2', 8.2, -75.2)
    `);

    // 4. Contratos (uno activo para A, uno cerrado para A, uno activo para B)
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado) VALUES
        (${contratoActivoA}, ${terceroA}, ${fincaA}, '2026-09-21T10:00:00.000Z', 60, 40, 'activo'),
        (${contratoCerradoA}, ${terceroA}, ${fincaA}, '2026-09-20T10:00:00.000Z', 50, 50, 'cerrado'),
        (${contratoActivoB}, ${terceroB}, ${fincaB}, '2026-09-21T11:00:00.000Z', 70, 30, 'activo')
    `);
  });

  afterAll(async () => {
    try {
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

  it('registra una compra exitosa calculando valor_total = cantidad × peso_promedio × precio_kilo', async () => {
    const dto: CrearCompraDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-21T12:00:00.000Z',
      cantidad: 20,
      peso_promedio: 300.5,
      precio_kilo: 8000,
      nota: 'Lote inicial de novillos cebú',
    };

    const compra = await contexto.ejecutar(usuarioA, () => servicioCompras.crear(dto));
    comprasCreadas.push(compra.id);

    expect(compra.id).toBeDefined();
    expect(compra.contrato_id).toBe(contratoActivoA);
    expect(compra.cantidad).toBe(20);
    expect(compra.peso_promedio).toBe(300.5);
    expect(compra.precio_kilo).toBe(8000);
    // 20 * 300.5 * 8000 = 48080000
    expect(compra.valor_total).toBe(48080000);
    expect(compra.nota).toBe('Lote inicial de novillos cebú');

    // Consultar por ID
    const encontrada = await contexto.ejecutar(usuarioA, () =>
      servicioCompras.buscarPorId(compra.id),
    );
    expect(encontrada.id).toBe(compra.id);
    expect(encontrada.valor_total).toBe(48080000);

    // Listar compras del tenant
    const lista = await contexto.ejecutar(usuarioA, () => servicioCompras.listar(contratoActivoA));
    expect(lista.elementos.some((c) => c.id === compra.id)).toBe(true);
    expect(lista.total).toBeGreaterThanOrEqual(1);
  });

  it('valida DTO de compra rechazando valores <= 0, campos faltantes y cantidad decimal', async () => {
    // 1. Cantidad 0
    const dtoCantidadCero = new CrearCompraDto();
    dtoCantidadCero.contrato_id = contratoActivoA;
    dtoCantidadCero.fecha = '2026-09-21T12:00:00.000Z';
    dtoCantidadCero.cantidad = 0;
    dtoCantidadCero.peso_promedio = 300;
    dtoCantidadCero.precio_kilo = 8000;
    dtoCantidadCero.nota = 'Nota';
    const errCantidadCero = await validate(dtoCantidadCero);
    expect(errCantidadCero.some((e) => e.property === 'cantidad')).toBe(true);

    // 2. Cantidad decimal (no entera)
    const dtoCantidadDecimal = new CrearCompraDto();
    dtoCantidadDecimal.contrato_id = contratoActivoA;
    dtoCantidadDecimal.fecha = '2026-09-21T12:00:00.000Z';
    dtoCantidadDecimal.cantidad = 15.5;
    dtoCantidadDecimal.peso_promedio = 300;
    dtoCantidadDecimal.precio_kilo = 8000;
    dtoCantidadDecimal.nota = 'Nota';
    const errCantidadDecimal = await validate(dtoCantidadDecimal);
    expect(errCantidadDecimal.some((e) => e.property === 'cantidad')).toBe(true);

    // 3. Peso negativo
    const dtoPesoNegativo = new CrearCompraDto();
    dtoPesoNegativo.contrato_id = contratoActivoA;
    dtoPesoNegativo.fecha = '2026-09-21T12:00:00.000Z';
    dtoPesoNegativo.cantidad = 10;
    dtoPesoNegativo.peso_promedio = -200;
    dtoPesoNegativo.precio_kilo = 8000;
    dtoPesoNegativo.nota = 'Nota';
    const errPeso = await validate(dtoPesoNegativo);
    expect(errPeso.some((e) => e.property === 'peso_promedio')).toBe(true);

    // 4. Precio cero
    const dtoPrecioCero = new CrearCompraDto();
    dtoPrecioCero.contrato_id = contratoActivoA;
    dtoPrecioCero.fecha = '2026-09-21T12:00:00.000Z';
    dtoPrecioCero.cantidad = 10;
    dtoPrecioCero.peso_promedio = 300;
    dtoPrecioCero.precio_kilo = 0;
    dtoPrecioCero.nota = 'Nota';
    const errPrecio = await validate(dtoPrecioCero);
    expect(errPrecio.some((e) => e.property === 'precio_kilo')).toBe(true);

    // 5. Nota vacía
    const dtoNotaVacia = new CrearCompraDto();
    dtoNotaVacia.contrato_id = contratoActivoA;
    dtoNotaVacia.fecha = '2026-09-21T12:00:00.000Z';
    dtoNotaVacia.cantidad = 10;
    dtoNotaVacia.peso_promedio = 300;
    dtoNotaVacia.precio_kilo = 8000;
    dtoNotaVacia.nota = '';
    const errNota = await validate(dtoNotaVacia);
    expect(errNota.some((e) => e.property === 'nota')).toBe(true);
  });

  it('aísla las compras por tenant: Comerciante B no puede registrar ni consultar compras de Comerciante A', async () => {
    // 1. Comerciante B intenta registrar una compra en el contrato de Comerciante A -> 404
    await expect(
      contexto.ejecutar(usuarioB, () =>
        servicioCompras.crear({
          contrato_id: contratoActivoA,
          fecha: '2026-09-21T12:00:00.000Z',
          cantidad: 10,
          peso_promedio: 300,
          precio_kilo: 8000,
          nota: 'Intento cruzado de B en A',
        }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    // 2. Comerciante A registra una compra
    const compraA = await contexto.ejecutar(usuarioA, () =>
      servicioCompras.crear({
        contrato_id: contratoActivoA,
        fecha: '2026-09-21T13:00:00.000Z',
        cantidad: 15,
        peso_promedio: 310,
        precio_kilo: 8200,
        nota: 'Segunda compra de A',
      }),
    );
    comprasCreadas.push(compraA.id);

    // 3. Comerciante B intenta consultar directamente la compra de A por ID -> 404
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCompras.buscarPorId(compraA.id)),
    ).rejects.toBeInstanceOf(NotFoundException);

    // 4. Comerciante B lista compras -> la compra de A NO aparece
    const listaB = await contexto.ejecutar(usuarioB, () => servicioCompras.listar());
    expect(listaB.elementos.some((c) => c.id === compraA.id)).toBe(false);
  });

  it('rechaza con BadRequestException el registro de compras en un contrato cerrado', async () => {
    await expect(
      contexto.ejecutar(usuarioA, () =>
        servicioCompras.crear({
          contrato_id: contratoCerradoA,
          fecha: '2026-09-21T14:00:00.000Z',
          cantidad: 10,
          peso_promedio: 300,
          precio_kilo: 8000,
          nota: 'Intento de compra en contrato cerrado',
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

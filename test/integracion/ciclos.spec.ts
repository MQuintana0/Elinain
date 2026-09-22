import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { CiclosRepository } from '../../src/ciclos/ciclos.repository';
import { CiclosService } from '../../src/ciclos/ciclos.service';
import { CrearCicloDto } from '../../src/ciclos/dto/crear-ciclo.dto';
import { ActualizarCicloDto } from '../../src/ciclos/dto/actualizar-ciclo.dto';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('CRUD de ciclos — Integración (MVP-027)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCiclos = new CiclosRepository(accesoDb);
  const servicioCiclos = new CiclosService(repoCiclos);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const terceroB = randomUUID();
  const fincaA = randomUUID();
  const fincaB = randomUUID();
  const contratoActivoA = randomUUID();
  const contratoCerradoA = randomUUID();
  const contratoActivoB = randomUUID();
  const ciclosCreados: string[] = [];

  beforeAll(async () => {
    // 1. Usuarios
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante Ciclos A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante Ciclos B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    // 2. Terceros
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Tercero Ciclos A', 'DOC-A', '3001'),
        (${terceroB}, ${usuarioB}, 'Tercero Ciclos B', 'DOC-B', '3002')
    `);

    // 3. Fincas
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca Ciclos A', 'Km 1', 8.1, -75.1),
        (${fincaB}, ${terceroB}, 'Finca Ciclos B', 'Km 2', 8.2, -75.2)
    `);

    // 4. Contratos
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado) VALUES
        (${contratoActivoA}, ${terceroA}, ${fincaA}, '2026-09-21T10:00:00.000Z', 60, 40, 'activo'),
        (${contratoCerradoA}, ${terceroA}, ${fincaA}, '2026-09-20T10:00:00.000Z', 50, 50, 'cerrado'),
        (${contratoActivoB}, ${terceroB}, ${fincaB}, '2026-09-21T11:00:00.000Z', 70, 30, 'activo')
    `);
  });

  afterAll(async () => {
    try {
      for (const id of ciclosCreados) {
        await admin.db.execute(sql`DELETE FROM ciclos WHERE id = ${id}`);
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

  it('valida que CrearCicloDto rechaza fecha ausente y peso <= 0 (RF-23, MVP-008)', async () => {
    const dtoInvalido = new CrearCicloDto();
    dtoInvalido.contrato_id = contratoActivoA;
    // Sin fecha
    dtoInvalido.peso_observado = -10;

    const errores = await validate(dtoInvalido);
    expect(errores.length).toBeGreaterThan(0);
    const camposConError = errores.map((e) => e.property);
    expect(camposConError).toContain('fecha');
    expect(camposConError).toContain('peso_observado');
  });

  it('registra un ciclo solo con fecha y campos opcionales nulos (RF-23)', async () => {
    const dto: CrearCicloDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-22T08:00:00.000Z',
    };

    const ciclo = await contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dto));
    ciclosCreados.push(ciclo.id);

    expect(ciclo.id).toBeDefined();
    expect(ciclo.contrato_id).toBe(contratoActivoA);
    expect(ciclo.fecha).toBe('2026-09-22T08:00:00.000Z');
    expect(ciclo.peso_observado).toBeNull();
    expect(ciclo.notas).toBeNull();
  });

  it('registra un ciclo completo con peso observado y notas (RF-23)', async () => {
    const dto: CrearCicloDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-22T09:00:00.000Z',
      peso_observado: 385.5,
      notas: 'Animales con buen desarrollo y forraje abundante',
    };

    const ciclo = await contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dto));
    ciclosCreados.push(ciclo.id);

    expect(ciclo.id).toBeDefined();
    expect(ciclo.peso_observado).toBe(385.5);
    expect(ciclo.notas).toBe('Animales con buen desarrollo y forraje abundante');
  });

  it('rechaza registrar un ciclo en un contrato cerrado (RF-25)', async () => {
    const dto: CrearCicloDto = {
      contrato_id: contratoCerradoA,
      fecha: '2026-09-22T10:00:00.000Z',
    };

    await expect(contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dto))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza registrar ciclo en contrato ajeno a otro tenant (aislamiento multi-tenant)', async () => {
    const dto: CrearCicloDto = {
      contrato_id: contratoActivoB,
      fecha: '2026-09-22T10:00:00.000Z',
    };

    await expect(contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dto))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('permite actualizar libremente un ciclo en un contrato activo (RF-25)', async () => {
    const dtoCrear: CrearCicloDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-22T11:00:00.000Z',
      peso_observado: 390,
      notas: 'Nota inicial',
    };

    const ciclo = await contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dtoCrear));
    ciclosCreados.push(ciclo.id);

    const dtoActualizar: ActualizarCicloDto = {
      peso_observado: 395.2,
      notas: 'Nota corregida tras segundo pesaje',
    };

    const actualizado = await contexto.ejecutar(usuarioA, () =>
      servicioCiclos.actualizar(ciclo.id, dtoActualizar),
    );

    expect(actualizado.peso_observado).toBe(395.2);
    expect(actualizado.notas).toBe('Nota corregida tras segundo pesaje');
    expect(actualizado.fecha).toBe('2026-09-22T11:00:00.000Z');
  });

  it('permite eliminar libremente un ciclo en un contrato activo (RF-25)', async () => {
    const dtoCrear: CrearCicloDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-22T12:00:00.000Z',
    };

    const ciclo = await contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dtoCrear));

    await expect(
      contexto.ejecutar(usuarioA, () => servicioCiclos.eliminar(ciclo.id)),
    ).resolves.toBeUndefined();

    // Ya no debe existir
    await expect(
      contexto.ejecutar(usuarioA, () => servicioCiclos.buscarPorId(ciclo.id)),
    ).rejects.toThrow(NotFoundException);
  });

  it('aislamiento RLS: comerciante B no puede leer, actualizar ni borrar ciclos de A', async () => {
    const dtoCrear: CrearCicloDto = {
      contrato_id: contratoActivoA,
      fecha: '2026-09-22T13:00:00.000Z',
      peso_observado: 410,
    };

    const ciclo = await contexto.ejecutar(usuarioA, () => servicioCiclos.crear(dtoCrear));
    ciclosCreados.push(ciclo.id);

    // Usuario B no lo encuentra
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCiclos.buscarPorId(ciclo.id)),
    ).rejects.toThrow(NotFoundException);

    // Usuario B no lo puede actualizar
    await expect(
      contexto.ejecutar(usuarioB, () =>
        servicioCiclos.actualizar(ciclo.id, { peso_observado: 420 }),
      ),
    ).rejects.toThrow(NotFoundException);

    // Usuario B no lo puede eliminar
    await expect(
      contexto.ejecutar(usuarioB, () => servicioCiclos.eliminar(ciclo.id)),
    ).rejects.toThrow(NotFoundException);
  });

  it('lista los ciclos paginados y filtra por contrato', async () => {
    const resultado = await contexto.ejecutar(usuarioA, () =>
      servicioCiclos.listar(contratoActivoA, { limite: 10, offset: 0 }),
    );

    expect(resultado.total).toBeGreaterThanOrEqual(1);
    expect(resultado.elementos.length).toBeGreaterThanOrEqual(1);
    expect(resultado.elementos.every((c) => c.contrato_id === contratoActivoA)).toBe(true);
  });
});

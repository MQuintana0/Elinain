import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ContratosRepository } from '../../src/contratos/contratos.repository';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Esquema y persistencia de contratos en Drizzle (MVP-012)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoContratos = new ContratosRepository(accesoDb);

  const usuarioA = randomUUID();
  const usuarioB = randomUUID();
  const terceroA = randomUUID();
  const fincaA = randomUUID();
  const contratosCreados: string[] = [];

  beforeAll(async () => {
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuarioA}, 'Comerciante Contratos A', ${`${usuarioA}@test.com`}, 'hash'),
        (${usuarioB}, 'Comerciante Contratos B', ${`${usuarioB}@test.com`}, 'hash')
    `);

    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${terceroA}, ${usuarioA}, 'Socio Contrato A', 'CC-1234', '300123')
    `);

    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${fincaA}, ${terceroA}, 'Finca Contrato A', 'Vereda Central', 8.5, -75.8)
    `);
  });

  afterAll(async () => {
    try {
      for (const id of contratosCreados) {
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${id}`);
      }
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${fincaA}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${terceroA}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  function obtenerDetalleError(error: unknown): string {
    if (error instanceof Error) {
      const causa =
        error.cause && typeof error.cause === 'object' && 'message' in error.cause
          ? String(error.cause.message)
          : '';
      return `${error.message} ${causa}`;
    }
    return '';
  }

  it('rechaza por restricción FK un contrato sin tercero existente', async () => {
    const terceroInexistente = randomUUID();
    let errorLanzado: unknown = null;
    try {
      await admin.db.execute(sql`
        INSERT INTO contratos (tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero)
        VALUES (${terceroInexistente}, ${fincaA}, NOW(), 60, 40)
      `);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado).toBeDefined();
    expect(obtenerDetalleError(errorLanzado)).toMatch(/foreign key|violates/i);
  });

  it('rechaza por restricción FK un contrato sin finca existente', async () => {
    const fincaInexistente = randomUUID();
    let errorLanzado: unknown = null;
    try {
      await admin.db.execute(sql`
        INSERT INTO contratos (tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero)
        VALUES (${terceroA}, ${fincaInexistente}, NOW(), 60, 40)
      `);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado).toBeDefined();
    expect(obtenerDetalleError(errorLanzado)).toMatch(/foreign key|violates/i);
  });

  it('rechaza estados no permitidos mediante restricción check en base de datos', async () => {
    let errorLanzado: unknown = null;
    try {
      await admin.db.execute(sql`
        INSERT INTO contratos (tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado)
        VALUES (${terceroA}, ${fincaA}, NOW(), 60, 40, 'cancelado')
      `);
    } catch (error) {
      errorLanzado = error;
    }
    expect(errorLanzado).toBeDefined();
    expect(obtenerDetalleError(errorLanzado)).toMatch(/check constraint|violates/i);
  });

  it('persiste correctamente el contrato con valores válidos y campos opcionales nulos', async () => {
    const contrato = await contexto.ejecutar(usuarioA, () =>
      repoContratos.crear({
        tercero_id: terceroA,
        finca_id: fincaA,
        fecha_apertura: new Date().toISOString(),
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
        raza: null,
        peso_promedio_actual: null,
        cantidad_actual: null,
        valor_kilo_referencia: null,
      }),
    );

    expect(contrato).toBeDefined();
    expect(contrato.id).toBeDefined();
    contratosCreados.push(contrato.id);

    expect(contrato.tercero_id).toBe(terceroA);
    expect(contrato.finca_id).toBe(fincaA);
    expect(contrato.porcentaje_comerciante).toBe(60);
    expect(contrato.porcentaje_tercero).toBe(40);
    expect(contrato.estado).toBe('activo');
    expect(contrato.fecha_cierre).toBeNull();
    expect(contrato.raza).toBeNull();
    expect(contrato.peso_promedio_actual).toBeNull();
    expect(contrato.cantidad_actual).toBeNull();
    expect(contrato.valor_kilo_referencia).toBeNull();
  });

  it('aísla los contratos entre tenants mediante RLS y repositorio', async () => {
    // Usuario A crea un contrato
    const contratoA = await contexto.ejecutar(usuarioA, () =>
      repoContratos.crear({
        tercero_id: terceroA,
        finca_id: fincaA,
        fecha_apertura: new Date().toISOString(),
        porcentaje_comerciante: 55,
        porcentaje_tercero: 45,
        raza: 'Brahman',
        peso_promedio_actual: 320.5,
        cantidad_actual: 40,
        valor_kilo_referencia: 8200,
      }),
    );
    contratosCreados.push(contratoA.id);

    // Usuario A puede consultar su contrato por ID y en el listado
    const encontradoA = await contexto.ejecutar(usuarioA, () =>
      repoContratos.buscarPorId(contratoA.id),
    );
    expect(encontradoA).not.toBeNull();
    expect(encontradoA?.id).toBe(contratoA.id);
    expect(encontradoA?.raza).toBe('Brahman');

    const listaA = await contexto.ejecutar(usuarioA, () => repoContratos.listar());
    expect(listaA.map((c) => c.id)).toContain(contratoA.id);

    // Usuario B NO puede ver el contrato de Usuario A
    const encontradoB = await contexto.ejecutar(usuarioB, () =>
      repoContratos.buscarPorId(contratoA.id),
    );
    expect(encontradoB).toBeNull();

    const listaB = await contexto.ejecutar(usuarioB, () => repoContratos.listar());
    expect(listaB.map((c) => c.id)).not.toContain(contratoA.id);
  });
});

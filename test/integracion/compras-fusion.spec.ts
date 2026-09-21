import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { ContratosRepository } from '../../src/contratos/contratos.repository';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Fusión de compras y recálculo de promedio simple en contrato (MVP-016 / RF-11)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const repoContratos = new ContratosRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  const contratoNulo = randomUUID();
  const contratoConPesoPrevio = randomUUID();
  const comprasCreadas: string[] = [];

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Fusion', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Fusion', 'DOC-FUSION', '300999')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Fusion', 'Km 8', 8.4, -75.4)
    `);

    // 4. Contratos:
    // contratoNulo: nace con peso_promedio_actual y cantidad_actual en null
    // contratoConPesoPrevio: nace con cantidad 10 y peso 280
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contratoNulo}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 60, 40, 'activo', NULL, NULL),
        (${contratoConPesoPrevio}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 50, 50, 'activo', 10, 280)
    `);
  });

  afterAll(async () => {
    try {
      for (const id of comprasCreadas) {
        await admin.db.execute(sql`DELETE FROM compras WHERE id = ${id}`);
      }
      await admin.db.execute(
        sql`DELETE FROM contratos WHERE id IN (${contratoNulo}, ${contratoConPesoPrevio})`,
      );
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${finca}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${tercero}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id = ${usuario}`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('fija el promedio base en el contrato cuando la primera compra entra sobre contrato nulo', async () => {
    const compra1 = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contratoNulo,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 20,
        peso_promedio: 300,
        precio_kilo: 8000,
        nota: 'Primera compra lote nulo',
      }),
    );
    comprasCreadas.push(compra1.id);

    const contratoActualizado = await contexto.ejecutar(usuario, () =>
      repoContratos.buscarPorId(contratoNulo),
    );

    expect(contratoActualizado).not.toBeNull();
    expect(contratoActualizado?.cantidad_actual).toBe(20);
    expect(contratoActualizado?.peso_promedio_actual).toBe(300);
  });

  it('recalcula el promedio simple no ponderado por cantidad en la segunda compra (RF-11)', async () => {
    // Compra 1 previa: 20 animales de 300 kg
    // Compra 2 nueva:  50 animales de 360 kg
    // Si fuera ponderado: (20*300 + 50*360) / 70 = (6000 + 18000) / 70 = 342.85 kg
    // Siendo promedio simple (RF-11): (300 + 360) / 2 = 330 kg
    const compra2 = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contratoNulo,
        fecha: '2026-09-21T10:00:00.000Z',
        cantidad: 50,
        peso_promedio: 360,
        precio_kilo: 8200,
        nota: 'Segunda compra mayoritaria en cantidad',
      }),
    );
    comprasCreadas.push(compra2.id);

    const contratoActualizado = await contexto.ejecutar(usuario, () =>
      repoContratos.buscarPorId(contratoNulo),
    );

    expect(contratoActualizado?.cantidad_actual).toBe(70); // 20 + 50
    expect(contratoActualizado?.peso_promedio_actual).toBe(330); // (300 + 360) / 2
  });

  it('recalcula el promedio simple de todas las compras con una tercera fusión', async () => {
    // Compras: 300, 360, 390
    // Promedio simple: (300 + 360 + 390) / 3 = 350 kg
    const compra3 = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contratoNulo,
        fecha: '2026-09-21T11:00:00.000Z',
        cantidad: 10,
        peso_promedio: 390,
        precio_kilo: 8500,
        nota: 'Tercera compra novillos',
      }),
    );
    comprasCreadas.push(compra3.id);

    const contratoActualizado = await contexto.ejecutar(usuario, () =>
      repoContratos.buscarPorId(contratoNulo),
    );

    expect(contratoActualizado?.cantidad_actual).toBe(80); // 70 + 10
    expect(contratoActualizado?.peso_promedio_actual).toBe(350); // (300 + 360 + 390) / 3
  });

  it('promedia con el peso previo de apertura en un contrato que nació con datos previos', async () => {
    // Contrato con cantidad inicial 10 y peso previo 280
    // Nueva compra: 15 animales de 320 kg
    // Nueva cantidad: 10 + 15 = 25
    // Nuevo peso promedio: (280 + 320) / 2 = 300 kg
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contratoConPesoPrevio,
        fecha: '2026-09-21T12:00:00.000Z',
        cantidad: 15,
        peso_promedio: 320,
        precio_kilo: 8100,
        nota: 'Compra sobre contrato con inventario de apertura',
      }),
    );
    comprasCreadas.push(compra.id);

    const contratoActualizado = await contexto.ejecutar(usuario, () =>
      repoContratos.buscarPorId(contratoConPesoPrevio),
    );

    expect(contratoActualizado?.cantidad_actual).toBe(25);
    expect(contratoActualizado?.peso_promedio_actual).toBe(300);
  });
});

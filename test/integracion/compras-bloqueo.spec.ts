import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { ConflictException } from '@nestjs/common';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ComprasRepository } from '../../src/compras/compras.repository';
import { ComprasService } from '../../src/compras/compras.service';
import { ContratosRepository } from '../../src/contratos/contratos.repository';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Bloqueo de compras cuando hay ventas (MVP-017 / RF-12)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoCompras = new ComprasRepository(accesoDb);
  const repoContratos = new ContratosRepository(accesoDb);
  const servicioCompras = new ComprasService(repoCompras);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  const contrato = randomUUID();
  let compraId: string;
  const ventaId = randomUUID();

  beforeAll(async () => {
    // 1. Usuario
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Bloqueo', ${`${usuario}@test.com`}, 'hash')
    `);

    // 2. Tercero
    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Socio Bloqueo', 'DOC-BLOQUEO', '300888')
    `);

    // 3. Finca
    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Bloqueo', 'Km 12', 8.5, -75.5)
    `);

    // 4. Contrato
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id, fecha_apertura, porcentaje_comerciante, porcentaje_tercero, estado, cantidad_actual, peso_promedio_actual) VALUES
        (${contrato}, ${tercero}, ${finca}, '2026-09-21T08:00:00.000Z', 60, 40, 'activo', NULL, NULL)
    `);

    // 5. Compra inicial
    const compra = await contexto.ejecutar(usuario, () =>
      servicioCompras.crear({
        contrato_id: contrato,
        fecha: '2026-09-21T09:00:00.000Z',
        cantidad: 30,
        peso_promedio: 320,
        precio_kilo: 8200,
        nota: 'Compra previa a ventas',
      }),
    );
    compraId = compra.id;

    // 6. Crear tabla ventas temporal y registrar una venta vinculada al contrato
    await admin.db.execute(sql`
      CREATE TABLE IF NOT EXISTS ventas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        contrato_id uuid NOT NULL REFERENCES contratos(id)
      );
      GRANT SELECT ON ventas TO elinain_runtime;
    `);

    await admin.db.execute(sql`
      INSERT INTO ventas (id, contrato_id) VALUES (${ventaId}, ${contrato})
    `);
  });

  afterAll(async () => {
    try {
      await admin.db.execute(sql`DROP TABLE IF EXISTS ventas CASCADE`);
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

  it('bloquea la edición (PATCH) con 409 Conflict si el contrato tiene ventas vinculadas', async () => {
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioCompras.actualizar(compraId, {
          cantidad: 35,
          peso_promedio: 330,
        }),
      ),
    ).rejects.toThrow(ConflictException);

    // Verificar que los datos de la compra permanecieron intactos
    const compra = await contexto.ejecutar(usuario, () => servicioCompras.buscarPorId(compraId));
    expect(compra.cantidad).toBe(30);
    expect(compra.peso_promedio).toBe(320);

    // Verificar que los datos del contrato permanecieron intactos
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(30);
    expect(contratoDb?.peso_promedio_actual).toBe(320);
  });

  it('bloquea la eliminación (DELETE) con 409 Conflict si el contrato tiene ventas vinculadas', async () => {
    await expect(
      contexto.ejecutar(usuario, () => servicioCompras.eliminar(compraId)),
    ).rejects.toThrow(ConflictException);

    // Verificar que la compra sigue existiendo y no fue borrada
    const compra = await contexto.ejecutar(usuario, () => servicioCompras.buscarPorId(compraId));
    expect(compra.id).toBe(compraId);

    // Verificar que el contrato sigue con su saldo intacto
    const contratoDb = await contexto.ejecutar(usuario, () => repoContratos.buscarPorId(contrato));
    expect(contratoDb?.cantidad_actual).toBe(30);
    expect(contratoDb?.peso_promedio_actual).toBe(320);
  });
});

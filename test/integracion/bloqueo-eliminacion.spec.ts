import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { TercerosRepository } from '../../src/terceros/terceros.repository';
import { TercerosService } from '../../src/terceros/terceros.service';
import { FincasRepository } from '../../src/fincas/fincas.repository';
import { FincasService } from '../../src/fincas/fincas.service';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Bloqueo de eliminación por contratos vinculados (MVP-011)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoTerceros = new TercerosRepository(accesoDb);
  const servicioTerceros = new TercerosService(repoTerceros);
  const repoFincas = new FincasRepository(accesoDb);
  const servicioFincas = new FincasService(repoFincas);

  const usuario = randomUUID();
  let terceroId: string;
  let fincaId: string;
  let tablaContratosCreadaTemporalmente = false;

  beforeAll(async () => {
    await admin.db.execute(
      sql`INSERT INTO usuarios (id, nombre, email, password_hash) VALUES 
        (${usuario}, 'Comerciante Bloqueo', ${`${usuario}@test.com`}, 'hash')`,
    );

    const t = await contexto.ejecutar(usuario, () =>
      servicioTerceros.crear({
        nombre: 'Tercero Con Contrato',
        documento: 'Doc-Contrato',
        contacto: '3000',
      }),
    );
    terceroId = t.id;

    const f = await contexto.ejecutar(usuario, () =>
      servicioFincas.crear({
        tercero_id: terceroId,
        nombre: 'Finca Con Contrato',
        direccion: 'Km 1',
        latitud: 1.0,
        longitud: 1.0,
      }),
    );
    fincaId = f.id;
  });

  afterAll(async () => {
    try {
      if (tablaContratosCreadaTemporalmente) {
        await admin.db.execute(sql`DROP TABLE IF EXISTS contratos CASCADE`);
      }
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${fincaId}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${terceroId}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id = ${usuario}`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('permite eliminar tercero y finca cuando NO tienen contratos asociados', async () => {
    const tLibre = await contexto.ejecutar(usuario, () =>
      servicioTerceros.crear({
        nombre: 'Tercero Libre',
        documento: 'Libre-1',
        contacto: '123',
      }),
    );

    const fLibre = await contexto.ejecutar(usuario, () =>
      servicioFincas.crear({
        tercero_id: tLibre.id,
        nombre: 'Finca Libre',
        direccion: 'Libre 1',
        latitud: 2.0,
        longitud: 2.0,
      }),
    );

    // Eliminar finca libre
    await expect(
      contexto.ejecutar(usuario, () => servicioFincas.eliminar(fLibre.id)),
    ).resolves.toBeUndefined();

    // Eliminar tercero libre
    await expect(
      contexto.ejecutar(usuario, () => servicioTerceros.eliminar(tLibre.id)),
    ).resolves.toBeUndefined();
  });

  it('bloquea con ConflictException (409) la eliminación de tercero o finca con contratos vinculados', async () => {
    // Simular existencia de tabla contratos para validar la guarda referencial previa
    await admin.db.execute(sql`
      CREATE TABLE IF NOT EXISTS contratos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tercero_id uuid REFERENCES terceros(id),
        finca_id uuid REFERENCES fincas(id)
      );
      GRANT SELECT, INSERT, UPDATE, DELETE ON contratos TO elinain_runtime;
    `);
    tablaContratosCreadaTemporalmente = true;

    // Insertar contrato vinculado
    const contratoId = randomUUID();
    await admin.db.execute(sql`
      INSERT INTO contratos (id, tercero_id, finca_id) VALUES (${contratoId}, ${terceroId}, ${fincaId})
    `);

    // Intentar eliminar finca con contrato
    await expect(
      contexto.ejecutar(usuario, () => servicioFincas.eliminar(fincaId)),
    ).rejects.toBeInstanceOf(ConflictException);

    // Intentar eliminar tercero con contrato
    await expect(
      contexto.ejecutar(usuario, () => servicioTerceros.eliminar(terceroId)),
    ).rejects.toBeInstanceOf(ConflictException);

    // Limpiar contrato de prueba
    await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contratoId}`);
  });
});

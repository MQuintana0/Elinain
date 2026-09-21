import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { AccesoDb } from '../../src/db/acceso-db';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';
import { ContratosRepository } from '../../src/contratos/contratos.repository';
import { ContratosService } from '../../src/contratos/contratos.service';
import { ActualizarContratoDto } from '../../src/contratos/dto/actualizar-contrato.dto';

const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

describe('Inmutabilidad de porcentajes y apertura en contratos (MVP-014)', () => {
  const admin = crearConexionDb(urlAdmin);
  const accesoDb = new AccesoDb();
  const contexto = new ContextoTenant();
  const repoContratos = new ContratosRepository(accesoDb);
  const servicioContratos = new ContratosService(repoContratos);

  const usuario = randomUUID();
  const tercero = randomUUID();
  const finca = randomUUID();
  let contratoId: string;

  beforeAll(async () => {
    await admin.db.execute(sql`
      INSERT INTO usuarios (id, nombre, email, password_hash) VALUES
        (${usuario}, 'Comerciante Inmutabilidad', ${`${usuario}@test.com`}, 'hash')
    `);

    await admin.db.execute(sql`
      INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES
        (${tercero}, ${usuario}, 'Tercero Inmutabilidad', 'DOC-INMUTABLE', '300999')
    `);

    await admin.db.execute(sql`
      INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES
        (${finca}, ${tercero}, 'Finca Inmutabilidad', 'Vereda El Retiro', 8.4, -75.4)
    `);

    const contrato = await contexto.ejecutar(usuario, () =>
      servicioContratos.crear({
        tercero_id: tercero,
        finca_id: finca,
        fecha_apertura: '2026-09-21T08:00:00.000Z',
        porcentaje_comerciante: 60,
        porcentaje_tercero: 40,
        raza: 'Brahman',
        peso_promedio_actual: 350,
        cantidad_actual: 40,
        valor_kilo_referencia: 8000,
      }),
    );
    contratoId = contrato.id;
  });

  afterAll(async () => {
    try {
      if (contratoId) {
        await admin.db.execute(sql`DELETE FROM contratos WHERE id = ${contratoId}`);
      }
      await admin.db.execute(sql`DELETE FROM fincas WHERE id = ${finca}`);
      await admin.db.execute(sql`DELETE FROM terceros WHERE id = ${tercero}`);
      await admin.db.execute(sql`DELETE FROM usuarios WHERE id = ${usuario}`);
    } finally {
      await accesoDb.onApplicationShutdown();
      await admin.cerrar();
    }
  });

  it('rechaza con BadRequestException cualquier intento de modificar porcentaje_comerciante', async () => {
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioContratos.actualizar(contratoId, {
          porcentaje_comerciante: 70,
        } as unknown as ActualizarContratoDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Verificar que el valor en base de datos sigue intacto
    const contrato = await contexto.ejecutar(usuario, () =>
      servicioContratos.buscarPorId(contratoId),
    );
    expect(contrato.porcentaje_comerciante).toBe(60);
  });

  it('rechaza con BadRequestException cualquier intento de modificar porcentaje_tercero', async () => {
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioContratos.actualizar(contratoId, {
          porcentaje_tercero: 30,
        } as unknown as ActualizarContratoDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    // Verificar que el valor en base de datos sigue intacto
    const contrato = await contexto.ejecutar(usuario, () =>
      servicioContratos.buscarPorId(contratoId),
    );
    expect(contrato.porcentaje_tercero).toBe(40);
  });

  it('rechaza intentos de alterar los identificadores estructurales o fecha de apertura', async () => {
    const otroTercero = randomUUID();
    await expect(
      contexto.ejecutar(usuario, () =>
        servicioContratos.actualizar(contratoId, {
          tercero_id: otroTercero,
        } as unknown as ActualizarContratoDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      contexto.ejecutar(usuario, () =>
        servicioContratos.actualizar(contratoId, {
          fecha_apertura: '2026-01-01T00:00:00.000Z',
        } as unknown as ActualizarContratoDto),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite actualizar campos mutables preservando intactos los porcentajes originales', async () => {
    const actualizado = await contexto.ejecutar(usuario, () =>
      servicioContratos.actualizar(contratoId, {
        raza: 'Brahman Rojo',
        peso_promedio_actual: 395.5,
        cantidad_actual: 38,
        valor_kilo_referencia: 8600,
        estado: 'activo',
      }),
    );

    expect(actualizado.raza).toBe('Brahman Rojo');
    expect(actualizado.peso_promedio_actual).toBe(395.5);
    expect(actualizado.cantidad_actual).toBe(38);
    expect(actualizado.valor_kilo_referencia).toBe(8600);

    // Inmutabilidad verificada: los porcentajes no cambiaron
    expect(actualizado.porcentaje_comerciante).toBe(60);
    expect(actualizado.porcentaje_tercero).toBe(40);

    // Relectura de confirmación
    const releido = await contexto.ejecutar(usuario, () =>
      servicioContratos.buscarPorId(contratoId),
    );
    expect(releido.porcentaje_comerciante).toBe(60);
    expect(releido.porcentaje_tercero).toBe(40);
  });
});

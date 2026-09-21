import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { crearConexionDb } from '../../src/db/conexion';
import { ContextoTenant } from '../../src/common/seguridad/contexto-tenant';

const urlRuntime =
  process.env.DATABASE_URL ?? 'postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain';
const urlAdmin =
  process.env.DATABASE_ADMIN_URL ?? 'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';
const usuarioRuntime = process.env.DATABASE_RUNTIME_USER ?? 'elinain_runtime';

describe('RLS tenant estructural y conductual (MVP-007)', () => {
  it('usa el rol runtime real y aísla lecturas/escrituras de usuarios, terceros y fincas', async () => {
    const admin = crearConexionDb(urlAdmin);
    const runtime = crearConexionDb(urlRuntime);
    const contexto = new ContextoTenant();
    const usuarioA = randomUUID();
    const usuarioB = randomUUID();
    const terceroA = randomUUID();
    const terceroB = randomUUID();
    const fincaA = randomUUID();
    const fincaB = randomUUID();
    const terceroCreado = randomUUID();
    const fincaCreada = randomUUID();
    let datosInsertados = false;

    try {
      const tablas = await admin.db.execute(sql`
        SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname IN ('usuarios', 'terceros', 'fincas')
        ORDER BY c.relname
      `);
      expect(tablas.rows).toHaveLength(3);
      for (const tabla of tablas.rows as Array<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>) {
        expect(tabla.relrowsecurity).toBe(true);
        expect(tabla.relforcerowsecurity).toBe(true);
      }

      await admin.db.execute(
        sql`INSERT INTO usuarios (id, nombre, email, password_hash) VALUES (${usuarioA}, 'Tenant A', ${`${usuarioA}@ejemplo.com`}, 'hash'), (${usuarioB}, 'Tenant B', ${`${usuarioB}@ejemplo.com`}, 'hash')`,
      );
      await admin.db.execute(
        sql`INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES (${terceroA}, ${usuarioA}, 'Tercero A', 'A', 'A'), (${terceroB}, ${usuarioB}, 'Tercero B', 'B', 'B')`,
      );
      await admin.db.execute(
        sql`INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES (${fincaA}, ${terceroA}, 'Finca A', 'A', 1, 1), (${fincaB}, ${terceroB}, 'Finca B', 'B', 2, 2)`,
      );
      datosInsertados = true;

      const identidadRuntime = await runtime.db.execute(
        sql`SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
      );
      expect(identidadRuntime.rows[0]).toEqual({
        current_user: usuarioRuntime,
        rolsuper: false,
        rolbypassrls: false,
      });

      const visiblesA = await contexto.ejecutar(usuarioA, () =>
        runtime.ejecutarConTenant(async (transaccion) => {
          const usuarios = await transaccion.execute(sql`SELECT id FROM usuarios ORDER BY id`);
          const terceros = await transaccion.execute(sql`SELECT id FROM terceros ORDER BY id`);
          const fincas = await transaccion.execute(sql`SELECT id FROM fincas ORDER BY id`);
          return { usuarios: usuarios.rows, terceros: terceros.rows, fincas: fincas.rows };
        }),
      );
      expect(visiblesA.usuarios).toEqual([{ id: usuarioA }]);
      expect(visiblesA.terceros).toEqual([{ id: terceroA }]);
      expect(visiblesA.fincas).toEqual([{ id: fincaA }]);

      await expect(
        contexto.ejecutar(usuarioA, () =>
          runtime.ejecutarConTenant((transaccion) =>
            transaccion.execute(
              sql`INSERT INTO usuarios (id, nombre, email, password_hash) VALUES (${randomUUID()}, 'Intruso', ${`${randomUUID()}@ejemplo.com`}, 'hash')`,
            ),
          ),
        ),
      ).rejects.toThrow();

      await expect(
        contexto.ejecutar(usuarioA, () =>
          runtime.ejecutarConTenant((transaccion) =>
            transaccion.execute(
              sql`INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES (${randomUUID()}, ${usuarioB}, 'Intruso', 'X', 'X')`,
            ),
          ),
        ),
      ).rejects.toThrow();

      await expect(
        contexto.ejecutar(usuarioA, () =>
          runtime.ejecutarConTenant((transaccion) =>
            transaccion.execute(
              sql`INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES (${randomUUID()}, ${terceroB}, 'Intruso', 'X', 3, 3)`,
            ),
          ),
        ),
      ).rejects.toThrow();

      const escrituraPropia = await contexto.ejecutar(usuarioA, () =>
        runtime.ejecutarConTenant(async (transaccion) => {
          await transaccion.execute(
            sql`INSERT INTO terceros (id, usuario_id, nombre, documento, contacto) VALUES (${terceroCreado}, ${usuarioA}, 'Tercero creado', 'C', 'C')`,
          );
          await transaccion.execute(
            sql`INSERT INTO fincas (id, tercero_id, nombre, direccion, latitud, longitud) VALUES (${fincaCreada}, ${terceroCreado}, 'Finca creada', 'C', 4, 4)`,
          );
          const actualizada = await transaccion.execute(
            sql`UPDATE terceros SET nombre = 'Tercero actualizado' WHERE id = ${terceroCreado} RETURNING id`,
          );
          const ajena = await transaccion.execute(
            sql`UPDATE terceros SET nombre = 'No debe cambiar' WHERE id = ${terceroB} RETURNING id`,
          );
          return { actualizada: actualizada.rows, ajena: ajena.rows };
        }),
      );
      expect(escrituraPropia.actualizada).toEqual([{ id: terceroCreado }]);
      expect(escrituraPropia.ajena).toEqual([]);
    } finally {
      if (datosInsertados) {
        await admin.db.execute(
          sql`DELETE FROM fincas WHERE id IN (${fincaA}, ${fincaB}, ${fincaCreada})`,
        );
        await admin.db.execute(
          sql`DELETE FROM terceros WHERE id IN (${terceroA}, ${terceroB}, ${terceroCreado})`,
        );
        await admin.db.execute(sql`DELETE FROM usuarios WHERE id IN (${usuarioA}, ${usuarioB})`);
      }
      await runtime.cerrar();
      await admin.cerrar();
    }
  }, 30000);
});

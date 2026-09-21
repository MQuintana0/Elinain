import { Injectable } from '@nestjs/common';
import { and, count, eq, sql } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { TerceroRespuestaDto } from './dto/tercero-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

export interface DatosCrearTercero {
  nombre: string;
  documento: string;
  contacto: string;
}

export interface DatosActualizarTercero {
  nombre?: string;
  documento?: string;
  contacto?: string;
}

@Injectable()
export class TercerosRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async crear(datos: DatosCrearTercero): Promise<TerceroRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const filas = await transaccion
        .insert(terceros)
        .values({
          usuario_id: usuarioId,
          nombre: datos.nombre,
          documento: datos.documento,
          contacto: datos.contacto,
        })
        .returning();

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear el tercero');
      }
      return fila;
    });
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<PaginaResultado<TerceroRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const [conteo] = await transaccion
        .select({ total: count() })
        .from(terceros)
        .where(eq(terceros.usuario_id, usuarioId));

      const total = Number(conteo?.total ?? 0);

      const filas = await transaccion
        .select()
        .from(terceros)
        .where(eq(terceros.usuario_id, usuarioId))
        .orderBy(terceros.nombre)
        .limit(limite)
        .offset(offset);

      return {
        elementos: filas,
        total,
        limite,
        offset,
      };
    });
  }

  async buscarPorId(id: string): Promise<TerceroRespuestaDto | undefined> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const filas = await transaccion
        .select()
        .from(terceros)
        .where(and(eq(terceros.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0];
    });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarTercero,
  ): Promise<TerceroRespuestaDto | undefined> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const datosActualizar: Partial<typeof terceros.$inferInsert> = {};
      if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
      if (datos.documento !== undefined) datosActualizar.documento = datos.documento;
      if (datos.contacto !== undefined) datosActualizar.contacto = datos.contacto;

      const filas = await transaccion
        .update(terceros)
        .set(datosActualizar)
        .where(and(eq(terceros.id, id), eq(terceros.usuario_id, usuarioId)))
        .returning();

      return filas[0];
    });
  }

  async tieneContratosVinculados(id: string): Promise<boolean> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      try {
        const resultado = await transaccion.execute(sql`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contratos'
          ) AS tabla_existe
        `);
        const tablaExiste = Boolean(
          (resultado.rows[0] as { tabla_existe?: boolean })?.tabla_existe,
        );
        if (!tablaExiste) {
          return false;
        }
        const contratos = await transaccion.execute(sql`
          SELECT 1 FROM contratos WHERE tercero_id = ${id} LIMIT 1
        `);
        return (contratos.rowCount ?? 0) > 0;
      } catch {
        return false;
      }
    });
  }

  async eliminar(id: string): Promise<boolean> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const filas = await transaccion
        .delete(terceros)
        .where(and(eq(terceros.id, id), eq(terceros.usuario_id, usuarioId)))
        .returning({ id: terceros.id });

      return filas.length > 0;
    });
  }
}

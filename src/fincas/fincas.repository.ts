import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { fincas } from '../db/schema/fincas';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { FincaRespuestaDto } from './dto/finca-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';

export interface DatosCrearFinca {
  tercero_id: string;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
}

export interface DatosActualizarFinca {
  nombre?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
}

@Injectable()
export class FincasRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async verificarTerceroPerteneceAlTenant(terceroId: string): Promise<boolean> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const filas = await transaccion
        .select({ id: terceros.id })
        .from(terceros)
        .where(and(eq(terceros.id, terceroId), eq(terceros.usuario_id, usuarioId)));

      return filas.length > 0;
    });
  }

  async crear(datos: DatosCrearFinca): Promise<FincaRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const ubicacionPunto = sql`ST_SetSRID(ST_MakePoint(${datos.longitud}, ${datos.latitud}), 4326)`;
      const filas = await transaccion
        .insert(fincas)
        .values({
          tercero_id: datos.tercero_id,
          nombre: datos.nombre,
          direccion: datos.direccion,
          latitud: datos.latitud,
          longitud: datos.longitud,
          ubicacion: ubicacionPunto,
        })
        .returning({
          id: fincas.id,
          tercero_id: fincas.tercero_id,
          nombre: fincas.nombre,
          direccion: fincas.direccion,
          latitud: fincas.latitud,
          longitud: fincas.longitud,
        });

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear la finca');
      }
      return fila;
    });
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<FincaRespuestaDto[]> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      let consulta = transaccion
        .select({
          id: fincas.id,
          tercero_id: fincas.tercero_id,
          nombre: fincas.nombre,
          direccion: fincas.direccion,
          latitud: fincas.latitud,
          longitud: fincas.longitud,
        })
        .from(fincas)
        .innerJoin(terceros, eq(fincas.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId))
        .orderBy(fincas.nombre)
        .$dynamic();

      if (paginacion?.limite !== undefined) {
        consulta = consulta.limit(paginacion.limite);
      }
      if (paginacion?.offset !== undefined) {
        consulta = consulta.offset(paginacion.offset);
      }

      return consulta;
    });
  }

  async buscarPorId(id: string): Promise<FincaRespuestaDto | undefined> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      const filas = await transaccion
        .select({
          id: fincas.id,
          tercero_id: fincas.tercero_id,
          nombre: fincas.nombre,
          direccion: fincas.direccion,
          latitud: fincas.latitud,
          longitud: fincas.longitud,
        })
        .from(fincas)
        .innerJoin(terceros, eq(fincas.tercero_id, terceros.id))
        .where(and(eq(fincas.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0];
    });
  }

  async actualizar(
    id: string,
    datos: DatosActualizarFinca,
  ): Promise<FincaRespuestaDto | undefined> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }
      // Verificar pertenencia indirecta al tenant
      const existe = await this.buscarPorId(id);
      if (!existe) {
        return undefined;
      }

      const datosActualizar: Record<string, unknown> = {};
      if (datos.nombre !== undefined) datosActualizar.nombre = datos.nombre;
      if (datos.direccion !== undefined) datosActualizar.direccion = datos.direccion;

      const nuevaLatitud = datos.latitud ?? existe.latitud;
      const nuevaLongitud = datos.longitud ?? existe.longitud;

      if (datos.latitud !== undefined) datosActualizar.latitud = datos.latitud;
      if (datos.longitud !== undefined) datosActualizar.longitud = datos.longitud;

      if (datos.latitud !== undefined || datos.longitud !== undefined) {
        datosActualizar.ubicacion = sql`ST_SetSRID(ST_MakePoint(${nuevaLongitud}, ${nuevaLatitud}), 4326)`;
      }

      const filas = await transaccion
        .update(fincas)
        .set(datosActualizar)
        .where(eq(fincas.id, id))
        .returning({
          id: fincas.id,
          tercero_id: fincas.tercero_id,
          nombre: fincas.nombre,
          direccion: fincas.direccion,
          latitud: fincas.latitud,
          longitud: fincas.longitud,
        });

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
          SELECT 1 FROM contratos WHERE finca_id = ${id} LIMIT 1
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
      // Solo elimina si pertenece al tenant
      const existe = await this.buscarPorId(id);
      if (!existe) {
        return false;
      }

      const filas = await transaccion
        .delete(fincas)
        .where(eq(fincas.id, id))
        .returning({ id: fincas.id });

      return filas.length > 0;
    });
  }
}

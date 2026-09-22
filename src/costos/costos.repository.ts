import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { costos, type NuevoCosto } from '../db/schema/costos';
import { contratos } from '../db/schema/contratos';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { CostoRespuestaDto } from './dto/costo-respuesta.dto';
import type { ActualizarCostoDto } from './dto/actualizar-costo.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

export interface ValidacionContratoCosto {
  existe: boolean;
  estado?: string;
}

function formatearCosto(fila: {
  id: string;
  contrato_id: string;
  tipo: string;
  monto: number;
  fecha: string;
  descripcion: string;
}): CostoRespuestaDto {
  return {
    id: fila.id,
    contrato_id: fila.contrato_id,
    tipo: fila.tipo,
    monto: fila.monto,
    fecha: new Date(fila.fecha).toISOString(),
    descripcion: fila.descripcion,
  };
}

@Injectable()
export class CostosRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async validarContratoPerteneceAlTenant(contratoId: string): Promise<ValidacionContratoCosto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: contratos.id,
          estado: contratos.estado,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(contratos.id, contratoId), eq(terceros.usuario_id, usuarioId)));

      const fila = filas[0];
      if (!fila) {
        return { existe: false };
      }

      return {
        existe: true,
        estado: fila.estado,
      };
    });
  }

  async obtenerContratoDeCosto(
    costoId: string,
  ): Promise<{ contrato_id: string; estado: string } | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          contrato_id: contratos.id,
          estado: contratos.estado,
        })
        .from(costos)
        .innerJoin(contratos, eq(costos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(costos.id, costoId), eq(terceros.usuario_id, usuarioId)));

      const fila = filas[0];
      return fila ? { contrato_id: fila.contrato_id, estado: fila.estado } : null;
    });
  }

  async crear(datos: NuevoCosto): Promise<CostoRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .insert(costos)
        .values({
          contrato_id: datos.contrato_id,
          tipo: datos.tipo,
          monto: datos.monto,
          fecha: datos.fecha,
          descripcion: datos.descripcion,
        })
        .returning();

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear el registro de costo');
      }
      return formatearCosto(fila);
    });
  }

  async buscarPorId(id: string): Promise<CostoRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: costos.id,
          contrato_id: costos.contrato_id,
          tipo: costos.tipo,
          monto: costos.monto,
          fecha: costos.fecha,
          descripcion: costos.descripcion,
        })
        .from(costos)
        .innerJoin(contratos, eq(costos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(costos.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0] ? formatearCosto(filas[0]) : null;
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CostoRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const condiciones = [eq(terceros.usuario_id, usuarioId)];
      if (contratoId) {
        condiciones.push(eq(costos.contrato_id, contratoId));
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const [conteoResultado] = await transaccion
        .select({ total: count() })
        .from(costos)
        .innerJoin(contratos, eq(costos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(...condiciones));

      const total = Number(conteoResultado?.total ?? 0);

      const filas = await transaccion
        .select({
          id: costos.id,
          contrato_id: costos.contrato_id,
          tipo: costos.tipo,
          monto: costos.monto,
          fecha: costos.fecha,
          descripcion: costos.descripcion,
        })
        .from(costos)
        .innerJoin(contratos, eq(costos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(...condiciones))
        .orderBy(desc(costos.fecha))
        .limit(limite)
        .offset(offset);

      return {
        elementos: filas.map(formatearCosto),
        total,
        limite,
        offset,
      };
    });
  }

  async actualizar(id: string, dto: ActualizarCostoDto): Promise<CostoRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const actualizacion: Partial<NuevoCosto> = {};
      if (dto.tipo !== undefined) actualizacion.tipo = dto.tipo;
      if (dto.monto !== undefined) actualizacion.monto = dto.monto;
      if (dto.fecha !== undefined) actualizacion.fecha = dto.fecha;
      if (dto.descripcion !== undefined) actualizacion.descripcion = dto.descripcion;

      if (Object.keys(actualizacion).length === 0) {
        return this.buscarPorId(id);
      }

      const filas = await transaccion
        .update(costos)
        .set(actualizacion)
        .where(eq(costos.id, id))
        .returning();

      return filas[0] ? formatearCosto(filas[0]) : null;
    });
  }

  async eliminar(id: string): Promise<boolean> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const resultado = await transaccion
        .delete(costos)
        .where(eq(costos.id, id))
        .returning({ id: costos.id });
      return resultado.length > 0;
    });
  }
}

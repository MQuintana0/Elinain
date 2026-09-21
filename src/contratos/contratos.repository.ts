import { Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { contratos } from '../db/schema/contratos';
import { fincas } from '../db/schema/fincas';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { ContratoRespuestaDto } from './dto/contrato-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

export interface DatosCrearContrato {
  tercero_id: string;
  finca_id: string;
  fecha_apertura: string;
  porcentaje_comerciante: number;
  porcentaje_tercero: number;
  estado?: 'activo' | 'cerrado';
  fecha_cierre?: string | null;
  raza?: string | null;
  peso_promedio_actual?: number | null;
  cantidad_actual?: number | null;
  valor_kilo_referencia?: number | null;
}

export interface DatosActualizarContrato {
  estado?: 'activo' | 'cerrado';
  fecha_cierre?: string | null;
  raza?: string | null;
  peso_promedio_actual?: number | null;
  cantidad_actual?: number | null;
  valor_kilo_referencia?: number | null;
}

@Injectable()
export class ContratosRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async validarRelacionTerceroYFinca(
    terceroId: string,
    fincaId: string,
  ): Promise<{ terceroExisteEnTenant: boolean; fincaPerteneceAlTercero: boolean }> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const tercerosTenant = await transaccion
        .select({ id: terceros.id })
        .from(terceros)
        .where(and(eq(terceros.id, terceroId), eq(terceros.usuario_id, usuarioId)));

      if (tercerosTenant.length === 0) {
        return { terceroExisteEnTenant: false, fincaPerteneceAlTercero: false };
      }

      const fincasTercero = await transaccion
        .select({ id: fincas.id })
        .from(fincas)
        .where(and(eq(fincas.id, fincaId), eq(fincas.tercero_id, terceroId)));

      return {
        terceroExisteEnTenant: true,
        fincaPerteneceAlTercero: fincasTercero.length > 0,
      };
    });
  }

  async crear(datos: DatosCrearContrato): Promise<ContratoRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .insert(contratos)
        .values({
          tercero_id: datos.tercero_id,
          finca_id: datos.finca_id,
          fecha_apertura: datos.fecha_apertura,
          porcentaje_comerciante: datos.porcentaje_comerciante,
          porcentaje_tercero: datos.porcentaje_tercero,
          estado: datos.estado ?? 'activo',
          fecha_cierre: datos.fecha_cierre ?? null,
          raza: datos.raza ?? null,
          peso_promedio_actual: datos.peso_promedio_actual ?? null,
          cantidad_actual: datos.cantidad_actual ?? null,
          valor_kilo_referencia: datos.valor_kilo_referencia ?? null,
        })
        .returning();

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear el contrato');
      }
      return fila;
    });
  }

  async buscarPorId(id: string): Promise<ContratoRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: contratos.id,
          tercero_id: contratos.tercero_id,
          finca_id: contratos.finca_id,
          fecha_apertura: contratos.fecha_apertura,
          porcentaje_comerciante: contratos.porcentaje_comerciante,
          porcentaje_tercero: contratos.porcentaje_tercero,
          estado: contratos.estado,
          fecha_cierre: contratos.fecha_cierre,
          raza: contratos.raza,
          peso_promedio_actual: contratos.peso_promedio_actual,
          cantidad_actual: contratos.cantidad_actual,
          valor_kilo_referencia: contratos.valor_kilo_referencia,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(contratos.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0] ?? null;
    });
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<PaginaResultado<ContratoRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const [conteo] = await transaccion
        .select({ total: count() })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId));

      const total = Number(conteo?.total ?? 0);

      const filas = await transaccion
        .select({
          id: contratos.id,
          tercero_id: contratos.tercero_id,
          finca_id: contratos.finca_id,
          fecha_apertura: contratos.fecha_apertura,
          porcentaje_comerciante: contratos.porcentaje_comerciante,
          porcentaje_tercero: contratos.porcentaje_tercero,
          estado: contratos.estado,
          fecha_cierre: contratos.fecha_cierre,
          raza: contratos.raza,
          peso_promedio_actual: contratos.peso_promedio_actual,
          cantidad_actual: contratos.cantidad_actual,
          valor_kilo_referencia: contratos.valor_kilo_referencia,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId))
        .orderBy(contratos.fecha_apertura)
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

  async actualizar(
    id: string,
    datos: DatosActualizarContrato,
  ): Promise<ContratoRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const contratoExistente = await this.buscarPorId(id);
      if (!contratoExistente) {
        return null;
      }

      // Solo actualiza campos explícitamente permitidos (inmutabilidad estricta de porcentajes, tercero, finca y apertura)
      const camposAActualizar: Record<string, unknown> = {};
      if (datos.estado !== undefined) camposAActualizar.estado = datos.estado;
      if (datos.fecha_cierre !== undefined) camposAActualizar.fecha_cierre = datos.fecha_cierre;
      if (datos.raza !== undefined) camposAActualizar.raza = datos.raza;
      if (datos.peso_promedio_actual !== undefined)
        camposAActualizar.peso_promedio_actual = datos.peso_promedio_actual;
      if (datos.cantidad_actual !== undefined)
        camposAActualizar.cantidad_actual = datos.cantidad_actual;
      if (datos.valor_kilo_referencia !== undefined)
        camposAActualizar.valor_kilo_referencia = datos.valor_kilo_referencia;

      if (Object.keys(camposAActualizar).length === 0) {
        return contratoExistente;
      }

      const filas = await transaccion
        .update(contratos)
        .set(camposAActualizar)
        .where(eq(contratos.id, id))
        .returning();

      return filas[0] ?? null;
    });
  }
}

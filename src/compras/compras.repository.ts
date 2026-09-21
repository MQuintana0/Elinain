import { Injectable } from '@nestjs/common';
import { and, count, eq } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { compras, type NuevaCompra } from '../db/schema/compras';
import { contratos } from '../db/schema/contratos';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import { calcularFusionCompra } from './calculo-fusion';
import type { CompraRespuestaDto } from './dto/compra-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

export interface ValidacionContrato {
  existe: boolean;
  estado?: string;
  cantidad_actual?: number | null;
  peso_promedio_actual?: number | null;
}

@Injectable()
export class ComprasRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async validarContratoPerteneceAlTenant(contratoId: string): Promise<ValidacionContrato> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: contratos.id,
          estado: contratos.estado,
          cantidad_actual: contratos.cantidad_actual,
          peso_promedio_actual: contratos.peso_promedio_actual,
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
        cantidad_actual: fila.cantidad_actual,
        peso_promedio_actual: fila.peso_promedio_actual,
      };
    });
  }

  async crear(datos: NuevaCompra): Promise<CompraRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      // 1. Obtener datos del contrato y compras previas de forma atómica
      const filasContrato = await transaccion
        .select({
          id: contratos.id,
          cantidad_actual: contratos.cantidad_actual,
          peso_promedio_actual: contratos.peso_promedio_actual,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(contratos.id, datos.contrato_id), eq(terceros.usuario_id, usuarioId)));

      const contrato = filasContrato[0];
      if (!contrato) {
        throw new Error('Contrato no encontrado o no pertenece al tenant');
      }

      const comprasPrevias = await transaccion
        .select({ peso_promedio: compras.peso_promedio })
        .from(compras)
        .where(eq(compras.contrato_id, datos.contrato_id));

      const pesosPrevios = comprasPrevias.map((c) => c.peso_promedio);

      // 2. Insertar la nueva compra
      const filas = await transaccion
        .insert(compras)
        .values({
          contrato_id: datos.contrato_id,
          fecha: datos.fecha,
          cantidad: datos.cantidad,
          peso_promedio: datos.peso_promedio,
          precio_kilo: datos.precio_kilo,
          valor_total: datos.valor_total,
          nota: datos.nota,
        })
        .returning();

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear el registro de compra');
      }

      // 3. Recalcular e impactar cantidad_actual y peso_promedio_actual del contrato (RF-11)
      const resultadoFusion = calcularFusionCompra({
        cantidadContrato: contrato.cantidad_actual,
        pesoPromedioContrato: contrato.peso_promedio_actual,
        pesosComprasExistentes: pesosPrevios,
        cantidadNuevaCompra: datos.cantidad,
        pesoPromedioNuevaCompra: datos.peso_promedio,
      });

      await transaccion
        .update(contratos)
        .set({
          cantidad_actual: resultadoFusion.nuevaCantidadActual,
          peso_promedio_actual: resultadoFusion.nuevoPesoPromedioActual,
        })
        .where(eq(contratos.id, datos.contrato_id));

      return fila;
    });
  }

  async buscarPorId(id: string): Promise<CompraRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: compras.id,
          contrato_id: compras.contrato_id,
          fecha: compras.fecha,
          cantidad: compras.cantidad,
          peso_promedio: compras.peso_promedio,
          precio_kilo: compras.precio_kilo,
          valor_total: compras.valor_total,
          nota: compras.nota,
        })
        .from(compras)
        .innerJoin(contratos, eq(compras.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(compras.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0] ?? null;
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CompraRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const condicionFiltro = contratoId
        ? and(eq(terceros.usuario_id, usuarioId), eq(compras.contrato_id, contratoId))
        : eq(terceros.usuario_id, usuarioId);

      const [conteo] = await transaccion
        .select({ total: count() })
        .from(compras)
        .innerJoin(contratos, eq(compras.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(condicionFiltro);

      const total = Number(conteo?.total ?? 0);

      const filas = await transaccion
        .select({
          id: compras.id,
          contrato_id: compras.contrato_id,
          fecha: compras.fecha,
          cantidad: compras.cantidad,
          peso_promedio: compras.peso_promedio,
          precio_kilo: compras.precio_kilo,
          valor_total: compras.valor_total,
          nota: compras.nota,
        })
        .from(compras)
        .innerJoin(contratos, eq(compras.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(condicionFiltro)
        .orderBy(compras.fecha)
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
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { ventas } from '../db/schema/ventas';
import { compras } from '../db/schema/compras';
import { contratos } from '../db/schema/contratos';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import { UtilidadService } from './utilidad.service';
import type { CrearVentaDto } from './dto/crear-venta.dto';
import type { VentaRespuestaDto } from './dto/venta-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class VentasRepository {
  constructor(
    private readonly accesoDb: AccesoDb,
    private readonly utilidadService: UtilidadService,
  ) {}

  async registrar(dto: CrearVentaDto): Promise<VentaRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      // 1. Bloqueo pesimista con FOR UPDATE del contrato para control de concurrencia estricto (RF-16)
      const filasContrato = await transaccion.execute(sql`
        SELECT 
          contratos.id,
          contratos.estado,
          contratos.cantidad_actual,
          contratos.fecha_apertura,
          contratos.porcentaje_comerciante,
          contratos.porcentaje_tercero
        FROM contratos
        INNER JOIN terceros ON contratos.tercero_id = terceros.id
        WHERE contratos.id = ${dto.contrato_id}
          AND terceros.usuario_id = ${usuarioId}
        FOR UPDATE OF contratos
      `);

      const filaContrato = filasContrato.rows[0] as
        | {
            id: string;
            estado: string;
            cantidad_actual: number | null;
            fecha_apertura: string;
            porcentaje_comerciante: number;
            porcentaje_tercero: number;
          }
        | undefined;

      if (!filaContrato) {
        throw new NotFoundException(
          'El contrato especificado no existe o no pertenece al comerciante',
        );
      }

      if (filaContrato.estado === 'cerrado') {
        throw new BadRequestException('No se pueden registrar ventas en un contrato cerrado');
      }

      // 2. Validación de cronología con fecha de apertura (RF-15)
      const fechaVentaDate = new Date(dto.fecha);
      const fechaAperturaDate = new Date(filaContrato.fecha_apertura);

      if (fechaVentaDate.getTime() < fechaAperturaDate.getTime()) {
        throw new BadRequestException(
          'La fecha de venta no puede ser anterior a la fecha de apertura del contrato',
        );
      }

      // 3. Obtener compras vinculadas al contrato para calcular promedios simples y validar cronología
      const comprasExistentes = await transaccion
        .select({
          fecha: compras.fecha,
          peso_promedio: compras.peso_promedio,
          precio_kilo: compras.precio_kilo,
        })
        .from(compras)
        .where(eq(compras.contrato_id, dto.contrato_id));

      if (comprasExistentes.length === 0) {
        throw new BadRequestException(
          'No se pueden registrar ventas en un contrato sin compras registradas',
        );
      }

      // Validación de cronología con las compras vinculadas (RF-15)
      const compraPosterior = comprasExistentes.find(
        (c) => new Date(c.fecha).getTime() > fechaVentaDate.getTime(),
      );
      if (compraPosterior) {
        throw new BadRequestException(
          'La fecha de venta no puede ser anterior a las fechas de las compras vinculadas',
        );
      }

      // 4. Validación de inventario disponible contra cantidad_actual (RF-15)
      const cantidadDisponible = filaContrato.cantidad_actual ?? 0;
      if (dto.cantidad_vendida > cantidadDisponible) {
        throw new BadRequestException(
          'La cantidad vendida supera la cantidad disponible en el contrato',
        );
      }

      // 5. Cálculo del snapshot de promedios simples a la fecha de venta (RF-17, RF-20)
      const promedios = this.utilidadService.calcularPromediosSimples(comprasExistentes, dto.fecha);

      // 6. Cálculo del motor financiero con UtilidadService (RF-18, RF-19, RF-24)
      const indicadores = this.utilidadService.calcularIndicadoresVenta({
        cantidad_vendida: dto.cantidad_vendida,
        peso_promedio_venta: dto.peso_promedio_venta,
        precio_kilo_venta: dto.precio_kilo_venta,
        peso_promedio_compra_simple: promedios.peso_promedio_compra_simple,
        precio_compra_por_animal_promedio: promedios.precio_compra_por_animal_promedio,
        porcentaje_comerciante: filaContrato.porcentaje_comerciante,
        porcentaje_tercero: filaContrato.porcentaje_tercero,
      });

      // 7. Insertar el registro de venta con todos los snapshots inmutables (RF-14, RF-20)
      const [ventaCreada] = await transaccion
        .insert(ventas)
        .values({
          contrato_id: dto.contrato_id,
          fecha: dto.fecha,
          cantidad_vendida: dto.cantidad_vendida,
          peso_promedio_venta: dto.peso_promedio_venta,
          precio_kilo_venta: dto.precio_kilo_venta,
          valor_bruto: indicadores.valor_bruto,
          precio_compra_por_animal_promedio: promedios.precio_compra_por_animal_promedio,
          peso_promedio_compra_simple: promedios.peso_promedio_compra_simple,
          costo_estimado_compra: indicadores.costo_estimado_compra,
          utilidad_total: indicadores.utilidad_total,
          valor_comerciante: indicadores.valor_comerciante,
          valor_tercero: indicadores.valor_tercero,
          kilos_ganados_promedio: indicadores.kilos_ganados_promedio,
          utilidad_real: indicadores.utilidad_real,
          porcentaje_utilidad_total: indicadores.porcentaje_utilidad_total,
        })
        .returning();

      if (!ventaCreada) {
        throw new Error('No se pudo crear el registro de venta');
      }

      // 8. Descontar cantidad_actual y ejecutar cierre automático si llega a 0 (RF-21)
      const nuevaCantidadActual = cantidadDisponible - dto.cantidad_vendida;

      if (nuevaCantidadActual === 0) {
        await transaccion
          .update(contratos)
          .set({
            cantidad_actual: 0,
            estado: 'cerrado',
            fecha_cierre: dto.fecha,
          })
          .where(eq(contratos.id, dto.contrato_id));
      } else {
        await transaccion
          .update(contratos)
          .set({
            cantidad_actual: nuevaCantidadActual,
          })
          .where(eq(contratos.id, dto.contrato_id));
      }

      return ventaCreada;
    });
  }

  async buscarPorId(id: string): Promise<VentaRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: ventas.id,
          contrato_id: ventas.contrato_id,
          fecha: ventas.fecha,
          cantidad_vendida: ventas.cantidad_vendida,
          peso_promedio_venta: ventas.peso_promedio_venta,
          precio_kilo_venta: ventas.precio_kilo_venta,
          valor_bruto: ventas.valor_bruto,
          precio_compra_por_animal_promedio: ventas.precio_compra_por_animal_promedio,
          peso_promedio_compra_simple: ventas.peso_promedio_compra_simple,
          costo_estimado_compra: ventas.costo_estimado_compra,
          utilidad_total: ventas.utilidad_total,
          valor_comerciante: ventas.valor_comerciante,
          valor_tercero: ventas.valor_tercero,
          kilos_ganados_promedio: ventas.kilos_ganados_promedio,
          utilidad_real: ventas.utilidad_real,
          porcentaje_utilidad_total: ventas.porcentaje_utilidad_total,
        })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(ventas.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0] ?? null;
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<VentaRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const condicionFiltro = contratoId
        ? and(eq(terceros.usuario_id, usuarioId), eq(ventas.contrato_id, contratoId))
        : eq(terceros.usuario_id, usuarioId);

      const [conteo] = await transaccion
        .select({ total: count() })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(condicionFiltro);

      const total = Number(conteo?.total ?? 0);

      const filas = await transaccion
        .select({
          id: ventas.id,
          contrato_id: ventas.contrato_id,
          fecha: ventas.fecha,
          cantidad_vendida: ventas.cantidad_vendida,
          peso_promedio_venta: ventas.peso_promedio_venta,
          precio_kilo_venta: ventas.precio_kilo_venta,
          valor_bruto: ventas.valor_bruto,
          precio_compra_por_animal_promedio: ventas.precio_compra_por_animal_promedio,
          peso_promedio_compra_simple: ventas.peso_promedio_compra_simple,
          costo_estimado_compra: ventas.costo_estimado_compra,
          utilidad_total: ventas.utilidad_total,
          valor_comerciante: ventas.valor_comerciante,
          valor_tercero: ventas.valor_tercero,
          kilos_ganados_promedio: ventas.kilos_ganados_promedio,
          utilidad_real: ventas.utilidad_real,
          porcentaje_utilidad_total: ventas.porcentaje_utilidad_total,
        })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(condicionFiltro)
        .orderBy(desc(ventas.fecha))
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

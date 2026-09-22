import { Injectable } from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { contratos } from '../db/schema/contratos';
import { terceros } from '../db/schema/terceros';
import { fincas } from '../db/schema/fincas';
import { ventas } from '../db/schema/ventas';
import { costos } from '../db/schema/costos';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { ReporteDashboardDto } from './dto/reporte-dashboard.dto';
import type { ReporteContratosActivosDto } from './dto/reporte-contratos-activos.dto';
import type { ReporteHistorialVentasDto } from './dto/reporte-historial-ventas.dto';

@Injectable()
export class ReportesRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async obtenerDashboard(): Promise<ReporteDashboardDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const [resumenContratos] = await transaccion
        .select({
          activos: sql<number>`count(*) filter (where ${contratos.estado} = 'activo')`,
          cerrados: sql<number>`count(*) filter (where ${contratos.estado} = 'cerrado')`,
          animales: sql<number>`coalesce(sum(case when ${contratos.estado} = 'activo' then ${contratos.cantidad_actual} else 0 end), 0)`,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId));

      const [resumenVentas] = await transaccion
        .select({
          totalVentas: sql<number>`count(*)`,
          utilidadTotal: sql<number>`coalesce(sum(${ventas.utilidad_total}), 0)`,
          utilidadComerciante: sql<number>`coalesce(sum(${ventas.valor_comerciante}), 0)`,
          utilidadTerceros: sql<number>`coalesce(sum(${ventas.valor_tercero}), 0)`,
        })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId));

      const [resumenCostos] = await transaccion
        .select({
          totalCostos: sql<number>`coalesce(sum(${costos.monto}), 0)`,
        })
        .from(costos)
        .innerJoin(contratos, eq(costos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId));

      return {
        resumen: {
          contratos_activos: Number(resumenContratos?.activos ?? 0),
          contratos_cerrados: Number(resumenContratos?.cerrados ?? 0),
          total_animales_actual: Number(resumenContratos?.animales ?? 0),
          utilidad_total_acumulada: Number(resumenVentas?.utilidadTotal ?? 0),
          utilidad_real_comerciante_acumulada: Number(resumenVentas?.utilidadComerciante ?? 0),
          utilidad_terceros_acumulada: Number(resumenVentas?.utilidadTerceros ?? 0),
          total_costos_informativos: Number(resumenCostos?.totalCostos ?? 0),
          total_ventas_registradas: Number(resumenVentas?.totalVentas ?? 0),
        },
      };
    });
  }

  async obtenerContratosActivos(): Promise<ReporteContratosActivosDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          contrato_id: contratos.id,
          tercero_id: terceros.id,
          tercero_nombre: terceros.nombre,
          finca_id: fincas.id,
          finca_nombre: fincas.nombre,
          fecha_apertura: contratos.fecha_apertura,
          porcentaje_comerciante: contratos.porcentaje_comerciante,
          porcentaje_tercero: contratos.porcentaje_tercero,
          cantidad_actual: contratos.cantidad_actual,
          peso_promedio_actual: contratos.peso_promedio_actual,
          total_compras: sql<number>`(select count(*) from compras where compras.contrato_id = ${contratos.id})`,
          total_ventas: sql<number>`(select count(*) from ventas where ventas.contrato_id = ${contratos.id})`,
          utilidad_generada_comerciante: sql<number>`coalesce((select sum(ventas.valor_comerciante) from ventas where ventas.contrato_id = ${contratos.id}), 0)`,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .innerJoin(fincas, eq(contratos.finca_id, fincas.id))
        .where(and(eq(terceros.usuario_id, usuarioId), eq(contratos.estado, 'activo')))
        .orderBy(desc(contratos.fecha_apertura));

      return {
        contratos: filas.map((f) => ({
          contrato_id: f.contrato_id,
          tercero_id: f.tercero_id,
          tercero_nombre: f.tercero_nombre,
          finca_id: f.finca_id,
          finca_nombre: f.finca_nombre,
          fecha_apertura: new Date(f.fecha_apertura).toISOString(),
          porcentaje_comerciante: Number(f.porcentaje_comerciante),
          porcentaje_tercero: Number(f.porcentaje_tercero),
          cantidad_actual: Number(f.cantidad_actual ?? 0),
          peso_promedio_actual:
            f.peso_promedio_actual !== null ? Number(f.peso_promedio_actual) : null,
          total_compras: Number(f.total_compras ?? 0),
          total_ventas: Number(f.total_ventas ?? 0),
          utilidad_generada_comerciante: Number(f.utilidad_generada_comerciante ?? 0),
        })),
      };
    });
  }

  async obtenerHistorialVentas(): Promise<ReporteHistorialVentasDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const [resumen] = await transaccion
        .select({
          total_ventas: sql<number>`count(*)`,
          total_animales_vendidos: sql<number>`coalesce(sum(${ventas.cantidad_vendida}), 0)`,
          valor_bruto_acumulado: sql<number>`coalesce(sum(${ventas.valor_bruto}), 0)`,
          costo_estimado_acumulado: sql<number>`coalesce(sum(${ventas.costo_estimado_compra}), 0)`,
          utilidad_total_acumulada: sql<number>`coalesce(sum(${ventas.utilidad_total}), 0)`,
          utilidad_comerciante_acumulada: sql<number>`coalesce(sum(${ventas.valor_comerciante}), 0)`,
          utilidad_terceros_acumulada: sql<number>`coalesce(sum(${ventas.valor_tercero}), 0)`,
        })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId));

      const lista = await transaccion
        .select({
          venta_id: ventas.id,
          contrato_id: ventas.contrato_id,
          fecha: ventas.fecha,
          cantidad_vendida: ventas.cantidad_vendida,
          peso_promedio_venta: ventas.peso_promedio_venta,
          precio_kilo_venta: ventas.precio_kilo_venta,
          valor_bruto: ventas.valor_bruto,
          costo_estimado_compra: ventas.costo_estimado_compra,
          utilidad_total: ventas.utilidad_total,
          valor_comerciante: ventas.valor_comerciante,
          valor_tercero: ventas.valor_tercero,
          kilos_ganados_promedio: ventas.kilos_ganados_promedio,
          porcentaje_utilidad_total: ventas.porcentaje_utilidad_total,
        })
        .from(ventas)
        .innerJoin(contratos, eq(ventas.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(eq(terceros.usuario_id, usuarioId))
        .orderBy(desc(ventas.fecha));

      return {
        resumen: {
          total_ventas: Number(resumen?.total_ventas ?? 0),
          total_animales_vendidos: Number(resumen?.total_animales_vendidos ?? 0),
          valor_bruto_acumulado: Number(resumen?.valor_bruto_acumulado ?? 0),
          costo_estimado_acumulado: Number(resumen?.costo_estimado_acumulado ?? 0),
          utilidad_total_acumulada: Number(resumen?.utilidad_total_acumulada ?? 0),
          utilidad_comerciante_acumulada: Number(resumen?.utilidad_comerciante_acumulada ?? 0),
          utilidad_terceros_acumulada: Number(resumen?.utilidad_terceros_acumulada ?? 0),
        },
        ventas: lista.map((v) => ({
          venta_id: v.venta_id,
          contrato_id: v.contrato_id,
          fecha: new Date(v.fecha).toISOString(),
          cantidad_vendida: Number(v.cantidad_vendida),
          peso_promedio_venta: Number(v.peso_promedio_venta),
          precio_kilo_venta: Number(v.precio_kilo_venta),
          valor_bruto: Number(v.valor_bruto),
          costo_estimado_compra: Number(v.costo_estimado_compra),
          utilidad_total: Number(v.utilidad_total),
          valor_comerciante: Number(v.valor_comerciante),
          valor_tercero: Number(v.valor_tercero),
          kilos_ganados_promedio: Number(v.kilos_ganados_promedio),
          porcentaje_utilidad_total: Number(v.porcentaje_utilidad_total),
        })),
      };
    });
  }
}

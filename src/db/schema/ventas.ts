import { doublePrecision, integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contratos } from './contratos';

export const ventas = pgTable('ventas', {
  id: uuid('id').defaultRandom().primaryKey(),
  contrato_id: uuid('contrato_id')
    .notNull()
    .references(() => contratos.id),
  fecha: timestamp('fecha', { withTimezone: true, mode: 'string' }).notNull(),
  cantidad_vendida: integer('cantidad_vendida').notNull(),
  peso_promedio_venta: doublePrecision('peso_promedio_venta').notNull(),
  precio_kilo_venta: doublePrecision('precio_kilo_venta').notNull(),
  valor_bruto: doublePrecision('valor_bruto').notNull(),
  precio_compra_por_animal_promedio: doublePrecision('precio_compra_por_animal_promedio').notNull(),
  peso_promedio_compra_simple: doublePrecision('peso_promedio_compra_simple').notNull(),
  costo_estimado_compra: doublePrecision('costo_estimado_compra').notNull(),
  utilidad_total: doublePrecision('utilidad_total').notNull(),
  valor_comerciante: doublePrecision('valor_comerciante').notNull(),
  valor_tercero: doublePrecision('valor_tercero').notNull(),
  kilos_ganados_promedio: doublePrecision('kilos_ganados_promedio').notNull(),
  utilidad_real: doublePrecision('utilidad_real').notNull(),
  porcentaje_utilidad_total: doublePrecision('porcentaje_utilidad_total').notNull(),
});

export type VentaEntidad = typeof ventas.$inferSelect;
export type NuevaVenta = typeof ventas.$inferInsert;

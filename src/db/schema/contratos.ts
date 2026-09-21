import { doublePrecision, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { terceros } from './terceros';
import { fincas } from './fincas';

export const contratos = pgTable('contratos', {
  id: uuid('id').defaultRandom().primaryKey(),
  tercero_id: uuid('tercero_id')
    .notNull()
    .references(() => terceros.id),
  finca_id: uuid('finca_id')
    .notNull()
    .references(() => fincas.id),
  fecha_apertura: timestamp('fecha_apertura', { withTimezone: true, mode: 'string' }).notNull(),
  porcentaje_comerciante: doublePrecision('porcentaje_comerciante').notNull(),
  porcentaje_tercero: doublePrecision('porcentaje_tercero').notNull(),
  estado: text('estado').notNull().default('activo'),
  fecha_cierre: timestamp('fecha_cierre', { withTimezone: true, mode: 'string' }),
  raza: text('raza'),
  peso_promedio_actual: doublePrecision('peso_promedio_actual'),
  cantidad_actual: integer('cantidad_actual'),
  valor_kilo_referencia: doublePrecision('valor_kilo_referencia'),
});

export type ContratoEntidad = typeof contratos.$inferSelect;
export type NuevoContrato = typeof contratos.$inferInsert;

import { doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contratos } from './contratos';

export const costos = pgTable('costos', {
  id: uuid('id').defaultRandom().primaryKey(),
  contrato_id: uuid('contrato_id')
    .notNull()
    .references(() => contratos.id),
  tipo: text('tipo').notNull(),
  monto: doublePrecision('monto').notNull(),
  fecha: timestamp('fecha', { withTimezone: true, mode: 'string' }).notNull(),
  descripcion: text('descripcion').notNull(),
});

export type CostoEntidad = typeof costos.$inferSelect;
export type NuevoCosto = typeof costos.$inferInsert;

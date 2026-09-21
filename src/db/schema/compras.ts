import { doublePrecision, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contratos } from './contratos';

export const compras = pgTable('compras', {
  id: uuid('id').defaultRandom().primaryKey(),
  contrato_id: uuid('contrato_id')
    .notNull()
    .references(() => contratos.id),
  fecha: timestamp('fecha', { withTimezone: true, mode: 'string' }).notNull(),
  cantidad: integer('cantidad').notNull(),
  peso_promedio: doublePrecision('peso_promedio').notNull(),
  precio_kilo: doublePrecision('precio_kilo').notNull(),
  valor_total: doublePrecision('valor_total').notNull(),
  nota: text('nota').notNull(),
});

export type CompraEntidad = typeof compras.$inferSelect;
export type NuevaCompra = typeof compras.$inferInsert;

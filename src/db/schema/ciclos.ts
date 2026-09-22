import { doublePrecision, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { contratos } from './contratos';

export const ciclos = pgTable('ciclos', {
  id: uuid('id').defaultRandom().primaryKey(),
  contrato_id: uuid('contrato_id')
    .notNull()
    .references(() => contratos.id),
  fecha: timestamp('fecha', { withTimezone: true, mode: 'string' }).notNull(),
  peso_observado: doublePrecision('peso_observado'),
  notas: text('notas'),
});

export type CicloEntidad = typeof ciclos.$inferSelect;
export type NuevoCiclo = typeof ciclos.$inferInsert;

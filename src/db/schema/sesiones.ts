import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { usuarios } from './usuarios';

export const esquemaSesiones = pgTable('sesiones', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuario_id: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull().unique(),
  familia_id: uuid('familia_id').notNull(),
  reemplazado_por: uuid('reemplazado_por'),
  revocado: boolean('revocado').notNull().default(false),
  revocado_en: timestamp('revocado_en', { withTimezone: true, mode: 'string' }),
  revocado_motivo: text('revocado_motivo'),
  creado_en: timestamp('creado_en', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
  expira_en: timestamp('expira_en', { withTimezone: true, mode: 'string' }).notNull(),
  ip: text('ip'),
  user_agent: text('user_agent'),
});

export const sesiones = esquemaSesiones;
export type SesionEntidad = typeof sesiones.$inferSelect;
export type NuevaSesion = typeof sesiones.$inferInsert;

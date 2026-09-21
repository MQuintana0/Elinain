// Business partners owning the farms (tenant-scoped via usuario_id).
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { usuarios } from './usuarios';

export const terceros = pgTable('terceros', {
  id: uuid('id').defaultRandom().primaryKey(),
  usuario_id: uuid('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  nombre: text('nombre').notNull(),
  documento: text('documento').notNull(),
  contacto: text('contacto').notNull(),
});

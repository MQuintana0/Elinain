// Base table for merchant profiles (tenant root).
import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const usuarios = pgTable('usuarios', {
  id: uuid('id').defaultRandom().primaryKey(),
  nombre: text('nombre').notNull(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
});

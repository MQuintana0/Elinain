// Farms belong to a tercero only (no direct usuario_id by design);
// tenant isolation resolves indirectly via the finca->tercero->usuario_id join.
import { doublePrecision, geometry, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { terceros } from './terceros';

export const esquemaFincas = pgTable('fincas', {
  id: uuid('id').defaultRandom().primaryKey(),
  tercero_id: uuid('tercero_id')
    .notNull()
    .references(() => terceros.id),
  nombre: text('nombre').notNull(),
  direccion: text('direccion').notNull(),
  latitud: doublePrecision('latitud').notNull(),
  longitud: doublePrecision('longitud').notNull(),
  // Spatial point derived from latitud/longitud (PostGIS, SRID 4326).
  ubicacion: geometry('ubicacion', { type: 'Point', srid: 4326 }),
});

export const fincas = esquemaFincas;

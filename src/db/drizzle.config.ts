// Drizzle Kit configuration for migrations (PostgreSQL + PostGIS).
import { defineConfig } from 'drizzle-kit';

const urlConexion =
  process.env.DATABASE_MIGRATION_URL ??
  'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  tablesFilter: ['fincas', 'terceros', 'usuarios'],
  dbCredentials: { url: urlConexion },
});

// Drizzle Kit configuration for migrations (PostgreSQL + PostGIS).
import { defineConfig } from 'drizzle-kit';
import { cargarVariablesEntorno } from '../common/cargar-entorno';

cargarVariablesEntorno();

const urlConexion =
  process.env.DATABASE_MIGRATION_URL ??
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  'postgres://elinain_admin:elinain_admin@localhost:5433/elinain';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  tablesFilter: ['fincas', 'terceros', 'usuarios', 'contratos', 'compras', 'ventas'],
  dbCredentials: { url: urlConexion },
});

// Drizzle Kit configuration for migrations (PostgreSQL + PostGIS).
import { defineConfig } from 'drizzle-kit';

const urlConexion = process.env.DATABASE_URL ?? 'postgres://elinain:elinain@localhost:5433/elinain';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: urlConexion },
});

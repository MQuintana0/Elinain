import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carga las variables de entorno con precedencia:
 * 1. Variables ya definidas en el sistema / entorno (process.env).
 * 2. `.env.local` (ajustes locales de desarrollo, no versionado).
 * 3. `.env` (configuración base o remota, no versionado).
 */
export function cargarVariablesEntorno(): void {
  if (typeof process.loadEnvFile !== 'function') {
    return;
  }

  const rutaLocal = resolve(process.cwd(), '.env.local');
  if (existsSync(rutaLocal)) {
    process.loadEnvFile(rutaLocal);
  }

  const rutaBase = resolve(process.cwd(), '.env');
  if (existsSync(rutaBase)) {
    process.loadEnvFile(rutaBase);
  }
}

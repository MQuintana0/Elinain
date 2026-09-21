# Elinain: del cuaderno al reparto exacto de utilidades ganaderas

Backend MVP en NestJS para comerciantes ganaderos que compran, engordan y venden bovinos en participación con dueños de finca. Centraliza terceros, fincas, contratos (1 contrato = 1 lote), compras, ventas, ciclos y costos, y automatiza el cálculo financiero (promedio ponderado, utilidad real y reparto) con aislamiento multi-tenant estricto por comerciante.

## Quick path

1. **Requisitos:** Node 22+, pnpm 9+, Docker con imagen `postgis/postgis:16-3.5`. Instalar dependencias:
   ```bash
   pnpm install
   ```
2. **Variables de entorno:** crear `.env` (no versionado) con, como mínimo:
   ```bash
   DATABASE_URL=postgres://elinain:elinain@localhost:5433/elinain
   PORT=3000
   ```
3. **Base de datos:** levantar Postgres+PostGIS y aplicar la migración base (RLS incluido):
   ```bash
   docker compose up -d db
   pnpm dlx drizzle-kit migrate
   ```
4. **Ejecutar:**
   ```bash
   pnpm run start:dev
   ```
5. **Verificación:** abrir Swagger en `http://localhost:3000/docs` y la referencia Scalar en `http://localhost:3000/referencia`. Otros scripts:
   ```bash
   pnpm run build
   pnpm run test
   pnpm run lint && pnpm run format
   ```

## Details

| Tema | Decisión |
|------|----------|
| Stack | NestJS 11, PostgreSQL 16 + PostGIS, Drizzle ORM (`drizzle-orm` + `drizzle-kit`), `pg`, validación con `class-validator` + `class-transformer`, docs con `@nestjs/swagger` + `@scalar/nestjs-api-reference`, Jest + ts-jest para pruebas |
| Arquitectura | Modular por dominio: `usuarios`, `terceros`, `fincas`, `contratos`, `compras`, `ventas`, `ciclos`, `costos`, `reportes`, más `common` (filtros, interceptores, guards) y `db` (schema + `drizzle.config.ts`). Flujo estricto controller → service → base de datos; cero lógica de negocio en controladores; patrón Repositorio aísla a Drizzle |
| Aislamiento tenant | `TenantGuard` global inyecta `usuario_id` en cada petición y todo repositorio lo exige; PostgreSQL aplica RLS con `app.usuario_id` (`drizzle/0000_base_rls_postgis.sql`). `fincas` se aísla indirectamente vía `finca → tercero → usuario_id` (sin columna `usuario_id` propia por diseño) |
| Motor financiero | `UtilidadService` es puro (sin DB ni HTTP, 100 % testeable): promedio ponderado recalculado a la fecha de cada venta, snapshot guardado en la venta, utilidad real, kilos ganados, porcentajes y reparto según `porcentaje_participacion` inmutable |
| Reglas innegociables | `TenantGuard` cubre el 100 % de las rutas; `UtilidadService` sin acceso a datos; sin descuentos operativos (los costos son informativos y no alteran la utilidad real); reportes solo agregan datos existentes; validación estricta con DTOs (whitelist + `forbidNonWhitelisted`) y mensajes de error de la API en español |
| Estructura | `src/main.ts` (bootstrap, pipes, filtros, interceptores, Swagger `/docs` + Scalar `/referencia`), `src/app.module.ts` (10 módulos), `src/db/` (schema + config de migraciones), `drizzle/` (SQL de migraciones), `test/` (toda prueba vive aquí: `integracion/` y `e2e/`, config `test/jest-integracion.json`) |
| Documentación API | Swagger UI en `/docs`, referencia Scalar en `/referencia`, título `Elinain API` v0.1.0 |
| Trabajo local no versionado | `docs/`, `odd/` y `.atl/` están en `.gitignore`: son apuntes y tableros de trabajo locales. La spec activa versionada vive en `specs/001-elinain-mvp/spec.md` |

## Checklist

- [ ] `pnpm install` completa sin errores
- [ ] `docker compose up -d db` deja Postgres+PostGIS sano (`pg_isready`)
- [ ] `pnpm dlx drizzle-kit migrate` aplica `drizzle/0000_base_rls_postgis.sql` (extensiones PostGIS + pgcrypto, tablas, RLS)
- [ ] `pnpm run start:dev` escucha en el puerto de `PORT` y responde `/docs` y `/referencia`
- [ ] `pnpm run test` pasa (unitarios de cálculo + integración/e2e en `./test`)
- [ ] Toda ruta nueva/tocada queda bajo `TenantGuard`; todo endpoint valida con DTOs y responde errores en español

## Next step

Leer la constitución (`docs/constitution.md`, local) y la spec activa (`specs/001-elinain-mvp/spec.md`) antes de tocar código, y confirmar el plan en `AGENTS.md`.

# Elinain

Backend MVP en NestJS para comerciantes ganaderos que compran, engordan y venden bovinos en participación con dueños de finca. Centraliza terceros, fincas, contratos (1 contrato = 1 lote), compras, ventas, ciclos y costos, y automatiza el cálculo financiero con aislamiento multi-tenant estricto por comerciante.

Producción: `https://elinain.onrender.com` — documentación en [/docs](https://elinain.onrender.com/docs).

## Table of Contents

- [About The Project](#about-the-project)
  - [Built With](#built-with)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Deployment](#deployment)

## About The Project

El cuaderno del comerciante ganadero no escala: los repartos de utilidades en participación se calculan a mano y se discuten después. Elinain centraliza la operación (terceros, fincas, contratos, compras, ventas, ciclos, costos) y automatiza el cálculo —promedio ponderado a la fecha de cada venta, utilidad real y reparto según el porcentaje de participación inmutable— con aislamiento de datos por comerciante a nivel de base de datos (RLS) y de aplicación (`TenantGuard`).

### Built With

- [NestJS 11](https://nestjs.com/) + TypeScript estricto
- [PostgreSQL 16 + PostGIS](https://postgis.net/) (Neon en producción)
- [Drizzle ORM](https://orm.drizzle.team/) (`drizzle-orm` + `drizzle-kit`)
- Validación con `class-validator` + `class-transformer`
- Docs con `@nestjs/swagger` + `@scalar/nestjs-api-reference`
- Jest + ts-jest (toda prueba vive en `./test`)

## Getting Started

Para tener una copia local corriendo sigue estos pasos.

### Prerequisites

- Node 24.x y pnpm 11.x
- Docker con imagen `postgis/postgis:16-3.5`

### Installation

1. Clona el repo:
   ```sh
   git clone git@github.com:MQuintana0/Elinain.git
   cd Elinain
   ```
2. Instala dependencias:
   ```sh
   pnpm install
   ```
3. Crea `.env` (no versionado; ver `.env.example`):
   ```sh
   DATABASE_URL=postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain
   DATABASE_MIGRATION_URL=postgres://elinain_admin:elinain_admin@localhost:5433/elinain
   PORT=3000
   ```
4. Levanta Postgres+PostGIS y ejecuta las migraciones con el rol admin separado del runtime:
   ```sh
   docker compose up -d db
   pnpm migration:run
   ```

## Usage

```sh
# desarrollo (watch)
pnpm run start:dev

# producción local (requiere build previo)
pnpm run build
pnpm run start:prod
```

| Script                | Qué hace                                        |
| --------------------- | ----------------------------------------------- |
| `pnpm run start:dev`  | Levanta en watch mode con `PORT` (default 3000) |
| `pnpm run build`      | Compila a `dist/`                               |
| `pnpm run start:prod` | Corre `node dist/main.js` (lo que usa Render)   |
| `pnpm run test`       | Suite Jest (`./test`: integración + e2e)        |
| `pnpm run lint`       | ESLint sobre `src/` y `test/`                   |
| `pnpm run format`     | Prettier check sobre `src/` y `test/`           |

Verificación local: Swagger en `http://localhost:3000/docs`, Scalar en `http://localhost:3000/referencia`, health en `http://localhost:3000/api/v1/health`.

## API Reference

Todos los endpoints están versionados bajo `/api/v1` (convención del proyecto). La referencia completa y ejecutable está en Swagger:

- Local: `http://localhost:3000/docs`
- Producción: `https://elinain.onrender.com/docs`

Respuestas OK con forma `{ "exito": true, "datos": { ... } }`; errores con su código HTTP y `{ "exito": false, "mensaje": "..." }`, todo en español. La validación de DTOs es estricta (whitelist + `forbidNonWhitelisted`).

## Deployment

- **Backend:** Render como web service Node, vía Blueprint (`render.yaml`): build `pnpm install --frozen-lockfile && pnpm run build`, start `node dist/main.js`, health check en `/api/v1/health`, `NODE_ENV=production`.
- **Base de datos:** Neon (Postgres). El runtime usa la URL pooled con `?sslmode=require` (se configura como `DATABASE_URL` en el dashboard de Render, nunca en el repo); las migraciones usan la URL directa.
- Primer deploy tarda varios minutos; si el servicio estuvo inactivo, la primera petición puede tardar (cold start).

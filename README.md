# Elinain

Backend en NestJS para la gestión ganadera multi-tenant de comerciantes que compran, engordan y comercializan bovinos en contratos de participación con dueños de finca. Centraliza la administración de terceros, fincas geolocalizadas con PostGIS, contratos por lote, compras y ventas con cálculo financiero automatizado y aislamiento estricto por comerciante mediante Row-Level Security (RLS) y `TenantGuard`.

---

> ### 🌐 API en Producción
>
> La API se encuentra desplegada y disponible públicamente en Render:
>
> - **Base URL:** `https://elinain.onrender.com/api/v1`
> - **Health Check:** [https://elinain.onrender.com/api/v1/health](https://elinain.onrender.com/api/v1/health)
>
> #### 📖 Exploración de Contratos y Documentación Interactiva
>
> Todos los endpoints disponibles en el proyecto están 100% documentados con sus contratos, DTOs y ejemplos. Puedes utilizar cualquiera de las dos herramientas disponibles según tu preferencia para revisar los contratos y probar peticiones en vivo:
>
> - **Scalar (Recomendada / Vista moderna):** [https://elinain.onrender.com/referencia](https://elinain.onrender.com/referencia)
> - **Swagger UI (Vista interactiva clásica):** [https://elinain.onrender.com/docs](https://elinain.onrender.com/docs)
>
> _(Nota: Si el servicio se encuentra inactivo, la primera petición puede tardar unos segundos mientras la instancia inicia)._

---

## Tabla de Contenidos

- [Acerca del Proyecto](#acerca-del-proyecto)
  - [El Negocio Tradicional (Sin Elinain)](#el-negocio-tradicional-sin-elinain)
  - [Flujo Actual Implementado en Elinain](#flujo-actual-implementado-en-elinain)
  - [Tecnologías](#tecnologías)
- [Exploración de la API](#exploración-de-la-api)
- [Puesta en Marcha Local](#puesta-en-marcha-local)
  - [Requisitos Previos](#requisitos-previos)
  - [Instalación y Configuración](#instalación-y-configuración)
  - [Ejecución](#ejecución)
  - [Pruebas Automatizadas](#pruebas-automatizadas)
- [Estructura y Convenciones](#estructura-y-convenciones)

---

## Acerca del Proyecto

Elinain automatiza y centraliza la operativa comercial ganadera:

- **Aislamiento Multi-Tenant:** Cada comerciante gestiona su propio entorno de forma aislada. La seguridad se aplica en dos capas: `TenantGuard` global a nivel de aplicación y políticas de Row-Level Security (RLS) en PostgreSQL sobre las tablas de tenant.
- **Terceros y Fincas:** Registro de terceros propietarios y fincas asociadas geolocalizadas mediante la extensión espacial **PostGIS**.
- **Seguridad:** Autenticación de usuarios mediante JWT con contraseñas encriptadas con `bcrypt`.

---

### El Negocio Tradicional (Sin Elinain)

En el modelo tradicional, el comerciante ganadero opera en participación con terceros dueños de finca mediante acuerdos informales y registros manuales:

```mermaid
flowchart TD
    subgraph S1["1. Compra y Acuerdo en Participación"]
        C["Comerciante Ganadero"] -- "Compra lote de animales\n(pesos, precio/kg, fletes)" --> L["Lote de Ganado"]
        C -- "Pacto de participación en libreta\n(ej. 60% Comerciante / 40% Tercero)" --> T["Tercero\n(Dueño de finca)"]
        L -- "Traslado para engorde" --> F["Finca del Tercero\n(Ubicación sin georreferenciar)"]
    end

    subgraph S2["2. Fase de Engorde y Nuevos Ingresos"]
        F -- "Alimentación y cuidado\n(asumido por el tercero)" --> E["Engorde de Animales"]
        C -. "Fusiones posteriores\n(compras sumadas al lote)" .-> F
        C -. "Anotaciones dispersas\n(cuadernos, WhatsApp, Excel)" .-> D["Datos Fragmentados"]
    end

    subgraph S3["3. Venta y Liquidación Manual (Fricción)"]
        E -- "Venta parcial o total del lote\n(pesos y precios de salida)" --> V["Comprador / Frigorífico"]
        V -- "Ingreso Bruto de la Venta" --> LIQ["Liquidación Manual"]
        LIQ -- "Cálculo manual de costo histórico\ny promedios de compra" --> ERR["Riesgo de errores aritméticos\ny descuadre de inventario"]
        ERR --> CONF["Disputas y desconfianza\nen el reparto de utilidades"]
    end
```

---

### Flujo Actual Implementado en Elinain

El flujo implementado resuelve el problema desde la raíz, digitalizando la identidad del comerciante, sus socios y la ubicación geográfica de sus fincas con aislamiento estricto:

```mermaid
flowchart TD
    subgraph Identidad["1. Autenticación y Contexto Tenant"]
        User["Comerciante Ganadero\n(Cliente HTTP)"] -- "POST /api/v1/usuarios/registro\nPOST /api/v1/usuarios/acceso" --> Auth["Módulo Usuarios\n(bcrypt + JWT)"]
        Auth -- "Retorna Bearer JWT\n(sub: usuario_id)" --> User
    end

    subgraph Seguridad["2. Pipeline Transversal de Seguridad"]
        User -- "Petición HTTP con Bearer Token" --> TG["TenantGuard Global\n(Valida JWT y extrae usuario_id)"]
        TG --> ICT["InterceptorContextoTenant\n(AsyncLocalStorage)"]
        ICT --> VP["ValidationPipe Global\n(DTOs estrictos: 400 en español)"]
    end

    subgraph Dominio["3. Módulos de Dominio"]
        VP -- "Rutas /api/v1/terceros" --> TC["TercerosController\n(CRUD Socios de Finca)"]
        VP -- "Rutas /api/v1/fincas" --> FC["FincasController\n(CRUD Fincas Geolocalizadas)"]

        TC --> TS["TercerosService\n(Guarda referencial de contratos)"]
        FC --> FS["FincasService\n(Valida tercero propio del tenant)"]

        TS --> TR["TercerosRepository"]
        FS --> FR["FincasRepository"]
    end

    subgraph Persistencia["4. Base de Datos y Aislamiento RLS"]
        TR & FR --> ADB["AccesoDb.ejecutarConTenant\n(SET LOCAL app.usuario_id)"]
        ADB --> PG[("PostgreSQL 16 + PostGIS")]

        PG --- RLS1["RLS en 'terceros'\n(usuario_id = app.usuario_id)"]
        PG --- RLS2["RLS en 'fincas'\n(join finca->tercero->usuario_id)"]
        PG --- GIS["PostGIS\n(ubicacion Point SRID 4326)"]
    end

    subgraph Docs["5. Documentación y Contratos Interactivos"]
        TC & FC -. "Contratos y DTOs OpenAPI" .-> DOCS["Todos los endpoints documentados\n(Scalar /referencia o Swagger /docs)"]
    end
```

---

### Tecnologías

- **Runtime y Lenguaje:** [Node.js 24](https://nodejs.org/) con [TypeScript](https://www.typescriptlang.org/) estricto.
- **Framework:** [NestJS 11](https://nestjs.com/) con arquitectura modular (Controlador → Servicio → Repositorio).
- **Base de Datos y ORM:** [PostgreSQL 16](https://www.postgresql.org/) + [PostGIS](https://postgis.net/) gestionado con [Drizzle ORM](https://orm.drizzle.team/).
- **Validación:** `class-validator` y `class-transformer` con validación estricta global.
- **Documentación OpenAPI:** `@nestjs/swagger` expuesto simultáneamente con Swagger UI y `@scalar/nestjs-api-reference`.
- **Testing:** [Jest](https://jestjs.io/) con suites organizadas en tests unitarios, de integración y end-to-end (e2e).

---

## Exploración de la API

Todos los endpoints disponibles en el sistema (salud, registro, inicio de sesión, terceros y fincas geolocalizadas) están completamente documentados con sus contratos, DTOs de entrada y esquemas de respuesta. Puedes usar la interfaz que prefieras para revisarlos:

| Interfaz       | Entorno Local                      | Producción                                                                           | Descripción                                                                         |
| -------------- | ---------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Scalar**     | `http://localhost:3000/referencia` | [`https://elinain.onrender.com/referencia`](https://elinain.onrender.com/referencia) | Interfaz moderna, clara y optimizada para consultar contratos y esquemas.           |
| **Swagger UI** | `http://localhost:3000/docs`       | [`https://elinain.onrender.com/docs`](https://elinain.onrender.com/docs)             | Interfaz clásica interactiva para probar peticiones directamente contra el backend. |

### Convención de Respuestas

Todos los endpoints de dominio están versionados bajo el prefijo `/api/v1`.

- **Éxito (2xx):**
  ```json
  {
    "exito": true,
    "datos": { ... }
  }
  ```
- **Error (4xx / 5xx):**
  ```json
  {
    "exito": false,
    "mensaje": "Mensaje explicativo del error",
    "codigoEstado": 400,
    "ruta": "/api/v1/...",
    "marcaTiempo": "2026-09-21T..."
  }
  ```

---

## Puesta en Marcha Local

Sigue estos pasos para clonar, configurar y levantar el proyecto en tu entorno local.

### Requisitos Previos

- **Node.js:** Versión 24.x
- **pnpm:** Versión 11.x (`corepack enable pnpm` o `npm install -g pnpm`)
- **Docker / Podman:** Para levantar el contenedor de PostgreSQL con PostGIS.

### Instalación y Configuración

1. **Clonar el repositorio:**

   ```bash
   git clone git@github.com:MQuintana0/Elinain.git
   cd Elinain
   ```

2. **Instalar dependencias:**

   ```bash
   pnpm install
   ```

3. **Configurar variables de entorno:**
   Copia la plantilla `.env.example` a `.env.local` para desarrollo local:

   ```bash
   cp .env.example .env.local
   ```

   Ajusta las credenciales locales según tu entorno (por defecto preparadas para el puerto local 5433):

   ```env
   DATABASE_URL="postgres://elinain_runtime:elinain_runtime@localhost:5433/elinain"
   DATABASE_MIGRATION_URL="postgres://elinain_admin:elinain_admin@localhost:5433/elinain"
   DATABASE_ADMIN_URL="postgres://elinain_admin:elinain_admin@localhost:5433/elinain"
   PORT=3000
   NODE_ENV=development
   JWT_SECRETO=secreto-desarrollo-local
   JWT_EXPIRA=3600s
   ```

4. **Levantar base de datos y aplicar migraciones:**
   ```bash
   docker compose up -d db
   pnpm migration:run
   ```

### Ejecución

```bash
# Modo desarrollo con recarga en caliente (watch)
pnpm run start:dev

# Compilar proyecto a dist/
pnpm run build

# Modo producción local
pnpm run start:prod
```

Una vez levantada la aplicación:

- **API Base:** `http://localhost:3000/api/v1`
- **Health Check:** `http://localhost:3000/api/v1/health`
- **Documentación Scalar:** `http://localhost:3000/referencia`
- **Documentación Swagger:** `http://localhost:3000/docs`

### Pruebas Automatizadas

Toda la suite de pruebas se encuentra alojada en `./test`:

```bash
# Ejecutar todas las pruebas (integración y e2e)
pnpm run test

# Verificación de formato y linters
pnpm run lint
pnpm run format
```

---

## Estructura y Convenciones

- **Controladores delgados:** Los controladores solo validan DTOs y delegan inmediatamente a la capa de servicios. Cero lógica de negocio en controladores.
- **Patrón Repositorio:** Toda interacción con PostgreSQL y Drizzle ORM se realiza a través de repositorios dedicados con aislamiento transaccional por tenant.
- **Respuestas y Validaciones:** Los mensajes de error y respuestas de la API están estandarizados en español para alinearse con el dominio del negocio.

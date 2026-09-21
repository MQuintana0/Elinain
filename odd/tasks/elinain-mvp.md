# Tareas ODD — MVP Elinain (spec 001-elinain-mvp)

## Objective

Construir el backend MVP de Elinain (NestJS + PostgreSQL + Drizzle) que cubra el 100% de la spec 001: gestión ganadera multi-tenant por lotes con contratos en participación, motor financiero exacto con snapshot ponderado, y reportes por agregación.

## Problem

El comerciante ganadero gestiona compras, engorde y ventas en participación con libretas y Excel. No existe una fuente central de inventario por lote ni un cálculo financiero exacto y auditable para el reparto de utilidades con terceros dueños de finca.

## Why

Centralizar el inventario por lotes y automatizar el cálculo de utilidad real, kilos ganados, porcentajes y repartos con promedios ponderados recalculados a la fecha de cada venta, con aislamiento estricto por comerciante y snapshots inmutables que protegen la historia financiera.

## Scope

Incluye: andamiaje NestJS + Drizzle + PostgreSQL/PostGIS; capa `common/` transversal (TenantGuard, filtros, interceptores); módulos `usuarios/`, terceros, fincas, contratos, compras, ventas, `UtilidadService`, ciclos, costos, reportes; suite en `./test` (unitarios, integración, e2e); documentación Swagger + Scalar; demo flow completo.

## Constraints

- Stack: NestJS + PostgreSQL + Drizzle ORM. Patrón Repositorio estricto (Controlador → Servicio → Repositorio → Drizzle). Cero lógica de negocio en controladores.
- `TenantGuard` global innegociable: inyecta `usuario_id` del JWT y todo repositorio lo exige, respaldado por RLS en PostgreSQL.
- `UtilidadService` puro: sin inyección de base de datos ni HTTP. Solo matemática. 100% testeable con unitarios.
- Costos estrictamente informativos: nunca restan de `utilidad_real`.
- Reportes solo agregan datos persistidos: prohibida lógica matemática nueva.
- Tests exclusivamente en `./test`, separados en unitarios (obligatorios para cálculos), integración y e2e.
- Snapshot ponderado inmutable en cada venta; ventas inmutables; compras bloqueadas si hay ventas; cierre automático a "cerrado"; locks transaccionales ante ventas concurrentes; PostGIS activo para fincas.
- Identificadores del dominio y mensajes de error en español. Tablas y columnas en snake_case.
- Heurística ~400 líneas por tarea es solo orientativa (advisory-only): manda el comportamiento coherente más pequeño con sus tests y docs. Nunca recortar espacios, comentarios o tests para ajustarla; nada de abstracciones gratuitas ni splits artificiales. Cada tarea incluye sus tests y docs en la misma unidad de trabajo.

---

## Checklist accionable

### Fase 0 — Base transversal

- [x] **MVP-001 — Andamiaje NestJS con TypeScript estricto y estructura modular**
  - Descripción: Inicializar el proyecto NestJS con TypeScript estricto, estructura modular (`usuarios`, `terceros`, `fincas`, `contratos`, `compras`, `ventas`, `ciclos`, `costos`, `reportes`, `common/`) y scripts `start:dev`, `test`, `lint`, `format`.
  - Aceptación: `pnpm run start:dev` levanta sin errores; `pnpm run lint && pnpm run format` en verde; estructura modular creada. Mapea a: NFR Arquitectura Modular, NFR Idioma.
  - Archivos esperados: `package.json`, `tsconfig.json`, `src/main.ts`, `src/app.module.ts`, `src/<modulo>/<modulo>.module.ts` (esqueletos), `eslint.config.*`, `.prettierrc`.
  - Checks: `pnpm run lint && pnpm run format`.

- [x] **MVP-002 — PostgreSQL + Drizzle + migraciones + PostGIS**
  - Descripción: Configurar conexión PostgreSQL, Drizzle ORM con patrón Repositorio (aislamiento del ORM), sistema de migraciones y activación verificada de la extensión PostGIS.
  - Aceptación: Migración inicial aplica sin errores; `SELECT PostGIS_version()` responde; repositorios acceden solo vía Drizzle; el diseño RLS prevé el aislamiento indirecto de FINCA vía join `finca->tercero->usuario_id` (FINCA solo tiene `tercero_id`, sin `usuario_id` directo y sin crear dicha columna). Mapea a: RF-3 (base), NFR Base de Datos y GIS, criterio de finalización PostGIS.
  - Archivos esperados: `src/db/schema/*` (FINCA con solo `tercero_id`, sin `usuario_id`), `src/db/drizzle.config.ts`, `drizzle/*.sql` (incluye base RLS con join `finca->tercero->usuario_id`), `docker-compose.yml` (postgres+postgis), `test/integracion/db-postgis.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

- [x] **MVP-003 — Capa `common/` transversal (filtros, interceptores, validación)**
  - Descripción: Implementar filtros globales de excepciones (`common/filters/`), interceptores de formateo de respuestas y logging (`common/interceptors/`), y `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`.
  - Aceptación: Error de validación retorna formato consistente en español; respuestas con formato uniforme; logs emiten por petición. Mapea a: NFR Arquitectura Modular (common/), NFR Calidad y Robustez.
  - Archivos esperados: `src/common/filters/filtro-excepciones-http.ts`, `src/common/interceptors/*.ts`, `src/main.ts` (registro global), `test/integracion/common-transversal.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

- [x] **MVP-004 — Swagger + Scalar con reflejo de DTOs**
  - Descripción: Documentar la API con Swagger y exponerla mediante Scalar, verificando que las reglas de los DTOs (requeridos, rangos, mínimos) se reflejan automáticamente.
  - Aceptación: `/docs` (Swagger) y Scalar responden; una regla de DTO (p. ej. mínimo) es visible en el esquema. Mapea a: NFR Documentación de API, criterio Scalar/Swagger.
  - Archivos esperados: `src/main.ts` (setup Swagger/Scalar), `test/e2e/docs-api.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

### Fase 1 — Autenticación, perfil y seguridad (H1)

- [ ] **MVP-005 — Registro de perfil de comerciante**
  - Descripción: Módulo `usuarios/` con registro exigiendo `nombre`, `email` y `password_hash` (hash con bcrypt/argon2, nunca texto plano), DTOs estrictos y repositorio con `usuario_id`.
  - Aceptación: Registro sin campos obligatorios retorna 400 en español; password se persiste hasheado; email duplicado se rechaza. Mapea a: H1, RF-1.
  - Archivos esperados: `src/usuarios/*` (controller, service, repository, dto, entity/schema), `test/integracion/usuarios-registro.spec.ts`, `test/e2e/usuarios.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-006 — Inicio de sesión JWT**
  - Descripción: Endpoint de login que valida credenciales y emite JWT firmado con expiración; DTOs de credenciales; errores en español sin filtrar si el usuario existe.
  - Aceptación: Credenciales válidas retornan JWT; inválidas retornan 401 en español; token expirado es rechazado en ruta protegida. Mapea a: H1.
  - Archivos esperados: `src/usuarios/*` (auth service/controller, dto-acceso, estrategia jwt), `test/integracion/usuarios-login.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs.

- [ ] **MVP-007 — TenantGuard global + RLS**
  - Descripción: `TenantGuard` global que extrae `usuario_id` del JWT, lo inyecta en la petición y obliga a cada repositorio a filtrar por él; políticas RLS por tabla de tenant (`usuario_id`) verificadas en PostgreSQL.
  - Aceptación: Petición sin token → 401; comerciante A no lee ni escribe datos del comerciante B (verificado a nivel API y a nivel SQL con RLS); 100% de rutas tocadas bajo el guard. Mapea a: H1, RF-2, RF-3, criterio ER + RLS.
  - Archivos esperados: `src/common/guards/tenant.guard.ts`, migraciones RLS (`drizzle/*-rls.sql`), `test/e2e/aislamiento-tenant.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas.

- [ ] **MVP-008 — Blindaje numérico global en DTOs**
  - Descripción: Reglas de validación que rechazan cantidades, pesos, precios o porcentajes ≤ 0 y participación fuera de 0–100 en todos los DTOs del dominio, con mensajes en español reflejados en Swagger.
  - Aceptación: Cada campo numérico con valor 0 o negativo → 400; participación 101 o negativa → 400; reglas visibles en Swagger. Mapea a: RF-6.
  - Archivos esperados: `src/<modulo>/dto/*` (decoradores `Min`, `Range`), `test/integracion/validacion-numerica.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs.

### Fase 2 — Terceros y fincas (H2)

- [ ] **MVP-009 — CRUD de terceros**
  - Descripción: CRUD de terceros exigiendo `nombre`, `documento` y `contacto`, con repositorio filtrado por `usuario_id` y controlador sin lógica.
  - Aceptación: Crear sin `documento` → 400; listar solo retorna terceros propios; DTOs en Swagger. Mapea a: H2, RF-5.
  - Archivos esperados: `src/terceros/*` (controller, service, repository, dto, schema), `test/integracion/terceros.spec.ts`, `test/e2e/terceros.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-010 — CRUD de fincas con PostGIS**
  - Descripción: CRUD de fincas exigiendo `tercero_id`, `nombre`, `direccion`, `latitud`, `longitud`, con columna geográfica PostGIS derivada de latitud/longitud y validación de rangos geográficos. FINCA solo tiene `tercero_id`, sin `usuario_id` directo (no crear dicha columna).
  - Aceptación: Finca sin `tercero_id` → 400; coordenadas fuera de rango → 400; punto espacial persistido y recuperable; finca huérfana imposible; el repositorio valida que el `tercero_id` pertenece al `usuario_id` del JWT y RLS cubre el join `finca->tercero->usuario_id`. Mapea a: H2, RF-4.
  - Archivos esperados: `src/fincas/*` (controller, service, `fincas.repository.ts` con validación `tercero_id` propio, dto, schema con geografía y sin `usuario_id`), migración PostGIS de fincas, política RLS vía join `finca->tercero->usuario_id`, `test/integracion/fincas-postgis.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-011 — Bloqueo de eliminación de terceros/fincas con contratos**
  - Descripción: Bloquear (409 en español) la eliminación de terceros o fincas con contratos vinculados, por integridad referencial a nivel servicio + restricción FK en base de datos.
  - Aceptación: Eliminar tercero/finca con contratos → 409; sin contratos → elimina correcto. Mapea a: RF-9.
  - Archivos esperados: `src/terceros/terceros.service.ts`, `src/fincas/fincas.service.ts` (guardas de borrado), `test/integracion/bloqueo-eliminacion.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

### Fase 3 — Contratos (H3)

- [ ] **MVP-012 — Esquema de contratos en Drizzle**
  - Descripción: Tabla `contratos` con FK a `tercero_id` y `finca_id`, `fecha_apertura`, `porcentaje_participacion`, `estado` ("activo"/"cerrado"), `fecha_cierre` nulable y opcionales nulables (`raza`, `peso_promedio_actual`, `cantidad_actual`, `valor_kilo_referencia`). Cada contrato equivale a un lote (relación 1-1 contrato=lote en este MVP).
  - Aceptación: Migración aplica FK y estados; contrato sin tercero o finca es rechazado por DB; opcionales aceptan nulo; cada contrato representa exactamente un lote (1-1). Mapea a: H3, RF-7 (persistencia).
  - Archivos esperados: `src/db/schema/contratos.ts`, `src/contratos/contratos.repository.ts` (patrón Repositorio: controller -> service -> `*.repository.ts` -> Drizzle, cero lógica en controller), `drizzle/*-contratos.sql`, `test/integracion/contratos-schema.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

- [ ] **MVP-013 — Apertura de contrato (endpoint)**
  - Descripción: Endpoint de apertura que exige `tercero_id`, `finca_id`, `fecha_apertura` y `porcentaje_participacion`, asigna `estado` "activo" automáticamente y acepta opcionales nulos; controlador sin lógica.
  - Aceptación: Apertura válida → 201 con estado "activo"; falta de `tercero_id`/`finca_id`/`fecha_apertura`/`porcentaje` → 400; verificado por tercero/finca de otro tenant → 404/403. Mapea a: H3, RF-7.
  - Archivos esperados: `src/contratos/*` (controller, service, repository, dto-apertura), `test/integracion/contratos-apertura.spec.ts`, `test/e2e/contratos.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-014 — Inmutabilidad del porcentaje de participación**
  - Descripción: Hacer `porcentaje_participacion` inmutable tras la apertura: el DTO de actualización lo excluye y el servicio/DB rechaza cualquier intento de cambio.
  - Aceptación: PATCH/PUT con `porcentaje_participacion` → 400 o campo ignorado verificado por test; valor persistido idéntico al de apertura. Mapea a: RF-8, fuera de alcance (sin modificación histórica).
  - Archivos esperados: `src/contratos/dto/*`, `src/contratos/contratos.service.ts`, `test/integracion/contratos-inmutabilidad.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

### Fase 4 — Compras (H4)

- [ ] **MVP-015 — Registro de compras con valor total**
  - Descripción: Registro de compras exigiendo `fecha`, `cantidad`, `peso_promedio`, `precio_kilo` y `nota`, calculando `valor_total = cantidad × peso_promedio × precio_kilo` en el backend.
  - Aceptación: Compra válida persiste `valor_total` exacto; falta de campo obligatorio → 400; valores ≤ 0 → 400. Mapea a: H4, RF-10.
  - Archivos esperados: `src/compras/*` (controller, service, repository, dto, schema), `test/integracion/compras-registro.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-016 — Fusión de compras y recálculo del promedio visible**
  - Descripción: Al fusionar una compra, sumar `cantidad` a `cantidad_actual`; si `peso_promedio_actual` es nulo, adoptar el peso de la primera compra; si existe previo, recalcular promediando inventario actual con entrantes.
  - Aceptación: Primera compra sobre contrato nulo fija el promedio; segunda compra recalcula el promedio ponderado por cantidades con precisión decimal verificada. Mapea a: H4, RF-11.
  - Archivos esperados: `src/compras/compras.service.ts`, `src/contratos/contratos.repository.ts`, `test/unitarios/fusion-promedio.spec.ts`, `test/integracion/compras-fusion.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

- [ ] **MVP-017 — Bloqueo de compras cuando hay ventas**
  - Descripción: Bloquear edición y eliminación de compras en contratos que ya poseen ventas (409 en español), protegiendo snapshot histórico y cronología.
  - Aceptación: Editar/eliminar compra con ventas existentes → 409 y dato intacto. Mapea a: H4, RF-12.
  - Archivos esperados: `src/compras/compras.service.ts` (guarda de mutabilidad), `test/integracion/compras-bloqueo.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

- [ ] **MVP-018 — Edición y reversión de compras sin ventas**
  - Descripción: Permitir editar/eliminar compras solo si el contrato aún no tiene ventas, revirtiendo algorítmicamente `cantidad_actual` y el peso del contrato.
  - Aceptación: Editar cantidad revierte y reaplica el saldo correctamente; eliminar la única compra deja `cantidad_actual` en 0 y promedio en nulo. Mapea a: H4, RF-13.
  - Archivos esperados: `src/compras/compras.service.ts`, `test/integracion/compras-reversion.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

### Fase 5 — Motor financiero y ventas (H5)

- [ ] **MVP-019 — UtilidadService: promedios ponderados a fecha**
  - Descripción: Servicio puro `UtilidadService.calcularPromediosPonderados(compras[], fechaVenta)` que filtra compras con `fecha <= fechaVenta` y aplica las fórmulas exactas de peso y precio ponderado. Sin DB ni HTTP. Tests unitarios con escenarios numéricos independientes.
  - Aceptación: Casos numéricos conocidos (incluido compra posterior a la venta que debe excluirse) dan promedios exactos; lista vacía manejada sin división por cero. Mapea a: H5, RF-17.
  - Archivos esperados: `src/ventas/utilidad.service.ts`, `test/unitarios/utilidad-promedios.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

- [ ] **MVP-020 — UtilidadService: repartos e indicadores**
  - Descripción: Funciones puras para `valor_bruto`, `valor_tercero`, `valor_comerciante`, `costo_estimado_compra`, `kilos_ganados_promedio`, `utilidad_real` y `porcentaje_utilidad` (`porcentaje_utilidad` = 0 si `costo_estimado_compra` == 0, si no (`utilidad_real` / `costo_estimado_compra`) × 100, consistente con RF-19). Tests unitarios con costo cero y utilidades negativas.
  - Aceptación: Escenario dorado verificado número a número; `costo_estimado_compra` == 0 → `porcentaje_utilidad` = 0 sin NaN ni Infinity, si no (`utilidad_real` / `costo_estimado_compra`) × 100; costos registrados no intervienen en `utilidad_real`. Mapea a: H5, RF-18, RF-19, RF-24 (no resta).
  - Archivos esperados: `src/ventas/utilidad.service.ts`, `test/unitarios/utilidad-repartos.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`.

- [ ] **MVP-021 — Registro de ventas (payload obligatorio)**
  - Descripción: Endpoint de ventas que exige `fecha`, `cantidad_vendida`, `peso_promedio_venta` y `precio_kilo_venta`; orquesta repositorios + `UtilidadService`; controlador sin lógica.
  - Aceptación: Venta válida → 201 con todos los indicadores calculados; falta de campo → 400. Mapea a: H5, RF-14.
  - Archivos esperados: `src/ventas/*` (controller, service, repository, dto-venta, schema), `test/integracion/ventas-registro.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-022 — Validaciones de inventario y cronología en ventas**
  - Descripción: Rechazar ventas con `cantidad_vendida > cantidad_actual` o con `fecha` anterior a la `fecha_apertura` o a las compras vinculadas, con mensajes en español.
  - Aceptación: Sobreventa → 422/400; fecha anterior a apertura o a compras → 422/400; inventario intacto tras cada rechazo. Mapea a: H5, RF-15.
  - Archivos esperados: `src/ventas/ventas.service.ts` (validaciones), `test/integracion/ventas-validaciones.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-023 — Snapshot ponderado inmutable por venta**
  - Descripción: Persistir en cada venta `peso_promedio_compra_pond` y `precio_kilo_compra_pond` calculados a su fecha, de modo que compras posteriores no alteren snapshots históricos.
  - Aceptación: Venta 1 guarda promedios; nueva compra + venta 2 no modifica el snapshot de la venta 1 (verificado por relectura). Mapea a: H5, RF-20.
  - Archivos esperados: `src/db/schema/ventas.ts` (columnas snapshot), `src/ventas/ventas.service.ts`, `test/integracion/ventas-snapshot.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

- [ ] **MVP-024 — Inmutabilidad total de ventas**
  - Descripción: Bloquear cualquier edición o eliminación de ventas (sin endpoints de mutación o con guardas que retornan 409/405 en español).
  - Aceptación: PATCH/PUT/DELETE sobre venta → 409/405 y registro intacto. Mapea a: H5, RF-22.
  - Archivos esperados: `src/ventas/ventas.controller.ts`, `src/ventas/ventas.service.ts`, `test/integracion/ventas-inmutabilidad.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

- [ ] **MVP-025 — Locks transaccionales ante ventas concurrentes**
  - Descripción: Envolver el registro de venta en transacción con bloqueo de fila del contrato (`SELECT ... FOR UPDATE`) para que ventas concurrentes no extraigan más que el saldo real.
  - Aceptación: Dos ventas concurrentes que suman más que `cantidad_actual` → una confirma y la otra es rechazada; saldo final nunca negativo (test de concurrencia). Mapea a: H5, RF-16.
  - Archivos esperados: `src/ventas/ventas.repository.ts` (transacción + lock), `test/integracion/ventas-concurrencia.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

- [ ] **MVP-026 — Cierre automático e integración de ventas**
  - Descripción: Cuando una venta deja `cantidad_actual` en 0, cambiar `estado` a "cerrado" con `fecha_cierre` igual a la fecha de esa venta; prueba de integración del ciclo parcial → total → cierre.
  - Aceptación: Venta parcial mantiene "activo"; venta que vacía → "cerrado" con `fecha_cierre` exacta; contrato cerrado rechaza nuevas compras/ventas. Mapea a: H5, RF-21.
  - Archivos esperados: `src/ventas/ventas.service.ts`, `src/contratos/contratos.service.ts`, `test/integracion/ventas-cierre.spec.ts`, `test/e2e/ventas.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

### Fase 6 — Ciclos, costos y reportes (H6, H7)

- [ ] **MVP-027 — CRUD de ciclos (satélite informativo)**
  - Descripción: CRUD de ciclos exigiendo `fecha`, con `peso_observado` y `notas` opcionales; edición y eliminación libres en contrato activo.
  - Aceptación: Crear sin `fecha` → 400; crear solo con fecha → 201; editar/eliminar libre incluso con ventas existentes. Mapea a: H6, RF-23, RF-25 (ciclos).
  - Archivos esperados: `src/ciclos/*` (controller, service, repository, dto, schema), `test/integracion/ciclos.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-028 — CRUD de costos informativos**
  - Descripción: CRUD de costos exigiendo `tipo` (texto libre), `monto`, `fecha` y `descripcion`; edición y eliminación libres; verificación de que ningún costo altera `utilidad_real` de ventas existentes.
  - Aceptación: Crear sin `descripcion` → 400; tras registrar costos, `utilidad_real` de ventas previas permanece idéntica. Mapea a: H6, RF-24, RF-25 (costos).
  - Archivos esperados: `src/costos/*` (controller, service, repository, dto, schema), `test/integracion/costos.spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas tocadas.

- [ ] **MVP-029 — Reportes por agregación (sin lógica nueva)**
  - Descripción: Endpoints de solo lectura que agregan datos persistidos: contratos activos, utilidades totales e historial de ventas. Sin fórmulas nuevas; reutilizan campos calculados.
  - Aceptación: Con datos sembrados, cada reporte coincide con agregación manual SQL; contrato sin ventas no aporta utilidad; todo bajo TenantGuard. Mapea a: H7, RF-26.
  - Archivos esperados: `src/reportes/*` (controller, service, repository de agregaciones), `test/integracion/reportes.spec.ts`, `test/e2e/reportes.e2e-spec.ts`.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, TenantGuard 100% rutas tocadas.

### Fase 7 — Cierre del MVP

- [ ] **MVP-030 — Cierre MVP: suite completa, docs y demo flow**
  - Descripción: Verificar la suite completa en `./test` (unitarios + integración + e2e), que Swagger/Scalar reflejen todas las reglas de DTOs, y ejecutar la demo manual sin errores: Auth → Terceros/Fincas con PostGIS → Apertura de Lote → Fusión de Compras → Ciclos/Costos → Ventas parciales/totales con recálculo a fecha → Cierre automático → Dashboard de reportes.
  - Aceptación: `pnpm run test` en verde; `pnpm run lint && pnpm run format` en verde; demo flow ejecutada y evidenciada; criterios de finalización de la spec marcados cumplidos. Mapea a: criterios de finalización, demo flow, NFR Testing Estricto.
  - Archivos esperados: `test/*` (cobertura completa), evidencia de demo (guion y resultados), este documento con progress actualizado.
  - Checks: `pnpm run test`, `pnpm run lint && pnpm run format`, validación DTOs, TenantGuard 100% rutas.

---

## Authorized scope

Puede tocar:

- `src/**` (módulos NestJS, `common/`, `db/schema/`, repositorios, DTOs, `UtilidadService`).
- `drizzle/**` y `docker-compose.yml` (migraciones, RLS, PostGIS).
- `test/**` (único lugar permitido para pruebas: `test/unitarios/`, `test/integracion/`, `test/e2e/`).
- `package.json`, `tsconfig.json`, configuración de lint/format/Swagger/Scalar.
- `odd/tasks/elinain-mvp.md` (este documento: progress y evidencia).

No puede tocar:

- Flexibilizar o retirar el `TenantGuard` global o las políticas RLS.
- Agregar lógica de negocio en controladores; mover cálculos fuera de `UtilidadService`; inyectar DB o HTTP en `UtilidadService`.
- Restar costos de `utilidad_real`; agregar lógica matemática nueva en reportes.
- Hacer mutable `porcentaje_participacion`, ventas, o snapshots ponderados.
- Crear tests fuera de `./test`; mezclar niveles de test (unitario/integración/e2e).
- Alcance fuera del MVP: facturación fiscal/PDF, ganado individual, fincas propias, bajas por muerte/robo, importación/exportación Excel.

## Acceptance criteria global

1. Los RF-1 a RF-26 están cubiertos por al menos una tarea con test que los verifica.
2. Las historias H1–H7 son demostrables extremo a extremo en el demo flow.
3. `UtilidadService` no importa base de datos ni HTTP y sus unitarios validan las fórmulas con precisión matemática.
4. Ningún costo registrado altera `utilidad_real`; ningún reporte introduce fórmulas nuevas.
5. PostGIS activo y verificado; fincas persisten punto espacial; contratos huérfanos imposibles.
6. RLS + `TenantGuard` verificados con test de aislamiento entre comerciantes.
7. Swagger + Scalar exponen todos los módulos y reflejan las reglas de los DTOs.
8. `pnpm run test` y `pnpm run lint && pnpm run format` en verde; DTOs validados; TenantGuard en el 100% de las rutas.

## Applicable checks

- `pnpm run test`
- `pnpm run lint && pnpm run format`
- Validación estricta de DTOs (casos válidos e inválidos, mensajes en español, reflejo en Swagger).
- TenantGuard cubriendo el 100% de las rutas tocadas o creadas (verificado con test de aislamiento).

## Progress

- Estado: MVP-001, MVP-002, MVP-003 y MVP-004 completadas (4/30 tareas). Base PostgreSQL+PostGIS+Drizzle + capa transversal + documentación API en verde con TDD RED->GREEN->REFACTOR evidenciado abajo.
- Siguiente tarea: MVP-005.
- Fase 0 cerrada: MVP-001 → MVP-004 completas; Fase 1+ sin tocar (sin TenantGuard, sin dominio).

## Verification evidence

- MVP-001 (2026-09-20, TDD RED->GREEN->REFACTOR):
  - RED: `pnpm run test -- test/integracion/arranque-modular.spec.ts` → FAIL (`TS2307: Cannot find module '../../src/app.module'`), suite no compila sin implementación.
  - GREEN: mismo comando → PASS (1 passed), `Test.createTestingModule` carga `AppModule` con los 10 módulos esqueleto.
  - REFACTOR: `pnpm run lint` → verde (0 errores); `pnpm run format` → `All matched files use Prettier code style!`; `pnpm run test` (suite completa) → 1 passed.
  - Runtime: `timeout 20 pnpm run start:dev` → `Nest application successfully started` + `Aplicación Elinain escuchando en el puerto 3000`, 0 errores de compilación.
  - Límite de reversión: `package.json`, `tsconfig.json`, `nest-cli.json`, `eslint.config.mjs`, `.prettierrc`, `src/**`, `test/**`; remover esos archivos devuelve el repo a su estado previo sin afectar MVP-002+ (no iniciado).

- MVP-002 (2026-09-20, TDD RED->GREEN->REFACTOR):
  - RED: `pnpm run test -- test/integracion/db-postgis.spec.ts` → FAIL (`TS2307: Cannot find module 'pg' / '../../src/db/schema/fincas' / '../../src/db/conexion'`), suite no compila sin implementación.
  - GREEN: mismo comando → PASS (4 passed); `pnpm run test` (suite completa) → 2 suites, 5 passed (incluye MVP-001).
  - REFACTOR: `pnpm run lint` → verde (0 errores); `pnpm run format` → `All matched files use Prettier code style!`.
  - DB: `docker compose ps` → `elinain-db (postgis/postgis:16-3.5) Up (healthy) 0.0.0.0:5433->5432`; `SELECT PostGIS_version()` → `3.5 USE_GEOS=1 USE_PROJ=1 USE_STATS=1` (`pg_extension postgis 3.5.2`); migración `drizzle/0000_base_rls_postgis.sql` aplica sin errores (extension + tablas + RLS + FORCE).
  - RLS: políticas `aislamiento_usuarios/terceros/fincas`; FINCA sin columna `usuario_id` (verificado `\d fincas` + test de esquema); aislamiento indirecto verificado con rol no-superusuario temporal (propio ve 1, otro tenant ve 0 en `fincas` y `terceros`; rol eliminado tras verificar). Nota: el rol superusuario propietario bypasea RLS por diseño de PostgreSQL; el enforcement permanente con rol restringido se cablea en MVP-007.
  - Decisiones: imagen `postgis/postgis:16-3.5` (tag `16-3.6` no existe en registry); host port `5433` porque `5432` lo ocupa `studyquest-postgres-1` (no se tocó); `DATABASE_URL` por defecto `postgres://elinain:elinain@localhost:5433/elinain`; `pnpm-workspace.yaml` con `onlyBuiltDependencies: [esbuild]` + `pnpm approve-builds esbuild` (pnpm 11 bloqueaba `pnpm run test` por builds ignorados de drizzle-kit).
  - Límite de reversión: `docker-compose.yml`, `pnpm-workspace.yaml`, `package.json` (deps drizzle-orm/pg + dev drizzle-kit/@types/pg), `src/db/**`, `drizzle/0000_base_rls_postgis.sql`, `test/integracion/db-postgis.spec.ts`, volumen `pgdata`; `docker compose down -v` + revertir esos archivos devuelve al estado MVP-001 sin afectar MVP-003+ (no iniciado).

- MVP-003 (2026-09-20, TDD RED->GREEN->REFACTOR)::  - RED: `pnpm run test -- test/integracion/common-transversal.spec.ts` → FAIL (`TS2307: Cannot find module 'class-validator' / '../../src/common/filters/filtro-excepciones-http' / interceptores`), suite no compila sin implementación.
  - GREEN: mismo comando → PASS (4 passed); `pnpm run test` (suite completa) → 3 suites, 9 passed (incluye MVP-001 y MVP-002).
  - REFACTOR: `pnpm run lint` → verde (0 errores, tras retirar 2 aserciones innecesarias); `pnpm run format` → `All matched files use Prettier code style!`.
  - Alcance: `src/common/filters/filtro-excepciones-http.ts` (formato `{exito:false, mensaje, errores?, codigoEstado, ruta, marcaTiempo}` en español), `src/common/interceptors/interceptor-formato-respuesta.ts` (`{exito:true, datos}`), `src/common/interceptors/interceptor-registro-peticion.ts` (log por petición vía `Logger`), `src/main.ts` (ValidationPipe global `whitelist+forbidNonWhitelisted+transform`, filtro e interceptores globales), `test/integracion/common-transversal.spec.ts` (400 español, whitelist, formato uniforme, logs), `package.json` (+`class-validator`, `class-transformer`).
  - TenantGuard: sin rutas nuevas en `src/` (controlador solo dentro del spec); `main.ts` no instala guardias; MVP-007 pendiente sin alterar.
   - Límite de reversión: `src/common/filters/filtro-excepciones-http.ts`, `src/common/interceptors/interceptor-formato-respuesta.ts`, `src/common/interceptors/interceptor-registro-peticion.ts`, `src/main.ts`, `test/integracion/common-transversal.spec.ts`, `package.json`/`pnpm-lock.yaml` (deps validación); revertirlos devuelve al estado MVP-002 sin afectar MVP-004+ (no iniciado).

- MVP-004 (2026-09-20, TDD RED->GREEN->REFACTOR):
  - RED: `pnpm run test -- test/e2e/docs-api.e2e-spec.ts` → FAIL (`TS2307: Cannot find module '@nestjs/swagger'`, `TS2305: src/main no exporta 'configurarDocumentacion'`), suite no compila sin implementación.
  - GREEN: mismo comando → PASS (3 passed: `GET /docs` 200 HTML Swagger, `GET /referencia` 200 HTML Scalar, `GET /docs-json` con `CrearEjemploDocsDto.cantidad.minimum == 1` y `required` con `cantidad`).
  - REFACTOR: `pnpm run lint` → verde (0 errores); `pnpm run format` → `All matched files use Prettier code style!`; `pnpm run test` (suite completa) → 4 suites, 12 passed (incluye MVP-001, MVP-002 y MVP-003).
  - Alcance: `src/main.ts` (`configurarDocumentacion`: `DocumentBuilder` título `Elinain API` v0.1.0, `SwaggerModule.setup('docs')`, Scalar `apiReference` en `/referencia`; `bootstrap` la invoca; arranque solo si `require.main === module` para importar el setup en tests sin efecto colateral), `test/e2e/docs-api.e2e-spec.ts` (DTO temporal de prueba con `@Min(1)` + `@ApiProperty({minimum: 1})`, sin dominio Fase 1), `test/jest-integracion.json` (testRegex admite `integracion|e2e` y sufijo `.e2e-spec.ts`; `transformIgnorePatterns` transforma solo paquetes `@scalar` ESM), `package.json` (+`@nestjs/swagger@^11`, `@scalar/nestjs-api-reference`), `pnpm-workspace.yaml` (`@scarf/scarf: false`, solo telemetría de instalación).
  - TenantGuard: sin rutas nuevas de dominio y sin guardias instaladas; MVP-007 pendiente sin alterar. Fase 1+ intacta.
  - Decisiones: `@nestjs/swagger@^11` (major gemela de NestJS 11 y CJS-compatible con ts-jest; la v12 es ESM-only y rompe el runner); Scalar servido con el middleware oficial `apiReference({ content: documento })` (receta Scalar para NestJS); ruta Scalar en español `/referencia` consistente con NFR Idioma.
  - Límite de reversión: `src/main.ts`, `test/e2e/docs-api.e2e-spec.ts`, `test/jest-integracion.json`, `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml` (deps docs); revertirlos devuelve al estado MVP-003 sin afectar MVP-005+ (no iniciado).

## Next step

Ejecutar MVP-001 (andamiaje NestJS) y luego avanzar en orden MVP-002 → MVP-030, respetando dependencias (cada fase requiere la anterior; MVP-019/MVP-020 bloquean MVP-021–MVP-026).

## Rationale de particionado

Particionado por unidad de comportamiento entregable (skill work-unit-commits): cada tarea es un comportamiento revisable con sus tests y docs incluidos, reversible sin arrastrar trabajo ajeno. El orden sigue dependencias reales (transversal → tenant/seguridad → entidades base → contratos → compras → motor puro → ventas → satélites → agregaciones → cierre). El motor financiero se aísla en dos unitarias puras (promedios y repartos) para blindar la matemática antes de cablearla a HTTP/DB. La heurística de ~400 líneas se trata como advisory-only: ningún corte sacrifica tests, comentarios o espacios, y ningún split existe solo por tamaño.

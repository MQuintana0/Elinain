# AGENTS.md — Elinain

## Proyecto

Backend en NestJS para MVP de gestión ganadera multi-tenant, centrado en contratos de participación y cálculo financiero aislado. Utiliza PostgreSQL y Drizzle ORM, garantizando el aislamiento de datos mediante Row-Level Security (RLS) a nivel de base de datos y un `TenantGuard` global en la aplicación.

## Comandos

* Ejecutar: `pnpm run start:dev`
* Tests: `pnpm run test`
* Lint/formato: `pnpm run lint && pnpm run format`

## Estilo y convenciones

* TypeScript estricto siguiendo la estructura modular de NestJS (controller → service → base de datos).


* Nombres de clases, métodos y variables en CamelCase o PascalCase; tablas y columnas en la base de datos en snake_case.
* La terminología del dominio (contratos, terceros, fincas) puede mantenerse en español para alinear con el negocio, y todos los mensajes de error o respuestas de la API deben ser en español.

## Reglas

* Lee `docs/constitution.md` y la spec activa antes de tocar código.
* La lógica del motor financiero (`UtilidadService`) debe estar estrictamente separada de los controladores HTTP y sin acceso directo a la base de datos para garantizar que sea 100% testeable.


* No alteres ni flexibilices el `TenantGuard`; el aislamiento de datos inter-comerciante por `usuario_id` es una regla de arquitectura innegociable.


* No apliques descuentos operativos al cálculo de la utilidad real; los costos registrados son puramente informativos en esta fase del producto.


* No introduzcas lógica de negocio nueva en el módulo de reportes; estos endpoints solo deben hacer agregaciones sobre datos existentes.



## Al terminar cualquier tarea

* Verifica que el `TenantGuard` esté cubriendo efectivamente el 100% de las rutas tocadas o creadas.


* Ejecuta los tests automáticos, valida de forma estricta todos los DTOs y revisa el manejo consistente de excepciones antes de dar la tarea por completada.
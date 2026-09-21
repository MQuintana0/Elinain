# Constitución — Elinain

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **Stack y Arquitectura**: Desarrolla en NestJS, PostgreSQL y Drizzle ORM. Aplica el patrón Repositorio aislando a Drizzle; cero lógica de negocio en los controladores. La API debe estar documentada obligatoriamente con Swagger y expuesta mediante Scalar.


2. **Aislamiento Multi-Tenant**: Es obligatorio usar un `TenantGuard` global que inyecte el `usuario_id` en cada petición. Todo repositorio debe exigir este ID apoyado por políticas RLS en PostgreSQL.


3. **Núcleo Financiero Puro**: Los cálculos viven únicamente en el `UtilidadService`. Este servicio no inyecta base de datos ni HTTP; es puramente matemático.


4. **Límites de Negocio**: Todo lote exige un contrato con un tercero y un porcentaje de participación inmutable. Se debe guardar el snapshot del promedio ponderado exacto al momento de cada venta.


5. **Testing Estricto**: Todo el código de pruebas debe vivir exclusivamente en el directorio `./test`. Las pruebas deben separarse de forma estricta en tests unitarios (obligatorios para cálculos numéricos), de integración y end-to-end (e2e).


6. **Calidad y Robustez**: Todo endpoint requiere validación estricta con DTOs (la cual debe reflejarse en Swagger) y un manejo consistente de excepciones en toda la aplicación.
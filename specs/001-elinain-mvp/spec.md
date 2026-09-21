### Spec 001 — MVP Backend de Elinain

#### Contexto y objetivo

Elinain es una plataforma digital SaaS orientada a la gestión integral del negocio de compra, engorde y comercialización de ganado bovino en participación. El objetivo es reemplazar las libretas y el Excel del comerciante ganadero, centralizando el inventario por lotes y automatizando el cálculo financiero exacto para el reparto de utilidades con terceros dueños de finca.

#### Usuarios / actores

**Comerciante ganadero:** Único actor del sistema en el MVP. Compra animales para engordarlos y revenderlos, operando siempre en participación con terceros dueños de finca. No hay roles adicionales.

#### Historias de usuario

* **H1:** Como comerciante quiero registrar mi perfil de usuario (nombre, email, password) e iniciar sesión de forma segura para acceder a mi entorno de trabajo.


* **H2:** Como comerciante quiero registrar terceros (con documento y contacto) y fincas (con nombre, dirección, latitud y longitud) para mapear geográficamente dónde está mi inventario.


* **H3:** Como comerciante quiero abrir un contrato capturando la fecha de apertura, asociando obligatoriamente el tercero y la finca, estableciendo un porcentaje de participación fijo y permitiendo datos opcionales de inicio para formalizar el lote.


* **H4:** Como comerciante quiero registrar compras (incluyendo fecha, cantidad, peso, precio y nota) para consolidar ingresos y fusiones de animales al lote.


* **H5:** Como comerciante quiero registrar ventas proporcionando datos de salida para que el sistema calcule mi utilidad real, kilos ganados, porcentajes y repartos basándose en el promedio ponderado recalculado a la fecha.


* **H6:** Como comerciante quiero registrar eventos de control o ciclos (con fecha, peso observado y notas opcionales) y gastos o costos informativos (con tipo libre, monto, fecha y descripción) para llevar la trazabilidad operativa.


* **H7:** Como comerciante quiero visualizar un dashboard con reportes de contratos activos, utilidades totales e historial de ventas para analizar mi rentabilidad global.



#### Requisitos funcionales (criterios de aceptación en EARS)

##### Autenticación, Perfil y Seguridad (H1, H2)

* **RF-1:** CUANDO un comerciante se registre, EL SISTEMA creará su perfil en el módulo `usuarios/` exigiendo obligatoriamente `nombre`, `email` y `password_hash`.


* **RF-2:** CUANDO el usuario consuma rutas protegidas, EL SISTEMA interceptará la petición vía `TenantGuard`, extraerá el `usuario_id` del JWT y lo inyectará globalmente para que sea exigido de forma estricta por la capa del Repositorio en cada consulta a la base de datos.


* **RF-3:** EL SISTEMA aplicará Row-Level Security (RLS) en PostgreSQL como barrera innegociable contra fugas de datos entre comerciantes.


* **RF-4:** CUANDO se registre una FINCA, EL SISTEMA exigirá obligatoriamente `tercero_id`, `nombre`, `direccion`, `latitud` y `longitud`, garantizando que todas las fincas pertenezcan a un tercero y viabilizando el almacenamiento espacial mediante la extensión PostGIS.


* **RF-5:** CUANDO se registre un TERCERO, EL SISTEMA exigirá obligatoriamente los campos `nombre`, `documento` y `contacto`.


* **RF-6:** SI el usuario envía en cualquier petición cantidades, pesos, precios o porcentajes menores o iguales a cero, o un porcentaje de participación fuera del rango de 0 a 100, ENTONCES EL SISTEMA rechazará la operación mediante los DTOs para proteger el motor financiero de valores destructivos.



##### Contratos y Mutaciones Base (H3)

* **RF-7:** CUANDO se abra un contrato, EL SISTEMA exigirá la asociación foránea con un `tercero_id` y una `finca_id`, capturará obligatoriamente la `fecha_apertura` y el `porcentaje_participacion`, asignará automáticamente el `estado` inicial como "activo", y permitirá que `raza`, `peso_promedio_actual`, `cantidad_actual` y `valor_kilo_referencia` sean nulos si no se proveen.


* **RF-8:** MIENTRAS el contrato exista, EL SISTEMA mantendrá inmutable su `porcentaje_participacion`.


* **RF-9:** SI el usuario intenta eliminar un Tercero o una Finca que ya tiene contratos vinculados, ENTONCES EL SISTEMA bloqueará la acción por integridad referencial.



##### Compras y Sincronización de Promedios (H4)

* **RF-10:** CUANDO se registre una COMPRA, EL SISTEMA exigirá los campos `fecha`, `cantidad`, `peso_promedio`, `precio_kilo` y `nota`, y calculará internamente en el backend el `valor_total` multiplicando `cantidad` × `peso_promedio` × `precio_kilo`.


* **RF-11:** CUANDO se fusione una compra a un contrato existente, EL SISTEMA sumará la `cantidad` ingresada a la `cantidad_actual` del contrato. SI el contrato tenía su `peso_promedio_actual` en nulo, tomará el peso de esta primera compra como nuevo promedio base; SI el contrato ya tenía un peso previo, recalculará matemáticamente el `peso_promedio_actual` visible promediando el inventario actual con los animales entrantes.


* **RF-12:** SI el usuario intenta editar o eliminar una COMPRA en un contrato que YA posee registros de VENTA, ENTONCES EL SISTEMA bloqueará la acción para proteger el snapshot histórico y la cronología financiera.


* **RF-13:** SI el usuario intenta editar o eliminar una COMPRA en un contrato que AÚN NO posee ventas, ENTONCES EL SISTEMA permitirá la acción y revertirá algorítmicamente el saldo en la `cantidad_actual` y el peso del contrato.



##### Motor Financiero y Ventas (H5)

* **RF-14:** CUANDO se registre una VENTA, EL SISTEMA exigirá capturar obligatoriamente desde el payload del usuario los campos `fecha`, `cantidad_vendida`, `peso_promedio_venta` y `precio_kilo_venta`.


* **RF-15:** SI el usuario intenta registrar una VENTA con una `cantidad_vendida` mayor a la `cantidad_actual` disponible, o con una `fecha` cronológicamente anterior a la `fecha_apertura` del contrato o a las fechas de sus compras vinculadas, ENTONCES EL SISTEMA rechazará la transacción para impedir desbordes de inventario o rupturas temporales.


* **RF-16:** SI ocurren peticiones de VENTA concurrentes sobre un mismo contrato, EL SISTEMA ejecutará bloqueos transaccionales (locks) en la base de datos para impedir que la sumatoria de extracciones supere el saldo real en milisegundos.


* **RF-17:** CUANDO se registre una venta, el `UtilidadService` recalculará obligatoriamente los promedios ponderados filtrando estrictamente solo las compras cuya `fecha` sea menor o igual a la `fecha` de la venta, utilizando las fórmulas exactas:
$peso\_promedio\_compra\_pond = \frac{\sum(cantidad_i \times peso\_promedio\_i)}{\sum cantidad_i}$
$precio\_kilo\_compra\_pond = \frac{\sum(cantidad_i \times peso\_promedio\_i \times precio\_kilo_i)}{\sum(cantidad_i \times peso\_promedio\_i)$.


* **RF-18:** CUANDO se ejecute la venta, EL SISTEMA calculará: `valor_bruto` (`cantidad_vendida` × `peso_promedio_venta` × `precio_kilo_venta`), `valor_tercero` (`valor_bruto` × `porcentaje_participacion`), y `valor_comerciante` (`valor_bruto` − `valor_tercero`).


* **RF-19:** CUANDO se guarde la venta, EL SISTEMA calculará y persistirá los indicadores de rendimiento: `costo_estimado_compra` (`cantidad_vendida` × `peso_promedio_compra_pond` × `precio_kilo_compra_pond`), `kilos_ganados_promedio` (`peso_promedio_venta` − `peso_promedio_compra_pond`), `utilidad_real` (`valor_comerciante` − `costo_estimado_compra`), y `porcentaje_utilidad` (si el costo es mayor a 0, `(utilidad_real / costo_estimado_compra) × 100`, de lo contrario `0` para evitar división por cero).


* **RF-20:** CUANDO se guarde la venta, EL SISTEMA registrará un snapshot inmutable de los promedios en los campos `peso_promedio_compra_pond` y `precio_kilo_compra_pond`.


* **RF-21:** SI tras una venta la `cantidad_actual` llega a 0, EL SISTEMA cambiará automáticamente el estado del contrato a "cerrado" e insertará como `fecha_cierre` la misma fecha estipulada en la transacción de venta que detonó el vaciado.


* **RF-22:** SI el usuario intenta editar o eliminar un registro de VENTA, ENTONCES EL SISTEMA bloqueará la acción, garantizando la inmutabilidad de los snapshots financieros.



##### Ciclos, Costos y Reportes (H6, H7)

* **RF-23:** CUANDO se registre un CICLO, EL SISTEMA exigirá la `fecha`, permitiendo que `peso_observado` y `notas` sean opcionales como checkpoint libre.


* **RF-24:** CUANDO se registre un COSTO, EL SISTEMA exigirá `tipo` (texto libre), `monto`, `fecha` y `descripcion`, y los persistirá de forma estrictamente informativa sin restar de la `utilidad_real` financiera.


* **RF-25:** MIENTRAS el contrato esté activo, EL SISTEMA permitirá editar o eliminar registros de CICLO y COSTO libremente, dado que son entidades satélite puramente informativas.


* **RF-26:** CUANDO el frontend consulte el módulo de reportes, EL SISTEMA devolverá agregaciones sobre contratos activos, utilidades totales e historial de ventas basándose estrictamente en los datos ya persistidos, sin introducir nueva lógica matemática.



#### Requisitos no funcionales

* **Arquitectura Modular Transversal:** Backend desarrollado en NestJS, Drizzle ORM y PostgreSQL. La capa `common/` debe incluir obligatoriamente filtros globales de excepciones (`filters/`) e interceptores para formateo de respuestas y logging (`interceptors/`).


* **Base de Datos y GIS:** PostgreSQL utilizando explícitamente la extensión **PostGIS** activa para viabilizar el almacenamiento geográfico y espacial de las fincas.


* **Patrón Repositorio y Aislamiento:** Implementación estricta del patrón Repositorio (Controlador → Servicio → Repositorio → Drizzle) aislando el ORM; cero lógica de negocio en los controladores y uso del `TenantGuard` inyectando el `usuario_id` en todas las consultas de los repositorios.


* **Testing Estricto:** Todo el código de pruebas debe vivir exclusivamente en el directorio `./test`. Las pruebas deben separarse de forma estricta en tres niveles: tests unitarios (obligatorios para validar matemáticamente el `UtilidadService` con escenarios numéricos independientes de HTTP y DB), de integración y end-to-end (e2e).


* **Documentación de API:** API documentada obligatoriamente con **Swagger** y expuesta mediante **Scalar**, reflejando automáticamente todas las reglas de validación y restricciones de los DTOs.


* **Idioma:** Código e identificadores del dominio en español.

#### Casos límite ya cubiertos

* Restricción absoluta de fincas y contratos huérfanos exigiendo llaves foráneas completas y validación espacial PostGIS (RF-4, RF-7).
* Desbordamiento lógico del porcentaje de participación protegido en rangos de 0 a 100% (RF-6).
* Datos corruptos o valores matemáticamente destructivos ($\le 0$) bloqueados de raíz mediante DTOs (RF-6).
* Sincronización robusta de inventario y recálculo visual del peso en contratos que nacen con datos nulos o con pesos previos (RF-11).
* Inconsistencia cronológica de transacciones de venta bloqueada (RF-15).
* Concurrencia (`Race Conditions`) y desbordes de `cantidad_actual` protegidos mediante bloqueos transaccionales en serie (RF-16).
* Protección del historial financiero regulando la mutabilidad de compras, ventas y entidades satélite (RF-12, RF-22, RF-25).
* Cierre automático estipulado con la fecha exacta de la venta que vació el lote (RF-21).

#### Fuera de alcance (MVP)

* Facturación formal con validez fiscal (generación de PDFs).


* Seguimiento de ganado individual (la operación es estrictamente por lote).


* Fincas propias del comerciante (todas pertenecen a terceros).


* Bajas de inventario por muerte o robo que no supongan una venta.


* Modificación histórica del porcentaje de participación.


* Migración, exportación o importación masiva en Excel.



#### Criterios de finalización

* El modelo ER completo está implementado en Drizzle, forzando todas las relaciones extranjeras y protegido estructuralmente por RLS en PostgreSQL.


* La capa `common/` aplica el `TenantGuard`, filtros e interceptores de forma transversal.


* El entorno de PostgreSQL cuenta con la extensión PostGIS activa.


* La suite de pruebas en `./test` cubre unitarias, de integración y e2e, validando con absoluta precisión matemática el motor financiero.


* La interfaz de Scalar y Swagger refleja todas las reglas de negocio de los DTOs.


* Demo manual ejecutada sin errores del flujo principal (Auth → Terceros/Fincas con PostGIS → Apertura de Lote → Fusión de Compras → Ciclos/Costos → Ventas parciales/totales con recálculo a la fecha → Cierre automático → Dashboard de reportes).

#### Dudas abiertas

* [NINGUNA] Todos los conflictos arquitectónicos, fórmulas de promedios ponderados, restricciones multi-tenant con PostGIS y reglas de concurrencia y mutabilidad han sido detectados e implementados de forma integral.
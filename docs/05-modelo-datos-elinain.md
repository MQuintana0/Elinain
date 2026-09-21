# Elinain — Modelo de datos y reglas de negocio (MVP)

Este documento complementa a `02-alcance-mvp` y `03-planificacion-stack`, dejando en texto el modelo entidad-relación y las reglas de cálculo que hasta ahora solo existían como diagramas visuales en la conversación de planificación.

## 1. Entidades y campos

### USUARIO (comerciante)
- id (PK)
- nombre
- email
- password_hash

### TERCERO (dueño de finca, socio en participación)
- id (PK)
- usuario_id (FK)
- nombre
- documento
- contacto

### FINCA (siempre de un tercero en este MVP)
- id (PK)
- tercero_id (FK)
- nombre
- direccion
- latitud
- longitud

### CONTRATO (absorbe el "lote" — 1 contrato = 1 lote en este MVP)
- id (PK)
- usuario_id (FK)
- tercero_id (FK)
- finca_id (FK)
- porcentaje_participacion (fijo durante toda la vida del contrato)
- raza (opcional al abrir)
- peso_promedio_actual (opcional al abrir)
- cantidad_actual (opcional al abrir)
- valor_kilo_referencia (opcional al abrir)
- fecha_apertura
- fecha_cierre (se llena cuando cantidad_actual llega a 0)
- estado (activo / cerrado)

### COMPRA (ingresos al contrato — incluye compra inicial y fusiones posteriores)
- id (PK)
- contrato_id (FK)
- fecha
- cantidad
- peso_promedio
- precio_kilo
- valor_total
- nota

### VENTA (salidas del contrato — puede ser parcial)
- id (PK)
- contrato_id (FK)
- fecha
- cantidad_vendida
- peso_promedio_venta
- precio_kilo_venta
- valor_bruto
- valor_tercero
- valor_comerciante
- peso_promedio_compra_pond (snapshot del promedio ponderado a la fecha de venta)
- precio_kilo_compra_pond (snapshot del promedio ponderado a la fecha de venta)
- costo_estimado_compra
- kilos_ganados_promedio
- utilidad_real
- porcentaje_utilidad

### CICLO (checkpoint libre asociado a un lote)
- id (PK)
- contrato_id (FK)
- fecha
- peso_observado
- notas

### COSTO (informativo, no afecta utilidad real)
- id (PK)
- contrato_id (FK)
- tipo (texto libre, definido por el usuario — ej. flete)
- monto
- fecha
- descripcion

## 2. Relaciones

- USUARIO 1 — N CONTRATO
- TERCERO 1 — N FINCA
- TERCERO 1 — N CONTRATO
- FINCA 1 — N CONTRATO
- CONTRATO 1 — N COMPRA
- CONTRATO 1 — N VENTA
- CONTRATO 1 — N CICLO
- CONTRATO 1 — N COSTO

## 3. Fórmulas de cálculo de utilidad (a nivel de VENTA)

Cada vez que se registra una venta:

```
promedio ponderado de compras del contrato hasta la fecha:
  peso_promedio_compra_pond = Σ(cantidad_i × peso_promedio_i) / Σ(cantidad_i)
  precio_kilo_compra_pond   = Σ(cantidad_i × peso_promedio_i × precio_kilo_i) / Σ(cantidad_i × peso_promedio_i)

valor_bruto_venta      = cantidad_vendida × peso_promedio_venta × precio_kilo_venta
costo_estimado_compra  = cantidad_vendida × peso_promedio_compra_pond × precio_kilo_compra_pond
kilos_ganados_promedio = peso_promedio_venta − peso_promedio_compra_pond

valor_tercero      = valor_bruto_venta × porcentaje_participacion
valor_comerciante  = valor_bruto_venta − valor_tercero

utilidad_real       = valor_comerciante − costo_estimado_compra
porcentaje_utilidad = (utilidad_real / costo_estimado_compra) × 100
```

**Importante:** el promedio ponderado se **recalcula en cada venta** sobre todas las compras vigentes del contrato a esa fecha (no se "congela" tras la primera venta). Por eso `peso_promedio_compra_pond` y `precio_kilo_compra_pond` se guardan como snapshot en cada fila de `VENTA`, ya que el promedio del contrato sigue cambiando después.

## 4. Reglas de negocio clave

- Todo contrato implica participación con un tercero — no existen lotes propios del comerciante en este MVP.
- El % de participación se fija al abrir el contrato y no cambia durante su vida.
- Un lote puede crecer: nuevas compras llevadas a la misma finca se registran como nuevas filas de `COMPRA` bajo el mismo `contrato_id`, sin crear un contrato nuevo.
- El contrato se cierra automáticamente cuando `cantidad_actual` llega a 0 tras una o varias ventas.
- Los costos son puramente informativos: no se descuentan del cálculo de `utilidad_real`.
- Los ciclos son eventos de control libres, sin periodicidad obligatoria ni estructura rígida — el comerciante los crea cuando lo considere útil.
- Solo el comerciante (usuario) ingresa información en este MVP; no hay roles adicionales.
- La plataforma es web, con conexión a internet requerida (sin modo offline en el MVP).

## 5. Puntos explícitamente fuera de este modelo (fase posterior)

- Historial de cambios en el % de participación.
- Tipos de "baja" de inventario distintos a la venta total del lote (muerte, robo).
- Campos adicionales que puedan surgir de recibos de compra o del documento físico del contrato real, una vez se analicen ejemplos concretos.

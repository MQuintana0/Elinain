export interface ParametrosFusionCompra {
  cantidadContrato: number | null;
  pesoPromedioContrato: number | null;
  pesosComprasExistentes: number[];
  cantidadNuevaCompra: number;
  pesoPromedioNuevaCompra: number;
}

export interface ResultadoFusionCompra {
  nuevaCantidadActual: number;
  nuevoPesoPromedioActual: number;
}

/**
 * Calcula la fusión de una compra en el inventario y peso promedio del contrato (RF-11).
 *
 * - Suma la cantidad de la compra a la cantidad actual del contrato.
 * - Si el peso_promedio_actual del contrato es nulo y no hay compras previas,
 *   adopta el peso de esta primera compra como nuevo promedio base.
 * - Si ya existían compras previas, recalcula el promedio simple entre todos
 *   los registros de compra vigentes del contrato, sin ponderar por cantidad.
 * - Si el contrato nació con peso previo sin compras, promedia dicho peso con la compra entrante.
 */
export function calcularFusionCompra(parametros: ParametrosFusionCompra): ResultadoFusionCompra {
  const {
    cantidadContrato,
    pesoPromedioContrato,
    pesosComprasExistentes,
    cantidadNuevaCompra,
    pesoPromedioNuevaCompra,
  } = parametros;

  const nuevaCantidadActual = (cantidadContrato ?? 0) + cantidadNuevaCompra;

  let nuevoPesoPromedioActual: number;

  if (pesosComprasExistentes.length === 0) {
    if (pesoPromedioContrato === null || pesoPromedioContrato === undefined) {
      nuevoPesoPromedioActual = pesoPromedioNuevaCompra;
    } else {
      nuevoPesoPromedioActual = (pesoPromedioContrato + pesoPromedioNuevaCompra) / 2;
    }
  } else {
    const todosLosPesos = [...pesosComprasExistentes, pesoPromedioNuevaCompra];
    const suma = todosLosPesos.reduce((acumulado, peso) => acumulado + peso, 0);
    nuevoPesoPromedioActual = suma / todosLosPesos.length;
  }

  // Redondear a 4 cifras decimales para evitar artefactos de coma flotante
  const factor = 10000;
  const pesoRedondeado = Math.round(nuevoPesoPromedioActual * factor) / factor;

  return {
    nuevaCantidadActual,
    nuevoPesoPromedioActual: pesoRedondeado,
  };
}

export interface ParametrosReversionEliminacion {
  cantidadContrato: number | null;
  cantidadCompraEliminada: number;
  pesosComprasRestantes: number[];
}

export interface ResultadoReversionCompra {
  nuevaCantidadActual: number;
  nuevoPesoPromedioActual: number | null;
}

/**
 * Revierte el saldo y peso del contrato tras eliminar una compra (RF-13).
 * Si no quedan compras, cantidad pasa a 0 y peso_promedio_actual pasa a null.
 */
export function calcularReversionEliminacionCompra(
  parametros: ParametrosReversionEliminacion,
): ResultadoReversionCompra {
  const { cantidadContrato, cantidadCompraEliminada, pesosComprasRestantes } = parametros;

  const nuevaCantidad = Math.max(0, (cantidadContrato ?? 0) - cantidadCompraEliminada);

  if (pesosComprasRestantes.length === 0) {
    return {
      nuevaCantidadActual: 0,
      nuevoPesoPromedioActual: null,
    };
  }

  const suma = pesosComprasRestantes.reduce((acumulado, peso) => acumulado + peso, 0);
  const promedio = suma / pesosComprasRestantes.length;
  const factor = 10000;
  const pesoRedondeado = Math.round(promedio * factor) / factor;

  return {
    nuevaCantidadActual: nuevaCantidad,
    nuevoPesoPromedioActual: pesoRedondeado,
  };
}

export interface ParametrosReversionEdicion {
  cantidadContrato: number | null;
  cantidadViejaCompra: number;
  cantidadNuevaCompra: number;
  pesosActualizados: number[];
}

/**
 * Revierte y reaplica el saldo y peso del contrato tras editar una compra (RF-13).
 */
export function calcularReversionEdicionCompra(
  parametros: ParametrosReversionEdicion,
): ResultadoReversionCompra {
  const { cantidadContrato, cantidadViejaCompra, cantidadNuevaCompra, pesosActualizados } =
    parametros;

  const nuevaCantidad = Math.max(
    0,
    (cantidadContrato ?? 0) - cantidadViejaCompra + cantidadNuevaCompra,
  );

  if (pesosActualizados.length === 0) {
    return {
      nuevaCantidadActual: nuevaCantidad,
      nuevoPesoPromedioActual: null,
    };
  }

  const suma = pesosActualizados.reduce((acumulado, peso) => acumulado + peso, 0);
  const promedio = suma / pesosActualizados.length;
  const factor = 10000;
  const pesoRedondeado = Math.round(promedio * factor) / factor;

  return {
    nuevaCantidadActual: nuevaCantidad,
    nuevoPesoPromedioActual: pesoRedondeado,
  };
}

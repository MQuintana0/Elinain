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

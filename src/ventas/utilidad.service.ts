import { Injectable } from '@nestjs/common';

export interface CompraParaPromedio {
  fecha: string | Date;
  peso_promedio: number;
  precio_kilo: number;
}

export interface PromediosSimplesCompra {
  peso_promedio_compra_simple: number;
  precio_compra_por_animal_promedio: number;
  compras_computadas: number;
}

export interface ParametrosCalculoVenta {
  cantidad_vendida: number;
  peso_promedio_venta: number;
  precio_kilo_venta: number;
  peso_promedio_compra_simple: number;
  precio_compra_por_animal_promedio: number;
  porcentaje_comerciante: number;
  porcentaje_tercero: number;
}

export interface IndicadoresVenta {
  valor_bruto: number;
  costo_estimado_compra: number;
  utilidad_total: number;
  valor_comerciante: number;
  valor_tercero: number;
  kilos_ganados_promedio: number;
  utilidad_real: number;
  porcentaje_utilidad_total: number;
}

/**
 * Función auxiliar para redondear a N cifras decimales evitando artefactos de punto flotante.
 */
function redondear(valor: number, decimales = 4): number {
  const factor = Math.pow(10, decimales);
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/**
 * Servicio puramente matemático para el cálculo del motor financiero de Elinain (Principio 3).
 *
 * No inyecta conexión a base de datos, repositorios ni servicios HTTP.
 * Aplica de forma estricta las reglas RF-17, RF-18, RF-19 y RF-24.
 */
@Injectable()
export class UtilidadService {
  /**
   * Calcula el promedio simple de compras vigentes con fecha <= fechaVenta (RF-17).
   *
   * peso_promedio_compra_simple = Σ(peso_promedio_i) / número_de_compras
   * precio_compra_por_animal_promedio = Σ(peso_promedio_i × precio_kilo_i) / número_de_compras
   */
  calcularPromediosSimples(
    compras: CompraParaPromedio[],
    fechaVenta: string | Date,
  ): PromediosSimplesCompra {
    const timestampLimite = new Date(fechaVenta).getTime();

    const comprasFiltradas = compras.filter(
      (compra) => new Date(compra.fecha).getTime() <= timestampLimite,
    );

    if (comprasFiltradas.length === 0) {
      return {
        peso_promedio_compra_simple: 0,
        precio_compra_por_animal_promedio: 0,
        compras_computadas: 0,
      };
    }

    const n = comprasFiltradas.length;
    const sumaPesos = comprasFiltradas.reduce(
      (acumulado, compra) => acumulado + compra.peso_promedio,
      0,
    );
    const sumaValorAnimal = comprasFiltradas.reduce(
      (acumulado, compra) => acumulado + compra.peso_promedio * compra.precio_kilo,
      0,
    );

    const pesoPromedioSimple = redondear(sumaPesos / n, 4);
    const precioCompraPorAnimalPromedio = redondear(sumaValorAnimal / n, 4);

    return {
      peso_promedio_compra_simple: pesoPromedioSimple,
      precio_compra_por_animal_promedio: precioCompraPorAnimalPromedio,
      compras_computadas: n,
    };
  }

  /**
   * Calcula el valor bruto, costo estimado, utilidad total, repartos según contrato e indicadores (RF-18, RF-19, RF-24).
   *
   * valor_bruto = cantidad_vendida × peso_promedio_venta × precio_kilo_venta
   * costo_estimado_compra = cantidad_vendida × precio_compra_por_animal_promedio
   * utilidad_total = valor_bruto − costo_estimado_compra
   * valor_comerciante = utilidad_total × (porcentaje_comerciante / 100)  [utilidad real]
   * valor_tercero = utilidad_total × (porcentaje_tercero / 100)
   * kilos_ganados_promedio = peso_promedio_venta − peso_promedio_compra_simple
   * porcentaje_utilidad_total = costo_estimado_compra > 0 ? (utilidad_total / costo_estimado_compra) * 100 : 0
   */
  calcularIndicadoresVenta(parametros: ParametrosCalculoVenta): IndicadoresVenta {
    const {
      cantidad_vendida,
      peso_promedio_venta,
      precio_kilo_venta,
      peso_promedio_compra_simple,
      precio_compra_por_animal_promedio,
      porcentaje_comerciante,
      porcentaje_tercero,
    } = parametros;

    const valorBruto = redondear(cantidad_vendida * peso_promedio_venta * precio_kilo_venta, 2);
    const costoEstimadoCompra = redondear(cantidad_vendida * precio_compra_por_animal_promedio, 2);
    const utilidadTotal = redondear(valorBruto - costoEstimadoCompra, 2);

    const factorComerciante = porcentaje_comerciante / 100;
    const factorTercero = porcentaje_tercero / 100;

    const valorComerciante = redondear(utilidadTotal * factorComerciante, 2);
    const valorTercero = redondear(utilidadTotal * factorTercero, 2);

    const kilosGanadosPromedio = redondear(peso_promedio_venta - peso_promedio_compra_simple, 4);

    const porcentajeUtilidadTotal =
      costoEstimadoCompra > 0 ? redondear((utilidadTotal / costoEstimadoCompra) * 100, 4) : 0;

    return {
      valor_bruto: valorBruto,
      costo_estimado_compra: costoEstimadoCompra,
      utilidad_total: utilidadTotal,
      valor_comerciante: valorComerciante,
      valor_tercero: valorTercero,
      kilos_ganados_promedio: kilosGanadosPromedio,
      utilidad_real: valorComerciante,
      porcentaje_utilidad_total: porcentajeUtilidadTotal,
    };
  }
}

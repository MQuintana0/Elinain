import { UtilidadService } from '../../src/ventas/utilidad.service';

describe('UtilidadService — Utilidad total, repartos e indicadores (MVP-020 / RF-18, RF-19, RF-24)', () => {
  let servicio: UtilidadService;

  beforeEach(() => {
    servicio = new UtilidadService();
  });

  it('calcula con exactitud el escenario dorado de referencia (55% / 45%)', () => {
    // Escenario dorado especificado en 06-cambio-formula-utilidad-elinain.md:
    // - Promedio simple de compra por animal: 1.950.000
    // - Peso promedio compra simple: 300 kg
    // - Venta de 1 animal: peso 350 kg, precio/kilo 6.000 -> Bruto = 2.100.000
    // - Costo estimado: 1 * 1.950.000 = 1.950.000
    // - Utilidad total: 2.100.000 - 1.950.000 = 150.000
    // - Reparto 55% comerciante / 45% tercero:
    //   - comerciante: 82.500
    //   - tercero: 67.500
    //   - utilidad_real: 82.500
    //   - kilos_ganados_promedio: 350 - 300 = 50 kg
    //   - porcentaje_utilidad_total: (150.000 / 1.950.000) * 100 = 7.6923%
    const resultado = servicio.calcularIndicadoresVenta({
      cantidad_vendida: 1,
      peso_promedio_venta: 350,
      precio_kilo_venta: 6000,
      peso_promedio_compra_simple: 300,
      precio_compra_por_animal_promedio: 1950000,
      porcentaje_comerciante: 55,
      porcentaje_tercero: 45,
    });

    expect(resultado.valor_bruto).toBe(2100000);
    expect(resultado.costo_estimado_compra).toBe(1950000);
    expect(resultado.utilidad_total).toBe(150000);
    expect(resultado.valor_comerciante).toBe(82500);
    expect(resultado.valor_tercero).toBe(67500);
    expect(resultado.utilidad_real).toBe(82500);
    expect(resultado.kilos_ganados_promedio).toBe(50);
    expect(resultado.porcentaje_utilidad_total).toBe(7.6923);
  });

  it('calcula correctamente una venta por lote de múltiples animales (ej. 20 novillos)', () => {
    // 20 novillos vendidos
    // Peso venta: 420 kg, Precio venta: $9.000/kg -> Bruto por animal: 3.780.000, Total: 75.600.000
    // Compra simple promedio: 320 kg, $2.400.000 por animal -> Costo estimado: 20 * 2.400.000 = 48.000.000
    // Utilidad total: 75.600.000 - 48.000.000 = 27.600.000
    // Participación: 60% comerciante / 40% tercero
    //   - comerciante: 27.600.000 * 0.60 = 16.560.000
    //   - tercero: 27.600.000 * 0.40 = 11.040.000
    //   - kilos ganados promedio: 420 - 320 = 100 kg
    //   - % utilidad: (27.600.000 / 48.000.000) * 100 = 57.5%
    const resultado = servicio.calcularIndicadoresVenta({
      cantidad_vendida: 20,
      peso_promedio_venta: 420,
      precio_kilo_venta: 9000,
      peso_promedio_compra_simple: 320,
      precio_compra_por_animal_promedio: 2400000,
      porcentaje_comerciante: 60,
      porcentaje_tercero: 40,
    });

    expect(resultado.valor_bruto).toBe(75600000);
    expect(resultado.costo_estimado_compra).toBe(48000000);
    expect(resultado.utilidad_total).toBe(27600000);
    expect(resultado.valor_comerciante).toBe(165600000 * 0.1); // 16,560,000
    expect(resultado.valor_tercero).toBe(11040000);
    expect(resultado.utilidad_real).toBe(16560000);
    expect(resultado.kilos_ganados_promedio).toBe(100);
    expect(resultado.porcentaje_utilidad_total).toBe(57.5);
  });

  it('maneja costo estimado cero sin arrojar NaN ni Infinity, fijando porcentaje en 0', () => {
    const resultado = servicio.calcularIndicadoresVenta({
      cantidad_vendida: 5,
      peso_promedio_venta: 300,
      precio_kilo_venta: 8000,
      peso_promedio_compra_simple: 0,
      precio_compra_por_animal_promedio: 0, // Costo cero
      porcentaje_comerciante: 50,
      porcentaje_tercero: 50,
    });

    expect(resultado.costo_estimado_compra).toBe(0);
    expect(resultado.utilidad_total).toBe(12000000); // 5 * 300 * 8000
    expect(resultado.porcentaje_utilidad_total).toBe(0);
    expect(Number.isFinite(resultado.porcentaje_utilidad_total)).toBe(true);
    expect(Number.isNaN(resultado.porcentaje_utilidad_total)).toBe(false);
  });

  it('maneja utilidades negativas (pérdida financiera) repartiendo la pérdida proporcionalmente', () => {
    // 10 animales vendidos a pérdida
    // Bruto: 10 * 300 * 6000 = 18.000.000
    // Costo estimado: 10 * 2.000.000 = 20.000.000
    // Utilidad total: -2.000.000
    // 60% comerciante: -1.200.000
    // 40% tercero: -800.000
    // % utilidad: (-2.000.000 / 20.000.000) * 100 = -10%
    const resultado = servicio.calcularIndicadoresVenta({
      cantidad_vendida: 10,
      peso_promedio_venta: 300,
      precio_kilo_venta: 6000,
      peso_promedio_compra_simple: 320,
      precio_compra_por_animal_promedio: 2000000,
      porcentaje_comerciante: 60,
      porcentaje_tercero: 40,
    });

    expect(resultado.valor_bruto).toBe(18000000);
    expect(resultado.costo_estimado_compra).toBe(20000000);
    expect(resultado.utilidad_total).toBe(-2000000);
    expect(resultado.valor_comerciante).toBe(-1200000);
    expect(resultado.valor_tercero).toBe(-800000);
    expect(resultado.utilidad_real).toBe(-1200000);
    expect(resultado.kilos_ganados_promedio).toBe(-20);
    expect(resultado.porcentaje_utilidad_total).toBe(-10);
  });
});

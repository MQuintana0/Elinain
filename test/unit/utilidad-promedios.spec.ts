import { UtilidadService } from '../../src/ventas/utilidad.service';

describe('UtilidadService — Promedios simples a la fecha (MVP-019 / RF-17)', () => {
  let servicio: UtilidadService;

  beforeEach(() => {
    servicio = new UtilidadService();
  });

  it('retorna ceros cuando no hay compras registradas en el contrato (evita división por cero)', () => {
    const resultado = servicio.calcularPromediosSimples([], '2026-09-21T12:00:00.000Z');

    expect(resultado).toEqual({
      peso_promedio_compra_simple: 0,
      precio_compra_por_animal_promedio: 0,
      compras_computadas: 0,
    });
  });

  it('excluye compras con fecha posterior a la fecha de la venta', () => {
    const compras = [
      {
        fecha: '2026-09-10T10:00:00.000Z',
        peso_promedio: 300,
        precio_kilo: 8000, // 300 * 8000 = 2,400,000 por animal
      },
      {
        fecha: '2026-09-25T10:00:00.000Z', // POSTERIOR a la venta
        peso_promedio: 400,
        precio_kilo: 9000,
      },
    ];

    const fechaVenta = '2026-09-20T10:00:00.000Z';
    const resultado = servicio.calcularPromediosSimples(compras, fechaVenta);

    expect(resultado.compras_computadas).toBe(1);
    expect(resultado.peso_promedio_compra_simple).toBe(300);
    expect(resultado.precio_compra_por_animal_promedio).toBe(2400000);
  });

  it('calcula el promedio simple no ponderado entre múltiples compras a la fecha', () => {
    // Escenario: 2 compras antes de la venta
    // Compra 1: peso 300 kg, precio/kg $7.000 -> valor por animal: 2.100.000
    // Compra 2: peso 350 kg, precio/kg $8.000 -> valor por animal: 2.800.000
    // Promedio simple peso: (300 + 350) / 2 = 325 kg
    // Promedio simple precio por animal: (2.100.000 + 2.800.000) / 2 = 2.450.000
    const compras = [
      {
        fecha: '2026-09-01T08:00:00.000Z',
        peso_promedio: 300,
        precio_kilo: 7000,
      },
      {
        fecha: '2026-09-15T08:00:00.000Z',
        peso_promedio: 350,
        precio_kilo: 8000,
      },
    ];

    const fechaVenta = '2026-09-20T08:00:00.000Z';
    const resultado = servicio.calcularPromediosSimples(compras, fechaVenta);

    expect(resultado.compras_computadas).toBe(2);
    expect(resultado.peso_promedio_compra_simple).toBe(325);
    expect(resultado.precio_compra_por_animal_promedio).toBe(2450000);
  });

  it('incluye compras con fecha exactamente igual a la fecha de la venta (fecha <= fechaVenta)', () => {
    const fechaExacta = '2026-09-21T10:00:00.000Z';
    const compras = [
      {
        fecha: fechaExacta,
        peso_promedio: 320,
        precio_kilo: 8500, // 320 * 8500 = 2,720,000
      },
    ];

    const resultado = servicio.calcularPromediosSimples(compras, fechaExacta);

    expect(resultado.compras_computadas).toBe(1);
    expect(resultado.peso_promedio_compra_simple).toBe(320);
    expect(resultado.precio_compra_por_animal_promedio).toBe(2720000);
  });

  it('redondea con precisión a 4 decimales para promedios periódicos inexactos', () => {
    // 3 compras: 310, 320, 345
    // Promedio simple peso: (310 + 320 + 345) / 3 = 975 / 3 = 325
    // Precios:
    // C1: 310 * 8100 = 2,511,000
    // C2: 320 * 8200 = 2,624,000
    // C3: 345 * 8300 = 2,863,500
    // Suma: 7,998,500 / 3 = 2,666,166.6667
    const compras = [
      { fecha: '2026-09-01T08:00:00.000Z', peso_promedio: 310, precio_kilo: 8100 },
      { fecha: '2026-09-02T08:00:00.000Z', peso_promedio: 320, precio_kilo: 8200 },
      { fecha: '2026-09-03T08:00:00.000Z', peso_promedio: 345, precio_kilo: 8300 },
    ];

    const resultado = servicio.calcularPromediosSimples(compras, '2026-09-05T08:00:00.000Z');

    expect(resultado.compras_computadas).toBe(3);
    expect(resultado.peso_promedio_compra_simple).toBe(325);
    expect(resultado.precio_compra_por_animal_promedio).toBe(2666166.6667);
  });
});

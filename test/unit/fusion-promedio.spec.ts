import { calcularFusionCompra } from '../../src/compras/calculo-fusion';

describe('Cálculo de fusión de compras y promedio simple (MVP-016 / RF-11)', () => {
  it('fija el promedio base cuando el contrato nace con peso nulo y no hay compras previas', () => {
    const resultado = calcularFusionCompra({
      cantidadContrato: null,
      pesoPromedioContrato: null,
      pesosComprasExistentes: [],
      cantidadNuevaCompra: 20,
      pesoPromedioNuevaCompra: 300,
    });

    expect(resultado.nuevaCantidadActual).toBe(20);
    expect(resultado.nuevoPesoPromedioActual).toBe(300);
  });

  it('fija el promedio base cuando el contrato tiene cantidad en 0 y peso nulo', () => {
    const resultado = calcularFusionCompra({
      cantidadContrato: 0,
      pesoPromedioContrato: null,
      pesosComprasExistentes: [],
      cantidadNuevaCompra: 15,
      pesoPromedioNuevaCompra: 310.5,
    });

    expect(resultado.nuevaCantidadActual).toBe(15);
    expect(resultado.nuevoPesoPromedioActual).toBe(310.5);
  });

  it('recalcula el promedio simple entre compras sin ponderar por cantidad (segunda compra)', () => {
    // Compra 1 previa: 5 animales de 300 kg
    // Compra 2 nueva:  50 animales de 360 kg
    // Si fuera ponderado: (5*300 + 50*360) / 55 = 19500 / 55 = 354.54 kg
    // Siendo promedio simple (RF-11): (300 + 360) / 2 = 330 kg
    const resultado = calcularFusionCompra({
      cantidadContrato: 5,
      pesoPromedioContrato: 300,
      pesosComprasExistentes: [300],
      cantidadNuevaCompra: 50,
      pesoPromedioNuevaCompra: 360,
    });

    expect(resultado.nuevaCantidadActual).toBe(55);
    expect(resultado.nuevoPesoPromedioActual).toBe(330);
  });

  it('recalcula el promedio simple con tres compras de pesos distintos', () => {
    // Compras existentes: 300 kg y 360 kg
    // Nueva compra: 390 kg
    // Promedio simple: (300 + 360 + 390) / 3 = 1050 / 3 = 350 kg
    const resultado = calcularFusionCompra({
      cantidadContrato: 55,
      pesoPromedioContrato: 330,
      pesosComprasExistentes: [300, 360],
      cantidadNuevaCompra: 10,
      pesoPromedioNuevaCompra: 390,
    });

    expect(resultado.nuevaCantidadActual).toBe(65);
    expect(resultado.nuevoPesoPromedioActual).toBe(350);
  });

  it('promedia con el peso previo de apertura si el contrato nació con peso y no tenía compras previas', () => {
    // Contrato con peso de apertura 280 kg, sin compras previas
    // Nueva compra: 320 kg
    // Promedio: (280 + 320) / 2 = 300 kg
    const resultado = calcularFusionCompra({
      cantidadContrato: 10,
      pesoPromedioContrato: 280,
      pesosComprasExistentes: [],
      cantidadNuevaCompra: 10,
      pesoPromedioNuevaCompra: 320,
    });

    expect(resultado.nuevaCantidadActual).toBe(20);
    expect(resultado.nuevoPesoPromedioActual).toBe(300);
  });

  it('mantiene precisión decimal redondeada a 4 cifras en divisiones periódicas', () => {
    // (310.25 + 325.5 + 340.1) / 3 = 975.85 / 3 = 325.2833333... -> 325.2833
    const resultado = calcularFusionCompra({
      cantidadContrato: 30,
      pesoPromedioContrato: 317.875,
      pesosComprasExistentes: [310.25, 325.5],
      cantidadNuevaCompra: 10,
      pesoPromedioNuevaCompra: 340.1,
    });

    expect(resultado.nuevaCantidadActual).toBe(40);
    expect(resultado.nuevoPesoPromedioActual).toBe(325.2833);
  });
});

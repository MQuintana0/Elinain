import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPorcentaje,
  ApiPrecioPositivo,
  SumaPorcentajesCien,
} from '../../src/common/validacion/validadores-numericos';

class NumerosDto {
  @ApiCantidadPositiva()
  cantidad!: number;

  @ApiPesoPositivo()
  peso!: number;

  @ApiPrecioPositivo()
  precio!: number;

  @ApiPorcentaje()
  porcentaje!: number;
}

class PorcentajesDto {
  @ApiPorcentaje()
  porcentaje_comerciante!: number;

  @ApiPorcentaje()
  @SumaPorcentajesCien()
  porcentaje_tercero!: number;
}

async function validar(valores: Partial<NumerosDto>) {
  const dto = Object.assign(new NumerosDto(), valores);
  return validate(dto);
}

async function validarPorcentajes(valores: Partial<PorcentajesDto>) {
  const dto = Object.assign(new PorcentajesDto(), valores);
  return validate(dto);
}

describe('Validadores numéricos reutilizables (MVP-008)', () => {
  it.each([
    ['cantidad', 0],
    ['cantidad', -1],
    ['peso', 0],
    ['peso', -0.01],
    ['precio', 0],
    ['precio', -10],
  ])('rechaza %s=%s cuando no es estrictamente positivo', async (campo, valor) => {
    const errores = await validar({
      cantidad: 1,
      peso: 1,
      precio: 1,
      porcentaje: 50,
      [campo]: valor,
    });

    expect(errores.map((error) => error.property)).toContain(campo);
  });

  it.each([0, 100])('acepta porcentaje límite %s', async (porcentaje) => {
    await expect(validar({ cantidad: 1, peso: 1, precio: 1, porcentaje })).resolves.toHaveLength(0);
  });

  it.each([-0.01, 100.01])('rechaza porcentaje fuera de 0–100: %s', async (porcentaje) => {
    const errores = await validar({ cantidad: 1, peso: 1, precio: 1, porcentaje });

    expect(errores.map((error) => error.property)).toContain('porcentaje');
  });

  it('publica en Swagger los límites numéricos del contrato', () => {
    const propiedades = ['cantidad', 'peso', 'precio', 'porcentaje'] as const;
    for (const propiedad of propiedades) {
      const metadata = Reflect.getMetadata(
        'swagger/apiModelProperties',
        NumerosDto.prototype,
        propiedad,
      ) as { minimum?: number; maximum?: number; exclusiveMinimum?: boolean };
      expect(metadata).toBeDefined();
      if (propiedad === 'porcentaje') {
        expect(metadata.minimum).toBe(0);
        expect(metadata.maximum).toBe(100);
      } else {
        expect(metadata.minimum).toBe(0);
        expect(metadata.exclusiveMinimum).toBe(true);
      }
    }
  });

  describe('SumaPorcentajesCien', () => {
    it.each([
      [60, 40],
      [50, 50],
      [100, 0],
      [0, 100],
      [70.5, 29.5],
    ])('acepta porcentajes que suman exactamente 100: %s + %s', async (pComerciante, pTercero) => {
      const errores = await validarPorcentajes({
        porcentaje_comerciante: pComerciante,
        porcentaje_tercero: pTercero,
      });
      expect(errores).toHaveLength(0);
    });

    it.each([
      [60, 60],
      [40, 30],
      [99.9, 0],
      [50, 50.1],
    ])('rechaza porcentajes que no suman 100: %s + %s', async (pComerciante, pTercero) => {
      const errores = await validarPorcentajes({
        porcentaje_comerciante: pComerciante,
        porcentaje_tercero: pTercero,
      });
      expect(errores.map((e) => e.property)).toContain('porcentaje_tercero');
      const mensaje = errores
        .flatMap((e) => Object.values(e.constraints ?? {}))
        .find((m) => m.includes('100'));
      expect(mensaje).toBe(
        'La suma del porcentaje del comerciante y el porcentaje del tercero debe ser exactamente igual a 100',
      );
    });
  });
});

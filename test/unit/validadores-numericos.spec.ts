import 'reflect-metadata';
import { validate } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPorcentaje,
  ApiPrecioPositivo,
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

async function validar(valores: Partial<NumerosDto>) {
  const dto = Object.assign(new NumerosDto(), valores);
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
});

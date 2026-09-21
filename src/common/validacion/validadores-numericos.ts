import { applyDecorators } from '@nestjs/common';
import { ApiProperty, type ApiPropertyOptions } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';

const MENSAJE_NUMERO = 'El valor debe ser un número válido';

function propiedadNumerica(
  opciones: ApiPropertyOptions,
  validadores: PropertyDecorator[],
): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ type: Number, ...opciones }),
    IsNumber({ allowInfinity: false, allowNaN: false }, { message: MENSAJE_NUMERO }),
    ...validadores,
  );
}

export function ApiCantidadPositiva(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return propiedadNumerica(
    {
      description: 'Cantidad estrictamente mayor que cero',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    },
    [IsPositive({ message: 'La cantidad debe ser mayor que cero' })],
  );
}

export function ApiPesoPositivo(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return propiedadNumerica(
    {
      description: 'Peso estrictamente mayor que cero',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    },
    [IsPositive({ message: 'El peso debe ser mayor que cero' })],
  );
}

export function ApiPrecioPositivo(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return propiedadNumerica(
    {
      description: 'Precio estrictamente mayor que cero',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    },
    [IsPositive({ message: 'El precio debe ser mayor que cero' })],
  );
}

export function ApiPorcentaje(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return propiedadNumerica(
    {
      description: 'Porcentaje entre 0 y 100, ambos incluidos',
      minimum: 0,
      maximum: 100,
      ...opciones,
    },
    [
      Min(0, { message: 'El porcentaje no puede ser menor que cero' }),
      Max(100, { message: 'El porcentaje no puede ser mayor que cien' }),
    ],
  );
}

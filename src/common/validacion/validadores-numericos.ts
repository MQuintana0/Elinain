import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, type ApiPropertyOptions } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';

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

export function ApiMontoPositivo(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return propiedadNumerica(
    {
      description: 'Monto estrictamente mayor que cero',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    },
    [IsPositive({ message: 'El monto debe ser mayor que cero' })],
  );
}

export function ApiPesoOpcionalPositivo(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      type: Number,
      description: 'Peso estrictamente mayor que cero (opcional)',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    }),
    IsOptional(),
    IsNumber({ allowInfinity: false, allowNaN: false }, { message: MENSAJE_NUMERO }),
    IsPositive({ message: 'El peso debe ser mayor que cero' }),
  );
}

export function ApiMontoOpcionalPositivo(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  return applyDecorators(
    ApiPropertyOptional({
      type: Number,
      description: 'Monto estrictamente mayor que cero (opcional)',
      minimum: 0,
      exclusiveMinimum: true,
      ...opciones,
    }),
    IsOptional(),
    IsNumber({ allowInfinity: false, allowNaN: false }, { message: MENSAJE_NUMERO }),
    IsPositive({ message: 'El monto debe ser mayor que cero' }),
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

@ValidatorConstraint({ name: 'sumaPorcentajesCien', async: false })
export class SumaPorcentajesCienConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const objeto = args.object as {
      porcentaje_comerciante?: unknown;
      porcentaje_tercero?: unknown;
    };
    if (
      typeof objeto.porcentaje_comerciante !== 'number' ||
      typeof objeto.porcentaje_tercero !== 'number'
    ) {
      return true;
    }
    return Math.abs(objeto.porcentaje_comerciante + objeto.porcentaje_tercero - 100) < 0.0001;
  }

  defaultMessage(): string {
    return 'La suma del porcentaje del comerciante y el porcentaje del tercero debe ser exactamente igual a 100';
  }
}

export function SumaPorcentajesCien(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (target: object, propertyName: string | symbol): void {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: SumaPorcentajesCienConstraint,
    });
  };
}

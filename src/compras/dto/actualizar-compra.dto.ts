import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPrecioPositivo,
} from '../../common/validacion/validadores-numericos';

export class ActualizarCompraDto {
  @ApiPropertyOptional({
    description: 'Fecha y hora de la compra en formato ISO 8601',
    example: '2026-09-21T10:30:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  fecha?: string;

  @ApiCantidadPositiva({
    description: 'Cantidad de animales comprados (entero estrictamente mayor que cero)',
    example: 30,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  cantidad?: number;

  @ApiPesoPositivo({
    description: 'Peso promedio por animal en kilogramos (estrictamente mayor que cero)',
    example: 325.0,
    required: false,
  })
  @IsOptional()
  peso_promedio?: number;

  @ApiPrecioPositivo({
    description: 'Precio por kilogramo en moneda local (estrictamente mayor que cero)',
    example: 8600,
    required: false,
  })
  @IsOptional()
  precio_kilo?: number;

  @ApiPropertyOptional({
    description: 'Nota descriptiva u observaciones de la compra',
    example: 'Ajuste de peso por pesaje verificado en báscula',
  })
  @IsOptional()
  @IsString({ message: 'La nota debe ser un texto' })
  @IsNotEmpty({ message: 'La nota no puede estar vacía si se proporciona' })
  nota?: string;
}

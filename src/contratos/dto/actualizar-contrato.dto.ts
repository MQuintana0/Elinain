import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPrecioPositivo,
} from '../../common/validacion/validadores-numericos';

export class ActualizarContratoDto {
  @ApiPropertyOptional({
    description: 'Estado del contrato',
    enum: ['activo', 'cerrado'],
    example: 'cerrado',
  })
  @IsOptional()
  @IsIn(['activo', 'cerrado'], { message: 'El estado debe ser "activo" o "cerrado"' })
  estado?: 'activo' | 'cerrado';

  @ApiPropertyOptional({
    description: 'Fecha y hora de cierre del contrato en formato ISO 8601',
    example: '2026-12-31T18:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha_cierre debe ser una fecha ISO 8601 válida' })
  fecha_cierre?: string;

  @ApiPropertyOptional({
    description: 'Raza o cruce del lote',
    example: 'Gyr Lechero',
  })
  @IsOptional()
  @IsString({ message: 'La raza debe ser un texto' })
  @IsNotEmpty({ message: 'La raza no puede estar vacía' })
  raza?: string;

  @ApiPesoPositivo({
    description: 'Peso promedio actual de los animales en kg',
    example: 410.0,
    required: false,
  })
  @IsOptional()
  peso_promedio_actual?: number;

  @ApiCantidadPositiva({
    description: 'Cantidad actual de cabezas de ganado',
    example: 35,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'La cantidad actual debe ser un número entero' })
  cantidad_actual?: number;

  @ApiPrecioPositivo({
    description: 'Valor por kilo de referencia',
    example: 9000.0,
    required: false,
  })
  @IsOptional()
  valor_kilo_referencia?: number;
}

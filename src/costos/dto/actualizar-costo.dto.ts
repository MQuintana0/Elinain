import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiMontoOpcionalPositivo } from '../../common/validacion/validadores-numericos';

export class ActualizarCostoDto {
  @ApiPropertyOptional({
    description: 'Tipo o categoría libre del costo',
    example: 'flete',
  })
  @IsOptional()
  @IsString({ message: 'El tipo debe ser un texto' })
  tipo?: string;

  @ApiMontoOpcionalPositivo({
    description: 'Monto del costo estrictamente mayor que cero',
    example: 480000,
  })
  monto?: number;

  @ApiPropertyOptional({
    description: 'Fecha en que se incurrió el costo en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  fecha?: string;

  @ApiPropertyOptional({
    description: 'Descripción detallada del gasto',
    example: 'Transporte de novillos con peajes adicionales incluidos',
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  descripcion?: string;
}

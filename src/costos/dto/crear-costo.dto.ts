import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiMontoPositivo } from '../../common/validacion/validadores-numericos';

export class CrearCostoDto {
  @ApiProperty({
    description: 'Identificador UUID del contrato al que se asocia el costo informativo',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El contrato_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El contrato_id es obligatorio' })
  contrato_id!: string;

  @ApiProperty({
    description:
      'Tipo o categoría libre del costo (ej. flete, alimentación, medicina, veterinaria)',
    example: 'flete',
  })
  @IsString({ message: 'El tipo debe ser un texto' })
  @IsNotEmpty({ message: 'El tipo es obligatorio' })
  tipo!: string;

  @ApiMontoPositivo({
    description: 'Monto del costo estrictamente mayor que cero (informativo)',
    example: 450000,
  })
  @IsNotEmpty({ message: 'El monto es obligatorio' })
  monto!: number;

  @ApiProperty({
    description: 'Fecha en que se incurrió el costo en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiProperty({
    description: 'Descripción detallada del gasto u observación operativa',
    example: 'Transporte de novillos en camión desde subasta hasta finca',
  })
  @IsString({ message: 'La descripción debe ser un texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion!: string;
}

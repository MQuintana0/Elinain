import { ApiProperty } from '@nestjs/swagger';

export class CostoRespuestaDto {
  @ApiProperty({
    description: 'Identificador único del costo (UUID)',
    example: 'a0b1c2d3-e4f5-4a5b-8c9d-0e1f2a3b4c5d',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador del contrato vinculado',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Tipo o categoría libre del costo',
    example: 'flete',
  })
  tipo!: string;

  @ApiProperty({
    description: 'Monto en moneda local',
    example: 450000,
    type: Number,
  })
  monto!: number;

  @ApiProperty({
    description: 'Fecha en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Descripción del gasto',
    example: 'Transporte de novillos en camión desde subasta hasta finca',
  })
  descripcion!: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class CompraRespuestaDto {
  @ApiProperty({
    description: 'Identificador único de la compra',
    example: 'd3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador UUID del contrato al que pertenece la compra',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha y hora de la compra en formato ISO 8601',
    example: '2026-09-21T10:00:00.000Z',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Cantidad de animales comprados',
    example: 25,
  })
  cantidad!: number;

  @ApiProperty({
    description: 'Peso promedio por animal en kilogramos',
    example: 320.5,
  })
  peso_promedio!: number;

  @ApiProperty({
    description: 'Precio por kilogramo pagado',
    example: 8500,
  })
  precio_kilo!: number;

  @ApiProperty({
    description:
      'Valor total de la compra calculado en el backend (cantidad × peso_promedio × precio_kilo)',
    example: 68106250,
  })
  valor_total!: number;

  @ApiProperty({
    description: 'Nota descriptiva u observaciones de la compra',
    example: 'Compra de 25 novillos en subasta ganadera',
  })
  nota!: string;
}

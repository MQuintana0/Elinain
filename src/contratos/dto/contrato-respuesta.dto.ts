import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContratoRespuestaDto {
  @ApiProperty({
    description: 'Identificador único UUID del contrato',
    example: 'd3eedd77-7a0c-4ff6-995d-4aa7ac160b44',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador UUID del tercero socio en participación',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  tercero_id!: string;

  @ApiProperty({
    description: 'Identificador UUID de la finca asociada',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  finca_id!: string;

  @ApiProperty({
    description: 'Fecha de apertura del contrato en formato ISO 8601 con zona horaria',
    example: '2026-09-21T10:00:00.000Z',
  })
  fecha_apertura!: string;

  @ApiProperty({
    description: 'Porcentaje de participación del comerciante (0 a 100)',
    example: 60,
  })
  porcentaje_comerciante!: number;

  @ApiProperty({
    description: 'Porcentaje de participación del tercero (0 a 100)',
    example: 40,
  })
  porcentaje_tercero!: number;

  @ApiProperty({
    description: 'Estado del contrato',
    enum: ['activo', 'cerrado'],
    example: 'activo',
  })
  estado!: string;

  @ApiPropertyOptional({
    description: 'Fecha de cierre del contrato cuando el inventario llega a cero',
    example: null,
    nullable: true,
  })
  fecha_cierre!: string | null;

  @ApiPropertyOptional({
    description: 'Raza o cruce del lote de ganado',
    example: 'Brahman Blanco',
    nullable: true,
  })
  raza!: string | null;

  @ApiPropertyOptional({
    description: 'Peso promedio actual de los animales en kilogramos',
    example: 350.5,
    nullable: true,
  })
  peso_promedio_actual!: number | null;

  @ApiPropertyOptional({
    description: 'Cantidad actual de cabezas de ganado en el lote',
    example: 50,
    nullable: true,
  })
  cantidad_actual!: number | null;

  @ApiPropertyOptional({
    description: 'Valor por kilo de referencia pactado',
    example: 8500.0,
    nullable: true,
  })
  valor_kilo_referencia!: number | null;
}

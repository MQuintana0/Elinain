import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CicloRespuestaDto {
  @ApiProperty({
    description: 'Identificador único del ciclo (UUID)',
    example: 'a0b1c2d3-e4f5-4a5b-8c9d-0e1f2a3b4c5d',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador del contrato vinculado',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha del checkpoint en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  fecha!: string;

  @ApiPropertyOptional({
    description: 'Peso observado en kilogramos o null si no fue medido',
    example: 380.5,
    type: Number,
  })
  peso_observado!: number | null;

  @ApiPropertyOptional({
    description: 'Notas u observaciones registradas',
    example: 'Buen rebrote de pasturas, sin signos de enfermedad',
    type: String,
  })
  notas!: string | null;
}

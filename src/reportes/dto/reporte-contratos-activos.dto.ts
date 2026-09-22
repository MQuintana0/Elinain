import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContratoActivoDetalleDto {
  @ApiProperty({
    description: 'Identificador único del contrato (UUID)',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Identificador del tercero socio',
    example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  tercero_id!: string;

  @ApiProperty({
    description: 'Nombre del tercero socio dueño de la finca',
    example: 'Juan Pérez Ganadero',
  })
  tercero_nombre!: string;

  @ApiProperty({
    description: 'Identificador de la finca geolocalizada',
    example: 'f1f2f3f4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
  })
  finca_id!: string;

  @ApiProperty({
    description: 'Nombre de la finca',
    example: 'Finca La Esperanza',
  })
  finca_nombre!: string;

  @ApiProperty({
    description: 'Fecha de apertura del contrato en formato ISO 8601',
    example: '2026-09-21T10:00:00.000Z',
  })
  fecha_apertura!: string;

  @ApiProperty({
    description: 'Porcentaje de participación del comerciante',
    example: 60,
  })
  porcentaje_comerciante!: number;

  @ApiProperty({
    description: 'Porcentaje de participación del tercero',
    example: 40,
  })
  porcentaje_tercero!: number;

  @ApiProperty({
    description: 'Cantidad actual de animales vivos en el lote',
    example: 35,
  })
  cantidad_actual!: number;

  @ApiPropertyOptional({
    description: 'Peso promedio actual del lote en kg',
    example: 385.5,
    type: Number,
  })
  peso_promedio_actual!: number | null;

  @ApiProperty({
    description: 'Cantidad total de compras o fusiones registradas en el contrato',
    example: 2,
  })
  total_compras!: number;

  @ApiProperty({
    description: 'Cantidad total de ventas parciales registradas en el contrato',
    example: 1,
  })
  total_ventas!: number;

  @ApiProperty({
    description: 'Utilidad real generada y acumulada por el comerciante en este contrato',
    example: 3450000.0,
  })
  utilidad_generada_comerciante!: number;
}

export class ReporteContratosActivosDto {
  @ApiProperty({
    description: 'Listado de contratos actualmente activos con sus métricas agregadas',
    type: [ContratoActivoDetalleDto],
  })
  contratos!: ContratoActivoDetalleDto[];
}

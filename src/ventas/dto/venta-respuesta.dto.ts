import { ApiProperty } from '@nestjs/swagger';

export class VentaRespuestaDto {
  @ApiProperty({
    description: 'Identificador único UUID de la venta',
    example: 'd3f2c510-7411-4820-94f3-23a968600a98',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador UUID del contrato al que pertenece la venta',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha y hora de la venta en formato ISO 8601',
    example: '2026-09-21T15:00:00.000Z',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Cantidad de animales vendidos',
    example: 20,
  })
  cantidad_vendida!: number;

  @ApiProperty({
    description: 'Peso promedio por animal en la venta en kilogramos',
    example: 410.5,
  })
  peso_promedio_venta!: number;

  @ApiProperty({
    description: 'Precio por kilogramo en la venta',
    example: 9200,
  })
  precio_kilo_venta!: number;

  @ApiProperty({
    description:
      'Valor bruto obtenido en la venta (cantidad_vendida × peso_promedio_venta × precio_kilo_venta)',
    example: 75532000,
  })
  valor_bruto!: number;

  @ApiProperty({
    description:
      'Snapshot inmutable del precio de compra por animal promedio simple a la fecha de la venta',
    example: 2400000,
  })
  precio_compra_por_animal_promedio!: number;

  @ApiProperty({
    description: 'Snapshot inmutable del peso promedio simple de compra a la fecha de la venta',
    example: 320,
  })
  peso_promedio_compra_simple!: number;

  @ApiProperty({
    description:
      'Costo estimado de compra para los animales vendidos (cantidad_vendida × precio_compra_por_animal_promedio)',
    example: 48000000,
  })
  costo_estimado_compra!: number;

  @ApiProperty({
    description:
      'Utilidad total generada por el lote vendido (valor_bruto − costo_estimado_compra)',
    example: 27532000,
  })
  utilidad_total!: number;

  @ApiProperty({
    description:
      'Participación asignada al comerciante según contrato (utilidad_total × % comerciante)',
    example: 16519200,
  })
  valor_comerciante!: number;

  @ApiProperty({
    description: 'Participación asignada al tercero según contrato (utilidad_total × % tercero)',
    example: 11012800,
  })
  valor_tercero!: number;

  @ApiProperty({
    description:
      'Kilos ganados promedio por animal (peso_promedio_venta − peso_promedio_compra_simple)',
    example: 90.5,
  })
  kilos_ganados_promedio!: number;

  @ApiProperty({
    description:
      'Utilidad real neta del comerciante (igual a valor_comerciante; costos informativos no restan)',
    example: 16519200,
  })
  utilidad_real!: number;

  @ApiProperty({
    description:
      'Porcentaje de utilidad total del lote vendido ((utilidad_total / costo_estimado_compra) × 100)',
    example: 57.3583,
  })
  porcentaje_utilidad_total!: number;
}

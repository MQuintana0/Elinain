import { ApiProperty } from '@nestjs/swagger';

export class ResumenHistorialVentasDto {
  @ApiProperty({
    description: 'Total de transacciones de venta registradas',
    example: 5,
  })
  total_ventas!: number;

  @ApiProperty({
    description: 'Total de cabezas de ganado vendidas',
    example: 65,
  })
  total_animales_vendidos!: number;

  @ApiProperty({
    description: 'Ingreso bruto acumulado de todas las ventas',
    example: 185000000.0,
  })
  valor_bruto_acumulado!: number;

  @ApiProperty({
    description: 'Costo estimado acumulado de compra',
    example: 135000000.0,
  })
  costo_estimado_acumulado!: number;

  @ApiProperty({
    description: 'Utilidad total acumulada del negocio',
    example: 50000000.0,
  })
  utilidad_total_acumulada!: number;

  @ApiProperty({
    description: 'Utilidad acumulada percibida por el comerciante',
    example: 30000000.0,
  })
  utilidad_comerciante_acumulada!: number;

  @ApiProperty({
    description: 'Utilidad acumulada repartida a los terceros socios',
    example: 20000000.0,
  })
  utilidad_terceros_acumulada!: number;
}

export class VentaHistorialItemDto {
  @ApiProperty({
    description: 'Identificador único de la venta (UUID)',
    example: 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a',
  })
  venta_id!: string;

  @ApiProperty({
    description: 'Identificador del contrato correspondiente',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha de la venta en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  fecha!: string;

  @ApiProperty({
    description: 'Cantidad de animales vendidos en la transacción',
    example: 10,
  })
  cantidad_vendida!: number;

  @ApiProperty({
    description: 'Peso promedio de salida en kg',
    example: 410.5,
  })
  peso_promedio_venta!: number;

  @ApiProperty({
    description: 'Precio por kilo pactado en la venta',
    example: 9200,
  })
  precio_kilo_venta!: number;

  @ApiProperty({
    description: 'Valor bruto obtenido en la venta',
    example: 37766000.0,
  })
  valor_bruto!: number;

  @ApiProperty({
    description: 'Costo estimado de compra según promedio simple a la fecha',
    example: 25000000.0,
  })
  costo_estimado_compra!: number;

  @ApiProperty({
    description: 'Utilidad total antes del reparto',
    example: 12766000.0,
  })
  utilidad_total!: number;

  @ApiProperty({
    description: 'Parte de la ganancia correspondiente al comerciante (utilidad real)',
    example: 7659600.0,
  })
  valor_comerciante!: number;

  @ApiProperty({
    description: 'Parte de la ganancia correspondiente al tercero socio',
    example: 5106400.0,
  })
  valor_tercero!: number;

  @ApiProperty({
    description: 'Kilos promedio ganados por animal durante el ciclo',
    example: 95.5,
  })
  kilos_ganados_promedio!: number;

  @ApiProperty({
    description: 'Rentabilidad porcentual obtenida en la venta',
    example: 51.06,
  })
  porcentaje_utilidad_total!: number;
}

export class ReporteHistorialVentasDto {
  @ApiProperty({
    description: 'Resumen agregado de las ventas',
    type: ResumenHistorialVentasDto,
  })
  resumen!: ResumenHistorialVentasDto;

  @ApiProperty({
    description: 'Detalle de cada venta con sus snapshots persistidos',
    type: [VentaHistorialItemDto],
  })
  ventas!: VentaHistorialItemDto[];
}

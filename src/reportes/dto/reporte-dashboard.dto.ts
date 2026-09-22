import { ApiProperty } from '@nestjs/swagger';

export class ResumenDashboardDto {
  @ApiProperty({
    description: 'Número de contratos actualmente activos',
    example: 3,
  })
  contratos_activos!: number;

  @ApiProperty({
    description: 'Número de contratos cerrados',
    example: 2,
  })
  contratos_cerrados!: number;

  @ApiProperty({
    description: 'Total acumulado de animales en inventario en contratos activos',
    example: 85,
  })
  total_animales_actual!: number;

  @ApiProperty({
    description: 'Utilidad total bruta acumulada de todas las ventas del comerciante',
    example: 12500000.0,
  })
  utilidad_total_acumulada!: number;

  @ApiProperty({
    description: 'Utilidad real neta acumulada correspondiente al comerciante',
    example: 7500000.0,
  })
  utilidad_real_comerciante_acumulada!: number;

  @ApiProperty({
    description: 'Utilidad total acumulada correspondiente a terceros socios',
    example: 5000000.0,
  })
  utilidad_terceros_acumulada!: number;

  @ApiProperty({
    description: 'Total acumulado de costos operativos informativos registrados',
    example: 1200000.0,
  })
  total_costos_informativos!: number;

  @ApiProperty({
    description: 'Cantidad total de transacciones de venta registradas',
    example: 4,
  })
  total_ventas_registradas!: number;
}

export class ReporteDashboardDto {
  @ApiProperty({
    description: 'Resumen consolidado de indicadores clave para el dashboard',
    type: ResumenDashboardDto,
  })
  resumen!: ResumenDashboardDto;
}

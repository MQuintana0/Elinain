import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsUUID } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPrecioPositivo,
} from '../../common/validacion/validadores-numericos';

export class CrearVentaDto {
  @ApiProperty({
    description: 'Identificador UUID del contrato del que se extrae la venta',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El contrato_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El contrato_id es obligatorio' })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha y hora de la venta en formato ISO 8601',
    example: '2026-09-21T15:00:00.000Z',
  })
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiCantidadPositiva({
    description: 'Cantidad de animales vendidos (entero estrictamente mayor que cero)',
    example: 20,
  })
  @IsInt({ message: 'La cantidad vendida debe ser un número entero' })
  @IsNotEmpty({ message: 'La cantidad vendida es obligatoria' })
  cantidad_vendida!: number;

  @ApiPesoPositivo({
    description: 'Peso promedio por animal vendido en kilogramos (estrictamente mayor que cero)',
    example: 410.5,
  })
  @IsNotEmpty({ message: 'El peso_promedio_venta es obligatorio' })
  peso_promedio_venta!: number;

  @ApiPrecioPositivo({
    description: 'Precio por kilogramo en moneda local en la venta (estrictamente mayor que cero)',
    example: 9200,
  })
  @IsNotEmpty({ message: 'El precio_kilo_venta es obligatorio' })
  precio_kilo_venta!: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPrecioPositivo,
} from '../../common/validacion/validadores-numericos';

export class CrearCompraDto {
  @ApiProperty({
    description: 'Identificador UUID del contrato al que se asocia la compra',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El contrato_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El contrato_id es obligatorio' })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha y hora de la compra en formato ISO 8601',
    example: '2026-09-21T10:00:00.000Z',
  })
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiCantidadPositiva({
    description: 'Cantidad de animales comprados (entero estrictamente mayor que cero)',
    example: 25,
  })
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  cantidad!: number;

  @ApiPesoPositivo({
    description: 'Peso promedio por animal en kilogramos (estrictamente mayor que cero)',
    example: 320.5,
  })
  @IsNotEmpty({ message: 'El peso_promedio es obligatorio' })
  peso_promedio!: number;

  @ApiPrecioPositivo({
    description: 'Precio por kilogramo en moneda local (estrictamente mayor que cero)',
    example: 8500,
  })
  @IsNotEmpty({ message: 'El precio_kilo es obligatorio' })
  precio_kilo!: number;

  @ApiProperty({
    description: 'Nota o descripción de la compra (procedencia, lote, observaciones)',
    example: 'Compra de 25 novillos en subasta ganadera',
  })
  @IsString({ message: 'La nota debe ser un texto' })
  @IsNotEmpty({ message: 'La nota es obligatoria' })
  nota!: string;
}

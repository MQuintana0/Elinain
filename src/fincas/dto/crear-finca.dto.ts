import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Max, Min } from 'class-validator';

export class CrearFincaDto {
  @ApiProperty({
    description: 'Identificador UUID del tercero propietario de la finca',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El tercero_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El tercero_id es obligatorio' })
  tercero_id!: string;

  @ApiProperty({
    description: 'Nombre de la finca',
    example: 'Hacienda La Esperanza',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @ApiProperty({
    description: 'Dirección o vereda de ubicación',
    example: 'Vereda El Porvenir, Km 14 Vía Montería',
  })
  @IsString({ message: 'La dirección debe ser un texto' })
  @IsNotEmpty({ message: 'La dirección es obligatoria' })
  direccion!: string;

  @ApiProperty({
    description: 'Latitud geográfica (-90 a 90)',
    example: 8.754321,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'La latitud debe ser un número válido' })
  @Min(-90, { message: 'La latitud no puede ser menor a -90' })
  @Max(90, { message: 'La latitud no puede ser mayor a 90' })
  latitud!: number;

  @ApiProperty({
    description: 'Longitud geográfica (-180 a 180)',
    example: -75.881234,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'La longitud debe ser un número válido' })
  @Min(-180, { message: 'La longitud no puede ser menor a -180' })
  @Max(180, { message: 'La longitud no puede ser mayor a 180' })
  longitud!: number;
}

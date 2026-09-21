import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class ActualizarFincaDto {
  @ApiPropertyOptional({
    description: 'Nombre de la finca',
    example: 'Hacienda La Gran Esperanza',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Dirección o vereda',
    example: 'Vereda El Porvenir, Sector 2',
  })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser un texto' })
  @IsNotEmpty({ message: 'La dirección no puede estar vacía' })
  direccion?: string;

  @ApiPropertyOptional({
    description: 'Latitud geográfica (-90 a 90)',
    example: 8.765432,
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La latitud debe ser un número válido' })
  @Min(-90, { message: 'La latitud no puede ser menor a -90' })
  @Max(90, { message: 'La latitud no puede ser mayor a 90' })
  latitud?: number;

  @ApiPropertyOptional({
    description: 'Longitud geográfica (-180 a 180)',
    example: -75.876543,
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La longitud debe ser un número válido' })
  @Min(-180, { message: 'La longitud no puede ser menor a -180' })
  @Max(180, { message: 'La longitud no puede ser mayor a 180' })
  longitud?: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ActualizarTerceroDto {
  @ApiPropertyOptional({
    description: 'Nombre completo o razón social del tercero',
    example: 'Juan Pérez Ganadería Renovada',
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Número de documento de identidad o NIT',
    example: '900123456-8',
  })
  @IsOptional()
  @IsString({ message: 'El documento debe ser un texto' })
  @IsNotEmpty({ message: 'El documento no puede estar vacío' })
  documento?: string;

  @ApiPropertyOptional({
    description: 'Información de contacto actualizada',
    example: '+57 311 987 6543',
  })
  @IsOptional()
  @IsString({ message: 'El contacto debe ser un texto' })
  @IsNotEmpty({ message: 'El contacto no puede estar vacío' })
  contacto?: string;
}

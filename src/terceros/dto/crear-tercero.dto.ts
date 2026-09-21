import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CrearTerceroDto {
  @ApiProperty({
    description: 'Nombre completo o razón social del tercero',
    example: 'Juan Pérez Ganadería S.A.S.',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @ApiProperty({
    description: 'Número de documento de identidad o NIT',
    example: '900123456-7',
  })
  @IsString({ message: 'El documento debe ser un texto' })
  @IsNotEmpty({ message: 'El documento es obligatorio' })
  documento!: string;

  @ApiProperty({
    description: 'Información de contacto (teléfono, email, dirección)',
    example: '+57 300 123 4567',
  })
  @IsString({ message: 'El contacto debe ser un texto' })
  @IsNotEmpty({ message: 'El contacto es obligatorio' })
  contacto!: string;
}

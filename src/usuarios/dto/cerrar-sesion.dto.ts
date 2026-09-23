import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CerrarSesionDto {
  @ApiProperty({
    description: 'Token de refresco de la sesión que se desea cerrar',
    example: '4a6b29f9c0e4818a38a7c29e19d7b42c676d1...',
  })
  @IsString({ message: 'El token de refresco debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token de refresco es obligatorio' })
  tokenRefresco!: string;
}

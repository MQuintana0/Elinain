import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RefrescarTokenDto {
  @ApiProperty({
    description: 'Token de refresco emitido en el login o en el último refresh',
    example: '4a6b29f9c0e4818a38a7c29e19d7b42c676d1...',
    minLength: 32,
  })
  @IsString({ message: 'El token de refresco debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token de refresco es obligatorio' })
  @MinLength(32, { message: 'El token de refresco debe tener al menos 32 caracteres' })
  tokenRefresco!: string;
}

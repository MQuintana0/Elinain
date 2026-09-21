// DTO de entrada para el inicio de sesión (MVP-006, H1).
// Solo exige presencia y formato de email: la contraseña NO lleva MinLength
// a propósito — una clave corta o errónea responde 401 genérico
// ('Credenciales inválidas'), nunca 400, para no revelar nada sobre la
// cuenta antes de comparar el hash.
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CredencialesAccesoDto {
  @ApiProperty({
    description: 'Correo electrónico del comerciante',
    example: 'maria@ejemplo.com',
  })
  @IsEmail({}, { message: 'El email debe ser un correo válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña del comerciante',
    example: 'Secreto123',
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password!: string;
}

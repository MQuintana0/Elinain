// DTO de entrada para el registro del perfil de comerciante (MVP-005, RF-1).
// El cliente envía `password` en texto plano por HTTPS; el servicio la
// convierte a `password_hash` con bcrypt antes de persistir. Nunca se acepta
// `password_hash` desde fuera (lo bloquea el ValidationPipe global).
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CrearUsuarioDto {
  @ApiProperty({ description: 'Nombre del comerciante', example: 'María Quintero' })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  nombre!: string;

  @ApiProperty({
    description: 'Correo electrónico único del comerciante',
    example: 'maria@ejemplo.com',
  })
  @IsEmail({}, { message: 'El email debe ser un correo válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email!: string;

  @ApiProperty({
    description: 'Contraseña en texto plano (se almacena con hash bcrypt, nunca en claro)',
    example: 'Secreto123',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password!: string;
}

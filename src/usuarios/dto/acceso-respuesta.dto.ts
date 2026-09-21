// DTO de salida del inicio de sesión (MVP-006, H1).
// El campo del token se llama `tokenAcceso` (camelCase español, coherente
// con el dominio del repo) y viaja junto al perfil mínimo `usuario`, que
// reutiliza UsuarioRegistradoDto: jamás incluye password ni password_hash.
import { ApiProperty } from '@nestjs/swagger';
import { UsuarioRegistradoDto } from './usuario-registrado.dto';

export class AccesoRespuestaDto {
  @ApiProperty({
    description: 'JWT de acceso firmado con expiración (usar como Bearer)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  tokenAcceso!: string;

  @ApiProperty({
    description: 'Perfil mínimo del comerciante autenticado',
    type: UsuarioRegistradoDto,
  })
  usuario!: UsuarioRegistradoDto;
}

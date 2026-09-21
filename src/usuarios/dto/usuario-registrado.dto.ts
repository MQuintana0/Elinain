// DTO de salida del registro (MVP-005, RF-1).
// Expone solo identidad pública: jamás incluye password ni password_hash.
import { ApiProperty } from '@nestjs/swagger';

export class UsuarioRegistradoDto {
  @ApiProperty({
    description: 'Identificador único del comerciante',
    example: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
  })
  id!: string;

  @ApiProperty({ description: 'Nombre del comerciante', example: 'María Quintero' })
  nombre!: string;

  @ApiProperty({ description: 'Correo electrónico del comerciante', example: 'maria@ejemplo.com' })
  email!: string;
}

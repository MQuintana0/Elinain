import { ApiProperty } from '@nestjs/swagger';

export class TerceroRespuestaDto {
  @ApiProperty({
    description: 'Identificador único UUID del tercero',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador único UUID del comerciante propietario',
    example: 'b1ffcd88-8b0a-3ef7-aa5c-5aa8ac270a22',
  })
  usuario_id!: string;

  @ApiProperty({
    description: 'Nombre completo o razón social del tercero',
    example: 'Juan Pérez Ganadería S.A.S.',
  })
  nombre!: string;

  @ApiProperty({
    description: 'Número de documento de identidad o NIT',
    example: '900123456-7',
  })
  documento!: string;

  @ApiProperty({
    description: 'Información de contacto',
    example: '+57 300 123 4567',
  })
  contacto!: string;
}

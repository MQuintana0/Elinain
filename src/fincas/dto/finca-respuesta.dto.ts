import { ApiProperty } from '@nestjs/swagger';

export class FincaRespuestaDto {
  @ApiProperty({
    description: 'Identificador único UUID de la finca',
    example: 'c2eedd77-7a0c-4ff6-995d-4aa7ac160b33',
  })
  id!: string;

  @ApiProperty({
    description: 'Identificador UUID del tercero propietario',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  tercero_id!: string;

  @ApiProperty({
    description: 'Nombre de la finca',
    example: 'Hacienda La Esperanza',
  })
  nombre!: string;

  @ApiProperty({
    description: 'Dirección o vereda de ubicación',
    example: 'Vereda El Porvenir, Km 14 Vía Montería',
  })
  direccion!: string;

  @ApiProperty({
    description: 'Latitud geográfica',
    example: 8.754321,
  })
  latitud!: number;

  @ApiProperty({
    description: 'Longitud geográfica',
    example: -75.881234,
  })
  longitud!: number;
}

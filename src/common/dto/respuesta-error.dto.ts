import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RespuestaErrorDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa (siempre false en respuestas de error)',
    example: false,
  })
  exito!: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del error en español',
    example: 'Error de validación en la petición: El campo es obligatorio',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Lista detallada de restricciones o errores de validación',
    example: ['El campo es obligatorio'],
    type: [String],
  })
  errores?: string[];

  @ApiProperty({
    description: 'Código de estado HTTP de la respuesta de error',
    example: 400,
  })
  codigoEstado!: number;

  @ApiProperty({
    description: 'Ruta URL donde ocurrió el error',
    example: '/api/v1/recurso',
  })
  ruta!: string;

  @ApiProperty({
    description: 'Marca de tiempo en formato ISO 8601 en que ocurrió el error',
    example: '2026-09-21T16:00:00.000Z',
  })
  marcaTiempo!: string;
}

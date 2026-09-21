import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa (siempre false en respuestas de error)',
    example: false,
  })
  exito!: boolean;

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

export class RespuestaErrorValidacionDto extends BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del fallo de validación',
    example: 'Error de validación en la petición: El email debe ser un correo válido',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Lista detallada de restricciones de validación no cumplidas',
    example: ['El email debe ser un correo válido'],
    type: [String],
  })
  errores?: string[];

  @ApiProperty({
    description: 'Código de estado HTTP 400 (Bad Request)',
    example: 400,
  })
  codigoEstado!: number;
}

export class RespuestaErrorNoAutorizadoDto extends BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del fallo de autenticación',
    example: 'No autorizado: token JWT ausente o credenciales inválidas',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Lista descriptiva del motivo de no autorización',
    example: ['Credenciales de acceso inválidas'],
    type: [String],
  })
  errores?: string[];

  @ApiProperty({
    description: 'Código de estado HTTP 401 (Unauthorized)',
    example: 401,
  })
  codigoEstado!: number;
}

export class RespuestaErrorNoEncontradoDto extends BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del recurso no encontrado',
    example: 'Recurso no encontrado',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Detalle del recurso no encontrado',
    example: ['Recurso no encontrado'],
    type: [String],
  })
  errores?: string[];

  @ApiProperty({
    description: 'Código de estado HTTP 404 (Not Found)',
    example: 404,
  })
  codigoEstado!: number;
}

export class RespuestaErrorConflictoDto extends BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Mensaje descriptivo del conflicto de estado o integridad referencial',
    example: 'Conflicto con el estado actual del recurso',
  })
  mensaje!: string;

  @ApiPropertyOptional({
    description: 'Detalle del conflicto presentado',
    example: ['El registro ya existe o posee dependencias activas vinculadas'],
    type: [String],
  })
  errores?: string[];

  @ApiProperty({
    description: 'Código de estado HTTP 409 (Conflict)',
    example: 409,
  })
  codigoEstado!: number;
}

export class RespuestaErrorServidorDto extends BaseRespuestaErrorDto {
  @ApiProperty({
    description: 'Mensaje descriptivo de error interno no controlado',
    example: 'Error interno del servidor',
  })
  mensaje!: string;

  @ApiProperty({
    description: 'Código de estado HTTP 500 (Internal Server Error)',
    example: 500,
  })
  codigoEstado!: number;
}

export class RespuestaErrorDto extends RespuestaErrorValidacionDto {}

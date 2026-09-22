// Generic success envelope wrapper for Swagger documentation.
// Matches the actual response shape produced by InterceptorFormatoRespuesta:
//   { exito: true, datos: <inner_payload> }
import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export function CrearRespuestaExitosaDto<T>(
  DatoDto: Type<T>,
  nombreClase?: string,
): Type<{ exito: boolean; datos: T }> {
  class RespuestaExitosaClase {
    @ApiProperty({
      description: 'Indica si la operación fue exitosa',
      example: true,
    })
    exito!: boolean;

    @ApiProperty({
      description: 'Datos de la respuesta',
      type: DatoDto,
    })
    datos!: T;
  }

  if (nombreClase) {
    Object.defineProperty(RespuestaExitosaClase, 'name', { value: nombreClase });
  }

  return RespuestaExitosaClase;
}

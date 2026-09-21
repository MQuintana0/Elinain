import { Type } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export interface PaginaResultado<T> {
  elementos: T[];
  total: number;
  limite: number;
  offset: number;
}

export function CrearPaginaRespuestaDto<T>(
  ItemDto: Type<T>,
  nombreClase?: string,
): Type<PaginaResultado<T>> {
  class PaginaRespuestaClase implements PaginaResultado<T> {
    @ApiProperty({
      type: [ItemDto],
      description: 'Listado de elementos paginados',
    })
    elementos!: T[];

    @ApiProperty({
      description: 'Cantidad total de registros encontrados para el tenant',
      example: 45,
    })
    total!: number;

    @ApiProperty({
      description: 'Límite de registros solicitado o aplicado por página',
      example: 20,
    })
    limite!: number;

    @ApiProperty({
      description: 'Cantidad de registros omitidos desde el inicio',
      example: 0,
    })
    offset!: number;
  }

  if (nombreClase) {
    Object.defineProperty(PaginaRespuestaClase, 'name', { value: nombreClase });
  }

  return PaginaRespuestaClase;
}

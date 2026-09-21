import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginacionQueryDto {
  @ApiPropertyOptional({
    description: 'Cantidad máxima de elementos a retornar (entre 1 y 100)',
    example: 20,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite no puede ser menor a 1' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  limite?: number;

  @ApiPropertyOptional({
    description: 'Número de elementos a omitir desde el inicio (mínimo 0)',
    example: 0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El offset debe ser un número entero' })
  @Min(0, { message: 'El offset no puede ser menor a 0' })
  offset?: number;
}

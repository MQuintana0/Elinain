import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';
import { ApiPesoOpcionalPositivo } from '../../common/validacion/validadores-numericos';

export class ActualizarCicloDto {
  @ApiPropertyOptional({
    description: 'Fecha del evento o control en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  fecha?: string;

  @ApiPesoOpcionalPositivo({
    description: 'Peso observado opcional de los animales en el checkpoint en kilogramos',
    example: 385.0,
  })
  peso_observado?: number | null;

  @ApiPropertyOptional({
    description: 'Notas o comentarios cualitativos opcionales sobre el lote o pasturas',
    example: 'Ajuste en pesaje tras desparasitación',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser un texto' })
  notas?: string | null;
}

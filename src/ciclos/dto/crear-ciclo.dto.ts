import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPesoOpcionalPositivo } from '../../common/validacion/validadores-numericos';

export class CrearCicloDto {
  @ApiProperty({
    description: 'Identificador UUID del contrato al que se asocia el checkpoint de ciclo',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('4', { message: 'El contrato_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El contrato_id es obligatorio' })
  contrato_id!: string;

  @ApiProperty({
    description: 'Fecha del evento o control en formato ISO 8601',
    example: '2026-09-22T10:00:00.000Z',
  })
  @IsISO8601({}, { message: 'La fecha debe ser una fecha ISO 8601 válida' })
  @IsNotEmpty({ message: 'La fecha es obligatoria' })
  fecha!: string;

  @ApiPesoOpcionalPositivo({
    description: 'Peso observado opcional de los animales en el checkpoint en kilogramos',
    example: 380.5,
  })
  peso_observado?: number | null;

  @ApiPropertyOptional({
    description: 'Notas o comentarios cualitativos opcionales sobre el lote o pasturas',
    example: 'Buen rebrote de pasturas, sin signos de enfermedad',
  })
  @IsOptional()
  @IsString({ message: 'Las notas deben ser un texto' })
  notas?: string | null;
}

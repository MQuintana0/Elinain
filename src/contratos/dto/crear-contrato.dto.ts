import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  ApiCantidadPositiva,
  ApiPesoPositivo,
  ApiPorcentaje,
  ApiPrecioPositivo,
} from '../../common/validacion/validadores-numericos';

export class CrearContratoDto {
  @ApiProperty({
    description: 'Identificador UUID del tercero socio en participación',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'El tercero_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El tercero_id es obligatorio' })
  tercero_id!: string;

  @ApiProperty({
    description: 'Identificador UUID de la finca donde pastará el lote',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsUUID('4', { message: 'El finca_id debe ser un UUID v4 válido' })
  @IsNotEmpty({ message: 'El finca_id es obligatorio' })
  finca_id!: string;

  @ApiProperty({
    description: 'Fecha y hora de apertura del contrato en formato ISO 8601',
    example: '2026-09-21T10:00:00.000Z',
  })
  @IsISO8601({}, { message: 'La fecha_apertura debe ser una fecha ISO 8601 válida' })
  @IsNotEmpty({ message: 'La fecha_apertura es obligatoria' })
  fecha_apertura!: string;

  @ApiPorcentaje({
    description: 'Porcentaje de participación del comerciante (entre 0 y 100)',
    example: 60,
  })
  @IsNotEmpty({ message: 'El porcentaje_comerciante es obligatorio' })
  porcentaje_comerciante!: number;

  @ApiPorcentaje({
    description: 'Porcentaje de participación del tercero (entre 0 y 100)',
    example: 40,
  })
  @IsNotEmpty({ message: 'El porcentaje_tercero es obligatorio' })
  porcentaje_tercero!: number;

  @ApiPropertyOptional({
    description: 'Raza o cruce del lote inicial (opcional)',
    example: 'Brahman Blanco',
  })
  @IsOptional()
  @IsString({ message: 'La raza debe ser un texto' })
  @IsNotEmpty({ message: 'La raza no puede estar vacía si se proporciona' })
  raza?: string;

  @ApiPesoPositivo({
    description: 'Peso promedio actual inicial del lote en kg (opcional)',
    example: 350.5,
    required: false,
  })
  @IsOptional()
  peso_promedio_actual?: number;

  @ApiCantidadPositiva({
    description: 'Cantidad de cabezas iniciales en el lote (opcional)',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'La cantidad actual debe ser un número entero' })
  cantidad_actual?: number;

  @ApiPrecioPositivo({
    description: 'Valor por kilo de referencia pactado (opcional)',
    example: 8500.0,
    required: false,
  })
  @IsOptional()
  valor_kilo_referencia?: number;
}

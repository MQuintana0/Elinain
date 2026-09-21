import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginacionQueryDto } from '../../common/dto/paginacion-query.dto';

export class ListarVentasQueryDto extends PaginacionQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar ventas por ID de contrato',
    example: 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de contrato debe ser un UUID válido' })
  contrato_id?: string;
}

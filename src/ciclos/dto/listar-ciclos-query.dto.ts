import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { PaginacionQueryDto } from '../../common/dto/paginacion-query.dto';

export class ListarCiclosQueryDto extends PaginacionQueryDto {
  @ApiPropertyOptional({
    description: 'Filtrar checkpoints de ciclos por ID de contrato',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El identificador de contrato debe ser un UUID válido' })
  contrato_id?: string;
}

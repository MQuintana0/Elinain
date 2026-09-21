import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FincasService } from './fincas.service';
import { CrearFincaDto } from './dto/crear-finca.dto';
import { ActualizarFincaDto } from './dto/actualizar-finca.dto';
import { FincaRespuestaDto } from './dto/finca-respuesta.dto';
import { RespuestaErrorDto } from '../common/dto/respuesta-error.dto';

@ApiTags('fincas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorDto,
})
@ApiInternalServerErrorResponse({
  description: 'Error interno del servidor',
  type: RespuestaErrorDto,
})
@Controller('fincas')
export class FincasController {
  constructor(private readonly servicio: FincasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra una nueva finca geolocalizada asociada a un tercero' })
  @ApiCreatedResponse({ description: 'Finca registrada exitosamente', type: FincaRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Datos de la finca inválidos (e.g. coordenadas fuera de rango)',
    type: RespuestaErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'El tercero asociado no existe o no pertenece al comerciante',
    type: RespuestaErrorDto,
  })
  crear(@Body() dto: CrearFincaDto): Promise<FincaRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lista las fincas pertenecientes a los terceros del comerciante' })
  @ApiOkResponse({ description: 'Listado de fincas', type: [FincaRespuestaDto] })
  listar(): Promise<FincaRespuestaDto[]> {
    return this.servicio.listar();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtiene el detalle de una finca por ID' })
  @ApiOkResponse({ description: 'Finca encontrada', type: FincaRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Identificador no es un UUID válido',
    type: RespuestaErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorDto,
  })
  buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<FincaRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza los datos o coordenadas de una finca' })
  @ApiOkResponse({ description: 'Finca actualizada', type: FincaRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Datos de actualización inválidos o identificador no es UUID válido',
    type: RespuestaErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorDto,
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarFincaDto,
  ): Promise<FincaRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina una finca si no tiene contratos vinculados' })
  @ApiNoContentResponse({ description: 'Finca eliminada correctamente' })
  @ApiBadRequestResponse({
    description: 'Identificador no es un UUID válido',
    type: RespuestaErrorDto,
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorDto,
  })
  @ApiConflictResponse({
    description: 'No se puede eliminar la finca porque tiene contratos activos asociados',
    type: RespuestaErrorDto,
  })
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

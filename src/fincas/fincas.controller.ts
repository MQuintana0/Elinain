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
import {
  RespuestaErrorConflictoDto,
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';

@ApiTags('fincas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/fincas',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@ApiInternalServerErrorResponse({
  description: 'Error interno del servidor',
  type: RespuestaErrorServidorDto,
  example: {
    exito: false,
    mensaje: 'Error interno del servidor',
    codigoEstado: 500,
    ruta: '/api/v1/fincas',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
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
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la petición: La latitud debe estar entre -90 y 90; La longitud debe estar entre -180 y 180',
      errores: ['La latitud debe estar entre -90 y 90', 'La longitud debe estar entre -180 y 180'],
      codigoEstado: 400,
      ruta: '/api/v1/fincas',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'El tercero asociado no existe o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'El tercero especificado no existe o no pertenece al comerciante autenticado',
      errores: ['El tercero especificado no existe o no pertenece al comerciante autenticado'],
      codigoEstado: 404,
      ruta: '/api/v1/fincas',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
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
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: Validation failed (uuid is expected)',
      errores: ['Validation failed (uuid is expected)'],
      codigoEstado: 400,
      ruta: '/api/v1/fincas/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Finca no encontrada',
      errores: ['Finca no encontrada'],
      codigoEstado: 404,
      ruta: '/api/v1/fincas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
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
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la petición: El área en hectáreas debe ser mayor o igual a 0',
      errores: ['El área en hectáreas debe ser mayor o igual a 0'],
      codigoEstado: 400,
      ruta: '/api/v1/fincas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Finca no encontrada',
      errores: ['Finca no encontrada'],
      codigoEstado: 404,
      ruta: '/api/v1/fincas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
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
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: Validation failed (uuid is expected)',
      errores: ['Validation failed (uuid is expected)'],
      codigoEstado: 400,
      ruta: '/api/v1/fincas/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Finca no encontrada o no pertenece a un tercero del comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Finca no encontrada',
      errores: ['Finca no encontrada'],
      codigoEstado: 404,
      ruta: '/api/v1/fincas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiConflictResponse({
    description: 'No se puede eliminar la finca porque tiene contratos activos asociados',
    type: RespuestaErrorConflictoDto,
    example: {
      exito: false,
      mensaje: 'No se puede eliminar la finca porque tiene contratos activos asociados',
      errores: ['No se puede eliminar la finca porque tiene contratos activos asociados'],
      codigoEstado: 409,
      ruta: '/api/v1/fincas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

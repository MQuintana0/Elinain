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
  Query,
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
import { TercerosService } from './terceros.service';
import { CrearTerceroDto } from './dto/crear-tercero.dto';
import { ActualizarTerceroDto } from './dto/actualizar-tercero.dto';
import { TerceroRespuestaDto } from './dto/tercero-respuesta.dto';
import { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import {
  RespuestaErrorConflictoDto,
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';

@ApiTags('terceros')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/terceros',
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
    ruta: '/api/v1/terceros',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@Controller('terceros')
export class TercerosController {
  constructor(private readonly servicio: TercerosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registra un nuevo tercero asociado al comerciante' })
  @ApiCreatedResponse({ description: 'Tercero creado exitosamente', type: TerceroRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Datos de creación del tercero inválidos o incompletos',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la petición: El nombre es obligatorio; El tipo de tercero debe ser criador, cebador o comisionista',
      errores: [
        'El nombre es obligatorio',
        'El tipo de tercero debe ser criador, cebador o comisionista',
      ],
      codigoEstado: 400,
      ruta: '/api/v1/terceros',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  crear(@Body() dto: CrearTerceroDto): Promise<TerceroRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lista los terceros pertenecientes al comerciante autenticado con paginación opcional',
  })
  @ApiOkResponse({ description: 'Listado de terceros', type: [TerceroRespuestaDto] })
  listar(@Query() paginacion?: PaginacionQueryDto): Promise<TerceroRespuestaDto[]> {
    return this.servicio.listar(paginacion);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtiene el detalle de un tercero por ID' })
  @ApiOkResponse({ description: 'Tercero encontrado', type: TerceroRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Identificador no es un UUID válido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: Validation failed (uuid is expected)',
      errores: ['Validation failed (uuid is expected)'],
      codigoEstado: 400,
      ruta: '/api/v1/terceros/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Tercero no encontrado o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Tercero no encontrado',
      errores: ['Tercero no encontrado'],
      codigoEstado: 404,
      ruta: '/api/v1/terceros/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<TerceroRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza los datos de un tercero' })
  @ApiOkResponse({ description: 'Tercero actualizado', type: TerceroRespuestaDto })
  @ApiBadRequestResponse({
    description: 'Datos de actualización inválidos o identificador no es UUID válido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la petición: El tipo de tercero debe ser criador, cebador o comisionista',
      errores: ['El tipo de tercero debe ser criador, cebador o comisionista'],
      codigoEstado: 400,
      ruta: '/api/v1/terceros/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Tercero no encontrado o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Tercero no encontrado',
      errores: ['Tercero no encontrado'],
      codigoEstado: 404,
      ruta: '/api/v1/terceros/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarTerceroDto,
  ): Promise<TerceroRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Elimina un tercero si no tiene contratos vinculados' })
  @ApiNoContentResponse({ description: 'Tercero eliminado correctamente' })
  @ApiBadRequestResponse({
    description: 'Identificador no es un UUID válido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la petición: Validation failed (uuid is expected)',
      errores: ['Validation failed (uuid is expected)'],
      codigoEstado: 400,
      ruta: '/api/v1/terceros/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Tercero no encontrado o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Tercero no encontrado',
      errores: ['Tercero no encontrado'],
      codigoEstado: 404,
      ruta: '/api/v1/terceros/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiConflictResponse({
    description: 'No se puede eliminar el tercero porque tiene contratos activos asociados',
    type: RespuestaErrorConflictoDto,
    example: {
      exito: false,
      mensaje: 'No se puede eliminar el tercero porque tiene contratos activos asociados',
      errores: ['No se puede eliminar el tercero porque tiene contratos activos asociados'],
      codigoEstado: 409,
      ruta: '/api/v1/terceros/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

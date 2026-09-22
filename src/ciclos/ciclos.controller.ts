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
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CiclosService } from './ciclos.service';
import { CrearCicloDto } from './dto/crear-ciclo.dto';
import { ActualizarCicloDto } from './dto/actualizar-ciclo.dto';
import { CicloRespuestaDto } from './dto/ciclo-respuesta.dto';
import { PaginaCiclosDto } from './dto/pagina-ciclos.dto';
import { ListarCiclosQueryDto } from './dto/listar-ciclos-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';
import { CrearRespuestaExitosaDto } from '../common/dto/respuesta-exitosa.dto';

const RespuestaCicloDto = CrearRespuestaExitosaDto(CicloRespuestaDto, 'RespuestaCicloDto');
const RespuestaPaginaCiclosDto = CrearRespuestaExitosaDto(
  PaginaCiclosDto,
  'RespuestaPaginaCiclosDto',
);

@ApiTags('ciclos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/ciclos',
    marcaTiempo: '2026-09-22T10:00:00.000Z',
  },
})
@ApiInternalServerErrorResponse({
  description: 'Error interno no controlado del servidor',
  type: RespuestaErrorServidorDto,
  example: {
    exito: false,
    mensaje: 'Ha ocurrido un error interno en el servidor',
    codigoEstado: 500,
    ruta: '/api/v1/ciclos',
    marcaTiempo: '2026-09-22T10:00:00.000Z',
  },
})
@Controller('ciclos')
export class CiclosController {
  constructor(private readonly servicio: CiclosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra un checkpoint de ciclo en un contrato activo',
    description:
      'Registra un evento de control satélite informativo en el contrato (fecha obligatoria, peso observado y notas opcionales).',
  })
  @ApiCreatedResponse({
    description: 'Ciclo registrado exitosamente',
    type: RespuestaCicloDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos (peso <= 0, fecha ausente) o contrato cerrado',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud: La fecha es obligatoria',
      codigoEstado: 400,
      errores: ['La fecha es obligatoria'],
      ruta: '/api/v1/ciclos',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'El contrato especificado no existe o pertenece a otro comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'El contrato especificado no existe o no pertenece al comerciante',
      codigoEstado: 404,
      ruta: '/api/v1/ciclos',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  async crear(@Body() dto: CrearCicloDto): Promise<CicloRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista los ciclos pertenecientes al comerciante con paginación opcional',
    description:
      'Retorna el listado paginado de checkpoints de ciclos del comerciante autenticado, permitiendo filtrar por contrato.',
  })
  @ApiOkResponse({
    description: 'Listado de ciclos obtenido exitosamente',
    type: RespuestaPaginaCiclosDto,
  })
  async listar(@Query() query?: ListarCiclosQueryDto): Promise<PaginaResultado<CicloRespuestaDto>> {
    return this.servicio.listar(query?.contrato_id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene el detalle de un ciclo por su ID',
    description: 'Consulta un ciclo específico asegurando aislamiento por tenant.',
  })
  @ApiOkResponse({
    description: 'Ciclo encontrado y retornado',
    type: RespuestaCicloDto,
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Ciclo no encontrado en la cuenta del comerciante autenticado',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Ciclo no encontrado',
      codigoEstado: 404,
      ruta: '/api/v1/ciclos/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<CicloRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza un ciclo en un contrato activo',
    description:
      'Permite modificar libremente fecha, peso observado o notas de un ciclo mientras el contrato permanezca activo.',
  })
  @ApiOkResponse({
    description: 'Ciclo actualizado exitosamente',
    type: RespuestaCicloDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de actualización inválidos o contrato cerrado',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Ciclo no encontrado',
    type: RespuestaErrorNoEncontradoDto,
  })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCicloDto,
  ): Promise<CicloRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina un ciclo en un contrato activo',
    description:
      'Permite eliminar libremente un ciclo informativo mientras el contrato esté activo, incluso con ventas existentes.',
  })
  @ApiOkResponse({
    description: 'Ciclo eliminado exitosamente',
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido o contrato cerrado',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Ciclo no encontrado',
    type: RespuestaErrorNoEncontradoDto,
  })
  async eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

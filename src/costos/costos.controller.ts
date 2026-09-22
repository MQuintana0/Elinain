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
import { CostosService } from './costos.service';
import { CrearCostoDto } from './dto/crear-costo.dto';
import { ActualizarCostoDto } from './dto/actualizar-costo.dto';
import { CostoRespuestaDto } from './dto/costo-respuesta.dto';
import { PaginaCostosDto } from './dto/pagina-costos.dto';
import { ListarCostosQueryDto } from './dto/listar-costos-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';
import { CrearRespuestaExitosaDto } from '../common/dto/respuesta-exitosa.dto';

const RespuestaCostoDto = CrearRespuestaExitosaDto(CostoRespuestaDto, 'RespuestaCostoDto');
const RespuestaPaginaCostosDto = CrearRespuestaExitosaDto(
  PaginaCostosDto,
  'RespuestaPaginaCostosDto',
);

@ApiTags('costos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/costos',
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
    ruta: '/api/v1/costos',
    marcaTiempo: '2026-09-22T10:00:00.000Z',
  },
})
@Controller('costos')
export class CostosController {
  constructor(private readonly servicio: CostosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra un costo operativo informativo en un contrato activo',
    description:
      'Registra un costo operativo asociado al contrato (flete, alimentación, etc.). Es puramente informativo y no descuenta ni altera la utilidad real.',
  })
  @ApiCreatedResponse({
    description: 'Costo registrado exitosamente',
    type: RespuestaCostoDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos inválidos (monto <= 0, campos obligatorios faltantes) o contrato cerrado',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud: El monto debe ser mayor que cero',
      codigoEstado: 400,
      errores: ['El monto debe ser mayor que cero'],
      ruta: '/api/v1/costos',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'El contrato especificado no existe o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'El contrato especificado no existe o no pertenece al comerciante',
      codigoEstado: 404,
      ruta: '/api/v1/costos',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  async crear(@Body() dto: CrearCostoDto): Promise<CostoRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista los costos informativos pertenecientes al comerciante con paginación opcional',
    description:
      'Retorna el listado paginado de costos del comerciante autenticado, permitiendo filtrar opcionalmente por contrato.',
  })
  @ApiOkResponse({
    description: 'Listado de costos obtenido exitosamente',
    type: RespuestaPaginaCostosDto,
  })
  async listar(@Query() query?: ListarCostosQueryDto): Promise<PaginaResultado<CostoRespuestaDto>> {
    return this.servicio.listar(query?.contrato_id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene el detalle de un costo por su ID',
    description: 'Consulta un costo específico asegurando aislamiento multi-tenant.',
  })
  @ApiOkResponse({
    description: 'Costo encontrado y retornado',
    type: RespuestaCostoDto,
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Costo no encontrado en la cuenta del comerciante autenticado',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Costo no encontrado',
      codigoEstado: 404,
      ruta: '/api/v1/costos/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-22T10:00:00.000Z',
    },
  })
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<CostoRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza un costo en un contrato activo',
    description:
      'Permite modificar los datos de un costo informativo mientras el contrato permanezca activo.',
  })
  @ApiOkResponse({
    description: 'Costo actualizado exitosamente',
    type: RespuestaCostoDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de actualización inválidos o contrato cerrado',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Costo no encontrado',
    type: RespuestaErrorNoEncontradoDto,
  })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCostoDto,
  ): Promise<CostoRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina un costo en un contrato activo',
    description:
      'Permite eliminar libremente un costo informativo mientras el contrato esté activo, incluso con ventas existentes.',
  })
  @ApiOkResponse({
    description: 'Costo eliminado exitosamente',
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido o contrato cerrado',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Costo no encontrado',
    type: RespuestaErrorNoEncontradoDto,
  })
  async eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

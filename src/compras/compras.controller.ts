import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { CompraRespuestaDto } from './dto/compra-respuesta.dto';
import { PaginaComprasDto } from './dto/pagina-compras.dto';
import { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';

@ApiTags('compras')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/compras',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@ApiInternalServerErrorResponse({
  description: 'Error interno no controlado del servidor',
  type: RespuestaErrorServidorDto,
  example: {
    exito: false,
    mensaje: 'Ha ocurrido un error interno en el servidor',
    codigoEstado: 500,
    ruta: '/api/v1/compras',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@Controller('compras')
export class ComprasController {
  constructor(private readonly servicio: ComprasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra una compra en un contrato calculando el valor total',
    description:
      'Registra los animales comprados asociándolos a un contrato existente. El valor_total se calcula automáticamente en el backend multiplicando cantidad × peso_promedio × precio_kilo.',
  })
  @ApiCreatedResponse({
    description: 'Compra registrada exitosamente',
    type: CompraRespuestaDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de la compra inválidos (campos faltantes, valores <= 0) o contrato cerrado',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud: La cantidad debe ser mayor que cero',
      codigoEstado: 400,
      errores: ['La cantidad debe ser mayor que cero'],
      ruta: '/api/v1/compras',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'El contrato especificado no existe o pertenece a otro comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'El contrato especificado no existe',
      codigoEstado: 404,
      ruta: '/api/v1/compras',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async crear(@Body() dto: CrearCompraDto): Promise<CompraRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista las compras pertenecientes al comerciante con paginación opcional',
    description:
      'Retorna el listado paginado de compras del comerciante autenticado, permitiendo filtrar opcionalmente por contrato.',
  })
  @ApiOkResponse({
    description: 'Listado de compras obtenido exitosamente',
    type: PaginaComprasDto,
  })
  @ApiQuery({
    name: 'contrato_id',
    required: false,
    type: String,
    description: 'Filtrar compras por ID de contrato',
  })
  async listar(
    @Query('contrato_id') contratoId?: string,
    @Query() paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CompraRespuestaDto>> {
    return this.servicio.listar(contratoId, paginacion);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene el detalle de una compra por su ID',
    description: 'Consulta una compra específica asegurando aislamiento por tenant.',
  })
  @ApiOkResponse({
    description: 'Compra encontrada y retornada',
    type: CompraRespuestaDto,
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud',
      codigoEstado: 400,
      errores: [
        {
          campo: 'id',
          mensajes: ['Validation failed (uuid v4 is expected)'],
        },
      ],
      ruta: '/api/v1/compras/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Compra no encontrada en la cuenta del comerciante autenticado',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Compra no encontrada',
      codigoEstado: 404,
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<CompraRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }
}

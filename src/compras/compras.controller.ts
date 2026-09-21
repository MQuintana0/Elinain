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
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ComprasService } from './compras.service';
import { CrearCompraDto } from './dto/crear-compra.dto';
import { ActualizarCompraDto } from './dto/actualizar-compra.dto';
import { CompraRespuestaDto } from './dto/compra-respuesta.dto';
import { PaginaComprasDto } from './dto/pagina-compras.dto';
import { ListarComprasQueryDto } from './dto/listar-compras-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorConflictoDto,
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
  async listar(
    @Query() query?: ListarComprasQueryDto,
  ): Promise<PaginaResultado<CompraRespuestaDto>> {
    return this.servicio.listar(query?.contrato_id, query);
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

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza una compra en un contrato sin ventas registradas',
    description:
      'Permite editar una compra solo si el contrato aún no posee registros de venta. Si ya posee ventas, rechaza con 409 Conflict. Recalcula el valor_total y revierte/reaplica el saldo y peso promedio del contrato.',
  })
  @ApiOkResponse({
    description: 'Compra actualizada y contrato sincronizado exitosamente',
    type: CompraRespuestaDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de actualización inválidos o identificador no es UUID válido',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud: La cantidad debe ser mayor que cero',
      codigoEstado: 400,
      errores: ['La cantidad debe ser mayor que cero'],
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Compra no encontrada',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Compra no encontrada',
      codigoEstado: 404,
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiConflictResponse({
    description: 'Conflicto de integridad financiera: el contrato ya posee ventas registradas',
    type: RespuestaErrorConflictoDto,
    example: {
      exito: false,
      mensaje: 'No se puede editar una compra de un contrato que ya posee ventas registradas',
      codigoEstado: 409,
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarCompraDto,
  ): Promise<CompraRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Elimina una compra en un contrato sin ventas registradas',
    description:
      'Permite eliminar una compra solo si el contrato aún no posee registros de venta. Si ya posee ventas, rechaza con 409 Conflict. Revierte algorítmicamente la cantidad y peso del contrato.',
  })
  @ApiOkResponse({
    description: 'Compra eliminada exitosamente',
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Compra no encontrada',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Compra no encontrada',
      codigoEstado: 404,
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiConflictResponse({
    description: 'Conflicto de integridad financiera: el contrato ya posee ventas registradas',
    type: RespuestaErrorConflictoDto,
    example: {
      exito: false,
      mensaje: 'No se puede eliminar una compra de un contrato que ya posee ventas registradas',
      codigoEstado: 409,
      ruta: '/api/v1/compras/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async eliminar(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.servicio.eliminar(id);
  }
}

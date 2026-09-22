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
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiMethodNotAllowedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CrearVentaDto } from './dto/crear-venta.dto';
import { VentaRespuestaDto } from './dto/venta-respuesta.dto';
import { PaginaVentasDto } from './dto/pagina-ventas.dto';
import { ListarVentasQueryDto } from './dto/listar-ventas-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';
import { CrearRespuestaExitosaDto } from '../common/dto/respuesta-exitosa.dto';

const RespuestaVentaDto = CrearRespuestaExitosaDto(VentaRespuestaDto, 'RespuestaVentaDto');
const RespuestaPaginaVentasDto = CrearRespuestaExitosaDto(
  PaginaVentasDto,
  'RespuestaPaginaVentasDto',
);

@ApiTags('ventas')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/ventas',
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
    ruta: '/api/v1/ventas',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@Controller('ventas')
export class VentasController {
  constructor(private readonly servicio: VentasService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registra una venta ejecutando el motor financiero y congelando snapshots',
    description:
      'Registra la salida de animales de un contrato. Calcula el valor bruto, costo estimado por promedio simple a la fecha, utilidad total y repartos según el par de porcentajes del contrato. Descuenta la cantidad del contrato y lo cierra automáticamente si llega a 0.',
  })
  @ApiCreatedResponse({
    description: 'Venta registrada e indicadores calculados exitosamente',
    type: RespuestaVentaDto,
  })
  @ApiBadRequestResponse({
    description:
      'Sobreventa (cantidad > saldo disponible), inconsistencia cronológica o contrato cerrado',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la solicitud: La cantidad vendida supera la cantidad disponible en el contrato',
      codigoEstado: 400,
      errores: ['La cantidad vendida supera la cantidad disponible en el contrato'],
      ruta: '/api/v1/ventas',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'El contrato especificado no existe o no pertenece al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'El contrato especificado no existe o no pertenece al comerciante',
      codigoEstado: 404,
      ruta: '/api/v1/ventas',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async registrar(@Body() dto: CrearVentaDto): Promise<VentaRespuestaDto> {
    return this.servicio.registrar(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista las ventas pertenecientes al comerciante con paginación opcional',
    description:
      'Retorna el listado paginado de ventas del comerciante autenticado, permitiendo filtrar opcionalmente por contrato.',
  })
  @ApiOkResponse({
    description: 'Listado de ventas obtenido exitosamente',
    type: RespuestaPaginaVentasDto,
  })
  async listar(@Query() query?: ListarVentasQueryDto): Promise<PaginaResultado<VentaRespuestaDto>> {
    return this.servicio.listar(query?.contrato_id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene el detalle de una venta por su ID',
    description: 'Consulta una venta específica asegurando aislamiento multi-tenant.',
  })
  @ApiOkResponse({
    description: 'Venta encontrada y retornada',
    type: RespuestaVentaDto,
  })
  @ApiBadRequestResponse({
    description: 'Identificador UUID con formato inválido',
    type: RespuestaErrorValidacionDto,
  })
  @ApiNotFoundResponse({
    description: 'Venta no encontrada en la cuenta del comerciante autenticado',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Venta no encontrada',
      codigoEstado: 404,
      ruta: '/api/v1/ventas/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<VentaRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Bloqueado: las ventas son inmutables (RF-22)',
    description: 'Rechaza cualquier intento de modificación de un registro de venta.',
  })
  @ApiMethodNotAllowedResponse({
    description: 'Las ventas son inmutables y no admiten modificaciones',
  })
  actualizarPatch(): never {
    return this.servicio.actualizar();
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Bloqueado: las ventas son inmutables (RF-22)',
    description: 'Rechaza cualquier intento de modificación de un registro de venta.',
  })
  @ApiMethodNotAllowedResponse({
    description: 'Las ventas son inmutables y no admiten modificaciones',
  })
  actualizarPut(): never {
    return this.servicio.actualizar();
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Bloqueado: las ventas son inmutables (RF-22)',
    description: 'Rechaza cualquier intento de eliminación de un registro de venta.',
  })
  @ApiMethodNotAllowedResponse({
    description: 'Las ventas son inmutables y no pueden ser eliminadas',
  })
  eliminar(): never {
    return this.servicio.eliminar();
  }
}

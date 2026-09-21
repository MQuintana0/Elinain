import {
  Body,
  Controller,
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
import { ContratosService } from './contratos.service';
import { CrearContratoDto } from './dto/crear-contrato.dto';
import { ActualizarContratoDto } from './dto/actualizar-contrato.dto';
import { ContratoRespuestaDto } from './dto/contrato-respuesta.dto';
import { PaginaContratosDto } from './dto/pagina-contratos.dto';
import { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorNoEncontradoDto,
  RespuestaErrorServidorDto,
  RespuestaErrorValidacionDto,
} from '../common/dto/respuesta-error.dto';

@ApiTags('contratos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/contratos',
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
    ruta: '/api/v1/contratos',
    marcaTiempo: '2026-09-21T16:00:00.000Z',
  },
})
@Controller('contratos')
export class ContratosController {
  constructor(private readonly servicio: ContratosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Apertura un nuevo contrato de participación (lote)',
    description:
      'Registra un nuevo contrato vinculando un tercero, una finca y el par inmutable de porcentajes de participación. El estado se inicializa automáticamente en "activo". Invariante de negocio obligatoria: la suma de porcentaje_comerciante y porcentaje_tercero debe ser exactamente igual a 100%.',
  })
  @ApiCreatedResponse({
    description: 'Contrato aperturado exitosamente',
    type: ContratoRespuestaDto,
  })
  @ApiBadRequestResponse({
    description:
      'Error de validación: campos requeridos ausentes, valores numéricos inválidos o suma de porcentajes distinta de 100',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje:
        'Error de validación en la solicitud: La suma del porcentaje del comerciante y el porcentaje del tercero debe ser exactamente igual a 100',
      codigoEstado: 400,
      errores: [
        'La suma del porcentaje del comerciante y el porcentaje del tercero debe ser exactamente igual a 100',
      ],
      ruta: '/api/v1/contratos',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description:
      'Recurso no encontrado: el tercero no existe en el tenant o la finca no existe/no pertenece al tercero',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'La finca especificada no existe o no pertenece al tercero indicado',
      codigoEstado: 404,
      ruta: '/api/v1/contratos',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async crear(@Body() dto: CrearContratoDto): Promise<ContratoRespuestaDto> {
    return this.servicio.crear(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista los contratos pertenecientes al comerciante autenticado con paginación opcional',
    description: 'Retorna todos los contratos accesibles por el tenant en sesión activa.',
  })
  @ApiOkResponse({
    description: 'Listado de contratos obtenido exitosamente',
    type: PaginaContratosDto,
  })
  async listar(
    @Query() paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<ContratoRespuestaDto>> {
    return this.servicio.listar(paginacion);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obtiene el detalle de un contrato por su ID',
    description: 'Consulta un contrato específico asegurando aislamiento tenant.',
  })
  @ApiOkResponse({
    description: 'Contrato encontrado y retornado',
    type: ContratoRespuestaDto,
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
      ruta: '/api/v1/contratos/invalido',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Contrato no encontrado o no perteneciente al comerciante',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Contrato no encontrado',
      codigoEstado: 404,
      ruta: '/api/v1/contratos/00000000-0000-0000-0000-000000000000',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async buscarPorId(@Param('id', ParseUUIDPipe) id: string): Promise<ContratoRespuestaDto> {
    return this.servicio.buscarPorId(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza campos informativos o estado de un contrato',
    description:
      'Permite modificar datos mutables (raza, peso_promedio_actual, cantidad_actual, valor_kilo_referencia, estado, fecha_cierre). Los porcentajes de participación son inmutables y no se pueden alterar.',
  })
  @ApiOkResponse({
    description: 'Contrato actualizado exitosamente',
    type: ContratoRespuestaDto,
  })
  @ApiBadRequestResponse({
    description:
      'Datos inválidos o intento de modificar porcentajes de participación u otros campos inmutables',
    type: RespuestaErrorValidacionDto,
    example: {
      exito: false,
      mensaje: 'Error de validación en la solicitud',
      codigoEstado: 400,
      errores: [
        {
          campo: 'porcentaje_comerciante',
          mensajes: ['property porcentaje_comerciante should not exist'],
        },
      ],
      ruta: '/api/v1/contratos/00000000-0000-0000-0000-000000000000',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  @ApiNotFoundResponse({
    description: 'Contrato no encontrado para actualizar',
    type: RespuestaErrorNoEncontradoDto,
    example: {
      exito: false,
      mensaje: 'Contrato no encontrado',
      codigoEstado: 404,
      ruta: '/api/v1/contratos/00000000-0000-0000-0000-000000000000',
      marcaTiempo: '2026-09-21T16:00:00.000Z',
    },
  })
  async actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarContratoDto,
  ): Promise<ContratoRespuestaDto> {
    return this.servicio.actualizar(id, dto);
  }
}

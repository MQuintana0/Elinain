import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { ReporteDashboardDto } from './dto/reporte-dashboard.dto';
import { ReporteContratosActivosDto } from './dto/reporte-contratos-activos.dto';
import { ReporteHistorialVentasDto } from './dto/reporte-historial-ventas.dto';
import {
  RespuestaErrorNoAutorizadoDto,
  RespuestaErrorServidorDto,
} from '../common/dto/respuesta-error.dto';
import { CrearRespuestaExitosaDto } from '../common/dto/respuesta-exitosa.dto';

const RespuestaDashboardDto = CrearRespuestaExitosaDto(
  ReporteDashboardDto,
  'RespuestaDashboardDto',
);
const RespuestaContratosActivosReporteDto = CrearRespuestaExitosaDto(
  ReporteContratosActivosDto,
  'RespuestaContratosActivosReporteDto',
);
const RespuestaHistorialVentasReporteDto = CrearRespuestaExitosaDto(
  ReporteHistorialVentasDto,
  'RespuestaHistorialVentasReporteDto',
);

@ApiTags('reportes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'No autorizado: token JWT ausente o inválido',
  type: RespuestaErrorNoAutorizadoDto,
  example: {
    exito: false,
    mensaje: 'No autorizado: token JWT ausente o inválido',
    codigoEstado: 401,
    ruta: '/api/v1/reportes/dashboard',
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
    ruta: '/api/v1/reportes/dashboard',
    marcaTiempo: '2026-09-22T10:00:00.000Z',
  },
})
@Controller('reportes')
export class ReportesController {
  constructor(private readonly servicio: ReportesService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Obtiene el resumen consolidado del dashboard',
    description:
      'Retorna indicadores agregados sobre contratos activos y cerrados, animales en inventario, utilidades acumuladas y costos informativos basándose en datos ya persistidos.',
  })
  @ApiOkResponse({
    description: 'Resumen consolidado del dashboard obtenido exitosamente',
    type: RespuestaDashboardDto,
  })
  async obtenerDashboard(): Promise<ReporteDashboardDto> {
    return this.servicio.obtenerDashboard();
  }

  @Get('contratos-activos')
  @ApiOperation({
    summary: 'Obtiene el reporte detallado de contratos actualmente activos',
    description:
      'Retorna la lista de contratos activos con sus agregaciones de compras, ventas y utilidad generada acumulada por el comerciante.',
  })
  @ApiOkResponse({
    description: 'Reporte de contratos activos obtenido exitosamente',
    type: RespuestaContratosActivosReporteDto,
  })
  async obtenerContratosActivos(): Promise<ReporteContratosActivosDto> {
    return this.servicio.obtenerContratosActivos();
  }

  @Get('historial-ventas')
  @ApiOperation({
    summary: 'Obtiene el reporte histórico de ventas con totales agregados',
    description:
      'Retorna el historial completo de ventas con ingresos brutos, costos estimados, utilidades totales y repartos a la fecha de cada venta.',
  })
  @ApiOkResponse({
    description: 'Reporte histórico de ventas obtenido exitosamente',
    type: RespuestaHistorialVentasReporteDto,
  })
  async obtenerHistorialVentas(): Promise<ReporteHistorialVentasDto> {
    return this.servicio.obtenerHistorialVentas();
  }
}

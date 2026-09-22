import { Injectable } from '@nestjs/common';
import { ReportesRepository } from './reportes.repository';
import type { ReporteDashboardDto } from './dto/reporte-dashboard.dto';
import type { ReporteContratosActivosDto } from './dto/reporte-contratos-activos.dto';
import type { ReporteHistorialVentasDto } from './dto/reporte-historial-ventas.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly repositorio: ReportesRepository) {}

  async obtenerDashboard(): Promise<ReporteDashboardDto> {
    return this.repositorio.obtenerDashboard();
  }

  async obtenerContratosActivos(): Promise<ReporteContratosActivosDto> {
    return this.repositorio.obtenerContratosActivos();
  }

  async obtenerHistorialVentas(): Promise<ReporteHistorialVentasDto> {
    return this.repositorio.obtenerHistorialVentas();
  }
}

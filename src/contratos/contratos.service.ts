import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ContratosRepository } from './contratos.repository';
import type { CrearContratoDto } from './dto/crear-contrato.dto';
import type { ActualizarContratoDto } from './dto/actualizar-contrato.dto';
import type { ContratoRespuestaDto } from './dto/contrato-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly repositorio: ContratosRepository) {}

  async crear(dto: CrearContratoDto): Promise<ContratoRespuestaDto> {
    const { terceroExisteEnTenant, fincaPerteneceAlTercero } =
      await this.repositorio.validarRelacionTerceroYFinca(dto.tercero_id, dto.finca_id);

    if (!terceroExisteEnTenant) {
      throw new NotFoundException('El tercero especificado no existe');
    }

    if (!fincaPerteneceAlTercero) {
      throw new NotFoundException(
        'La finca especificada no existe o no pertenece al tercero indicado',
      );
    }

    if (Math.abs(dto.porcentaje_comerciante + dto.porcentaje_tercero - 100) > 0.0001) {
      throw new BadRequestException(
        'La suma del porcentaje del comerciante y el porcentaje del tercero debe ser exactamente igual a 100',
      );
    }

    return this.repositorio.crear({
      tercero_id: dto.tercero_id,
      finca_id: dto.finca_id,
      fecha_apertura: dto.fecha_apertura,
      porcentaje_comerciante: dto.porcentaje_comerciante,
      porcentaje_tercero: dto.porcentaje_tercero,
      estado: 'activo',
      fecha_cierre: null,
      raza: dto.raza ?? null,
      peso_promedio_actual: dto.peso_promedio_actual ?? null,
      cantidad_actual: dto.cantidad_actual ?? null,
      valor_kilo_referencia: dto.valor_kilo_referencia ?? null,
    });
  }

  async buscarPorId(id: string): Promise<ContratoRespuestaDto> {
    const contrato = await this.repositorio.buscarPorId(id);
    if (!contrato) {
      throw new NotFoundException('Contrato no encontrado');
    }
    return contrato;
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<PaginaResultado<ContratoRespuestaDto>> {
    return this.repositorio.listar(paginacion);
  }

  async actualizar(id: string, dto: ActualizarContratoDto): Promise<ContratoRespuestaDto> {
    const objeto = dto as unknown as Record<string, unknown>;
    if ('porcentaje_comerciante' in objeto || 'porcentaje_tercero' in objeto) {
      throw new BadRequestException(
        'Los porcentajes de participación son inmutables y no pueden modificarse',
      );
    }

    if ('tercero_id' in objeto || 'finca_id' in objeto || 'fecha_apertura' in objeto) {
      throw new BadRequestException(
        'Los identificadores y la fecha de apertura son inmutables tras la creación del contrato',
      );
    }

    const contratoActualizado = await this.repositorio.actualizar(id, dto);
    if (!contratoActualizado) {
      throw new NotFoundException('Contrato no encontrado');
    }
    return contratoActualizado;
  }
}

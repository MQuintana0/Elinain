import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CostosRepository } from './costos.repository';
import type { CrearCostoDto } from './dto/crear-costo.dto';
import type { ActualizarCostoDto } from './dto/actualizar-costo.dto';
import type { CostoRespuestaDto } from './dto/costo-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class CostosService {
  constructor(private readonly repositorio: CostosRepository) {}

  async crear(dto: CrearCostoDto): Promise<CostoRespuestaDto> {
    const validacion = await this.repositorio.validarContratoPerteneceAlTenant(dto.contrato_id);
    if (!validacion.existe) {
      throw new NotFoundException(
        'El contrato especificado no existe o no pertenece al comerciante',
      );
    }

    if (validacion.estado !== 'activo') {
      throw new BadRequestException('No se pueden registrar costos en un contrato cerrado');
    }

    return this.repositorio.crear({
      contrato_id: dto.contrato_id,
      tipo: dto.tipo,
      monto: dto.monto,
      fecha: dto.fecha,
      descripcion: dto.descripcion,
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CostoRespuestaDto>> {
    if (contratoId) {
      const validacion = await this.repositorio.validarContratoPerteneceAlTenant(contratoId);
      if (!validacion.existe) {
        throw new NotFoundException(
          'El contrato especificado no existe o no pertenece al comerciante',
        );
      }
    }
    return this.repositorio.listar(contratoId, paginacion);
  }

  async buscarPorId(id: string): Promise<CostoRespuestaDto> {
    const costo = await this.repositorio.buscarPorId(id);
    if (!costo) {
      throw new NotFoundException('Costo no encontrado');
    }
    return costo;
  }

  async actualizar(id: string, dto: ActualizarCostoDto): Promise<CostoRespuestaDto> {
    const contratoCosto = await this.repositorio.obtenerContratoDeCosto(id);
    if (!contratoCosto) {
      throw new NotFoundException('Costo no encontrado');
    }

    if (contratoCosto.estado !== 'activo') {
      throw new BadRequestException('No se pueden modificar costos de un contrato cerrado');
    }

    const actualizado = await this.repositorio.actualizar(id, dto);
    if (!actualizado) {
      throw new NotFoundException('Costo no encontrado');
    }
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    const contratoCosto = await this.repositorio.obtenerContratoDeCosto(id);
    if (!contratoCosto) {
      throw new NotFoundException('Costo no encontrado');
    }

    if (contratoCosto.estado !== 'activo') {
      throw new BadRequestException('No se pueden eliminar costos de un contrato cerrado');
    }

    const eliminado = await this.repositorio.eliminar(id);
    if (!eliminado) {
      throw new NotFoundException('Costo no encontrado');
    }
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CiclosRepository } from './ciclos.repository';
import type { CrearCicloDto } from './dto/crear-ciclo.dto';
import type { ActualizarCicloDto } from './dto/actualizar-ciclo.dto';
import type { CicloRespuestaDto } from './dto/ciclo-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class CiclosService {
  constructor(private readonly repositorio: CiclosRepository) {}

  async crear(dto: CrearCicloDto): Promise<CicloRespuestaDto> {
    const validacion = await this.repositorio.validarContratoPerteneceAlTenant(dto.contrato_id);
    if (!validacion.existe) {
      throw new NotFoundException(
        'El contrato especificado no existe o no pertenece al comerciante',
      );
    }

    if (validacion.estado !== 'activo') {
      throw new BadRequestException('No se pueden registrar ciclos en un contrato cerrado');
    }

    return this.repositorio.crear({
      contrato_id: dto.contrato_id,
      fecha: dto.fecha,
      peso_observado: dto.peso_observado ?? null,
      notas: dto.notas ?? null,
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CicloRespuestaDto>> {
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

  async buscarPorId(id: string): Promise<CicloRespuestaDto> {
    const ciclo = await this.repositorio.buscarPorId(id);
    if (!ciclo) {
      throw new NotFoundException('Ciclo no encontrado');
    }
    return ciclo;
  }

  async actualizar(id: string, dto: ActualizarCicloDto): Promise<CicloRespuestaDto> {
    const contratoCiclo = await this.repositorio.obtenerContratoDeCiclo(id);
    if (!contratoCiclo) {
      throw new NotFoundException('Ciclo no encontrado');
    }

    if (contratoCiclo.estado !== 'activo') {
      throw new BadRequestException('No se pueden modificar ciclos de un contrato cerrado');
    }

    const actualizado = await this.repositorio.actualizar(id, dto);
    if (!actualizado) {
      throw new NotFoundException('Ciclo no encontrado');
    }
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    const contratoCiclo = await this.repositorio.obtenerContratoDeCiclo(id);
    if (!contratoCiclo) {
      throw new NotFoundException('Ciclo no encontrado');
    }

    if (contratoCiclo.estado !== 'activo') {
      throw new BadRequestException('No se pueden eliminar ciclos de un contrato cerrado');
    }

    const eliminado = await this.repositorio.eliminar(id);
    if (!eliminado) {
      throw new NotFoundException('Ciclo no encontrado');
    }
  }
}

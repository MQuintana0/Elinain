import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TercerosRepository } from './terceros.repository';
import type { CrearTerceroDto } from './dto/crear-tercero.dto';
import type { ActualizarTerceroDto } from './dto/actualizar-tercero.dto';
import type { TerceroRespuestaDto } from './dto/tercero-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class TercerosService {
  constructor(private readonly repositorio: TercerosRepository) {}

  async crear(dto: CrearTerceroDto): Promise<TerceroRespuestaDto> {
    return this.repositorio.crear({
      nombre: dto.nombre.trim(),
      documento: dto.documento.trim(),
      contacto: dto.contacto.trim(),
    });
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<PaginaResultado<TerceroRespuestaDto>> {
    return this.repositorio.listar(paginacion);
  }

  async buscarPorId(id: string): Promise<TerceroRespuestaDto> {
    const tercero = await this.repositorio.buscarPorId(id);
    if (!tercero) {
      throw new NotFoundException('Tercero no encontrado');
    }
    return tercero;
  }

  async actualizar(id: string, dto: ActualizarTerceroDto): Promise<TerceroRespuestaDto> {
    await this.buscarPorId(id);
    const actualizado = await this.repositorio.actualizar(id, {
      nombre: dto.nombre?.trim(),
      documento: dto.documento?.trim(),
      contacto: dto.contacto?.trim(),
    });
    if (!actualizado) {
      throw new NotFoundException('Tercero no encontrado');
    }
    return actualizado;
  }

  async eliminar(id: string): Promise<void> {
    await this.buscarPorId(id);

    const tieneContratos = await this.repositorio.tieneContratosVinculados(id);
    if (tieneContratos) {
      throw new ConflictException(
        'No se puede eliminar el tercero porque tiene contratos vinculados',
      );
    }

    try {
      const eliminado = await this.repositorio.eliminar(id);
      if (!eliminado) {
        throw new NotFoundException('Tercero no encontrado');
      }
    } catch (error: unknown) {
      const codigo =
        (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
      if (codigo === '23503') {
        throw new ConflictException(
          'No se puede eliminar el tercero porque tiene contratos vinculados',
        );
      }
      throw error;
    }
  }
}

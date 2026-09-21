import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FincasRepository } from './fincas.repository';
import type { CrearFincaDto } from './dto/crear-finca.dto';
import type { ActualizarFincaDto } from './dto/actualizar-finca.dto';
import type { FincaRespuestaDto } from './dto/finca-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';

@Injectable()
export class FincasService {
  constructor(private readonly repositorio: FincasRepository) {}

  async crear(dto: CrearFincaDto): Promise<FincaRespuestaDto> {
    const terceroValido = await this.repositorio.verificarTerceroPerteneceAlTenant(dto.tercero_id);
    if (!terceroValido) {
      throw new BadRequestException('El tercero especificado no existe o no pertenece a su cuenta');
    }

    return this.repositorio.crear({
      tercero_id: dto.tercero_id,
      nombre: dto.nombre.trim(),
      direccion: dto.direccion.trim(),
      latitud: dto.latitud,
      longitud: dto.longitud,
    });
  }

  async listar(paginacion?: PaginacionQueryDto): Promise<FincaRespuestaDto[]> {
    return this.repositorio.listar(paginacion);
  }

  async buscarPorId(id: string): Promise<FincaRespuestaDto> {
    const finca = await this.repositorio.buscarPorId(id);
    if (!finca) {
      throw new NotFoundException('Finca no encontrada');
    }
    return finca;
  }

  async actualizar(id: string, dto: ActualizarFincaDto): Promise<FincaRespuestaDto> {
    await this.buscarPorId(id);

    const actualizada = await this.repositorio.actualizar(id, {
      nombre: dto.nombre?.trim(),
      direccion: dto.direccion?.trim(),
      latitud: dto.latitud,
      longitud: dto.longitud,
    });

    if (!actualizada) {
      throw new NotFoundException('Finca no encontrada');
    }
    return actualizada;
  }

  async eliminar(id: string): Promise<void> {
    await this.buscarPorId(id);

    const tieneContratos = await this.repositorio.tieneContratosVinculados(id);
    if (tieneContratos) {
      throw new ConflictException(
        'No se puede eliminar la finca porque tiene contratos vinculados',
      );
    }

    try {
      const eliminada = await this.repositorio.eliminar(id);
      if (!eliminada) {
        throw new NotFoundException('Finca no encontrada');
      }
    } catch (error: unknown) {
      const codigo =
        (error as { code?: string })?.code ?? (error as { cause?: { code?: string } })?.cause?.code;
      if (codigo === '23503') {
        throw new ConflictException(
          'No se puede eliminar la finca porque tiene contratos vinculados',
        );
      }
      throw error;
    }
  }
}

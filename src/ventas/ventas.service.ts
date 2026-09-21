import { Injectable, MethodNotAllowedException, NotFoundException } from '@nestjs/common';
import { VentasRepository } from './ventas.repository';
import type { CrearVentaDto } from './dto/crear-venta.dto';
import type { VentaRespuestaDto } from './dto/venta-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class VentasService {
  constructor(private readonly repositorio: VentasRepository) {}

  async registrar(dto: CrearVentaDto): Promise<VentaRespuestaDto> {
    return this.repositorio.registrar(dto);
  }

  async buscarPorId(id: string): Promise<VentaRespuestaDto> {
    const venta = await this.repositorio.buscarPorId(id);
    if (!venta) {
      throw new NotFoundException('Venta no encontrada');
    }
    return venta;
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<VentaRespuestaDto>> {
    return this.repositorio.listar(contratoId, paginacion);
  }

  actualizar(): never {
    throw new MethodNotAllowedException('Las ventas son inmutables y no pueden ser modificadas');
  }

  eliminar(): never {
    throw new MethodNotAllowedException('Las ventas son inmutables y no pueden ser eliminadas');
  }
}

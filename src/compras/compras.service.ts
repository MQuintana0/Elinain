import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComprasRepository } from './compras.repository';
import type { CrearCompraDto } from './dto/crear-compra.dto';
import type { CompraRespuestaDto } from './dto/compra-respuesta.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

@Injectable()
export class ComprasService {
  constructor(private readonly repositorio: ComprasRepository) {}

  async crear(dto: CrearCompraDto): Promise<CompraRespuestaDto> {
    const validacion = await this.repositorio.validarContratoPerteneceAlTenant(dto.contrato_id);

    if (!validacion.existe) {
      throw new NotFoundException('El contrato especificado no existe');
    }

    if (validacion.estado === 'cerrado') {
      throw new BadRequestException('No se pueden registrar compras en un contrato cerrado');
    }

    const valorTotal = dto.cantidad * dto.peso_promedio * dto.precio_kilo;

    return this.repositorio.crear({
      contrato_id: dto.contrato_id,
      fecha: dto.fecha,
      cantidad: dto.cantidad,
      peso_promedio: dto.peso_promedio,
      precio_kilo: dto.precio_kilo,
      valor_total: valorTotal,
      nota: dto.nota.trim(),
    });
  }

  async buscarPorId(id: string): Promise<CompraRespuestaDto> {
    const compra = await this.repositorio.buscarPorId(id);
    if (!compra) {
      throw new NotFoundException('Compra no encontrada');
    }
    return compra;
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CompraRespuestaDto>> {
    return this.repositorio.listar(contratoId, paginacion);
  }
}

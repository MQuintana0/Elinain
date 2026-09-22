import { Injectable } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { AccesoDb } from '../db/acceso-db';
import { ciclos, type NuevoCiclo } from '../db/schema/ciclos';
import { contratos } from '../db/schema/contratos';
import { terceros } from '../db/schema/terceros';
import { obtenerUsuarioIdTenantActual } from '../common/seguridad/contexto-tenant';
import type { CicloRespuestaDto } from './dto/ciclo-respuesta.dto';
import type { ActualizarCicloDto } from './dto/actualizar-ciclo.dto';
import type { PaginacionQueryDto } from '../common/dto/paginacion-query.dto';
import type { PaginaResultado } from '../common/dto/pagina-respuesta.dto';

export interface ValidacionContratoCiclo {
  existe: boolean;
  estado?: string;
}

function formatearCiclo(fila: {
  id: string;
  contrato_id: string;
  fecha: string;
  peso_observado: number | null;
  notas: string | null;
}): CicloRespuestaDto {
  return {
    id: fila.id,
    contrato_id: fila.contrato_id,
    fecha: new Date(fila.fecha).toISOString(),
    peso_observado: fila.peso_observado,
    notas: fila.notas,
  };
}

@Injectable()
export class CiclosRepository {
  constructor(private readonly accesoDb: AccesoDb) {}

  async validarContratoPerteneceAlTenant(contratoId: string): Promise<ValidacionContratoCiclo> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: contratos.id,
          estado: contratos.estado,
        })
        .from(contratos)
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(contratos.id, contratoId), eq(terceros.usuario_id, usuarioId)));

      const fila = filas[0];
      if (!fila) {
        return { existe: false };
      }

      return {
        existe: true,
        estado: fila.estado,
      };
    });
  }

  async obtenerContratoDeCiclo(
    cicloId: string,
  ): Promise<{ contrato_id: string; estado: string } | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          contrato_id: contratos.id,
          estado: contratos.estado,
        })
        .from(ciclos)
        .innerJoin(contratos, eq(ciclos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(ciclos.id, cicloId), eq(terceros.usuario_id, usuarioId)));

      const fila = filas[0];
      return fila ? { contrato_id: fila.contrato_id, estado: fila.estado } : null;
    });
  }

  async crear(datos: NuevoCiclo): Promise<CicloRespuestaDto> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .insert(ciclos)
        .values({
          contrato_id: datos.contrato_id,
          fecha: datos.fecha,
          peso_observado: datos.peso_observado,
          notas: datos.notas,
        })
        .returning();

      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear el registro de ciclo');
      }
      return formatearCiclo(fila);
    });
  }

  async buscarPorId(id: string): Promise<CicloRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const filas = await transaccion
        .select({
          id: ciclos.id,
          contrato_id: ciclos.contrato_id,
          fecha: ciclos.fecha,
          peso_observado: ciclos.peso_observado,
          notas: ciclos.notas,
        })
        .from(ciclos)
        .innerJoin(contratos, eq(ciclos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(eq(ciclos.id, id), eq(terceros.usuario_id, usuarioId)));

      return filas[0] ? formatearCiclo(filas[0]) : null;
    });
  }

  async listar(
    contratoId?: string,
    paginacion?: PaginacionQueryDto,
  ): Promise<PaginaResultado<CicloRespuestaDto>> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const condiciones = [eq(terceros.usuario_id, usuarioId)];
      if (contratoId) {
        condiciones.push(eq(ciclos.contrato_id, contratoId));
      }

      const limite = paginacion?.limite ?? 20;
      const offset = paginacion?.offset ?? 0;

      const [conteoResultado] = await transaccion
        .select({ total: count() })
        .from(ciclos)
        .innerJoin(contratos, eq(ciclos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(...condiciones));

      const total = Number(conteoResultado?.total ?? 0);

      const filas = await transaccion
        .select({
          id: ciclos.id,
          contrato_id: ciclos.contrato_id,
          fecha: ciclos.fecha,
          peso_observado: ciclos.peso_observado,
          notas: ciclos.notas,
        })
        .from(ciclos)
        .innerJoin(contratos, eq(ciclos.contrato_id, contratos.id))
        .innerJoin(terceros, eq(contratos.tercero_id, terceros.id))
        .where(and(...condiciones))
        .orderBy(desc(ciclos.fecha))
        .limit(limite)
        .offset(offset);

      return {
        elementos: filas.map(formatearCiclo),
        total,
        limite,
        offset,
      };
    });
  }

  async actualizar(id: string, dto: ActualizarCicloDto): Promise<CicloRespuestaDto | null> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const actualizacion: Partial<NuevoCiclo> = {};
      if (dto.fecha !== undefined) actualizacion.fecha = dto.fecha;
      if (dto.peso_observado !== undefined) actualizacion.peso_observado = dto.peso_observado;
      if (dto.notas !== undefined) actualizacion.notas = dto.notas;

      if (Object.keys(actualizacion).length === 0) {
        return this.buscarPorId(id);
      }

      const filas = await transaccion
        .update(ciclos)
        .set(actualizacion)
        .where(eq(ciclos.id, id))
        .returning();

      return filas[0] ? formatearCiclo(filas[0]) : null;
    });
  }

  async eliminar(id: string): Promise<boolean> {
    return this.accesoDb.ejecutarConTenant(async (transaccion) => {
      const usuarioId = obtenerUsuarioIdTenantActual();
      if (!usuarioId) {
        throw new Error('Contexto tenant obligatorio');
      }

      const resultado = await transaccion
        .delete(ciclos)
        .where(eq(ciclos.id, id))
        .returning({ id: ciclos.id });
      return resultado.length > 0;
    });
  }
}

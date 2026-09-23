import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { sesiones, type SesionEntidad } from '../db/schema/sesiones';
import { AccesoBdUsuarios, BD_USUARIOS } from './usuarios.db';

export interface DatosCrearSesion {
  usuario_id: string;
  token_hash: string;
  familia_id: string;
  expira_en: string;
  ip?: string | null;
  user_agent?: string | null;
}

export interface DatosRotarSesion {
  sesionActualId: string;
  usuario_id: string;
  familia_id: string;
  nuevo_token_hash: string;
  nueva_expira_en: string;
  ip?: string | null;
  user_agent?: string | null;
}

@Injectable()
export class SesionesRepository {
  constructor(@Inject(BD_USUARIOS) private readonly bd: AccesoBdUsuarios) {}

  async crear(datos: DatosCrearSesion): Promise<SesionEntidad> {
    return this.bd.ejecutarEnContextoUsuario(datos.usuario_id, async (transaccion) => {
      const filas = await transaccion
        .insert(sesiones)
        .values({
          usuario_id: datos.usuario_id,
          token_hash: datos.token_hash,
          familia_id: datos.familia_id,
          expira_en: datos.expira_en,
          ip: datos.ip ?? null,
          user_agent: datos.user_agent ?? null,
        })
        .returning();
      const fila = filas[0];
      if (!fila) {
        throw new Error('No se pudo crear la sesión');
      }
      return fila;
    });
  }

  async buscarPorTokenHash(tokenHash: string): Promise<SesionEntidad | undefined> {
    return this.bd.ejecutarEnContextoTokenHash(tokenHash, async (transaccion) => {
      const filas = await transaccion
        .select()
        .from(sesiones)
        .where(eq(sesiones.token_hash, tokenHash));
      return filas[0];
    });
  }

  async rotarSesion(datos: DatosRotarSesion): Promise<SesionEntidad> {
    return this.bd.ejecutarEnContextoUsuario(datos.usuario_id, async (transaccion) => {
      const [nuevaSesion] = await transaccion
        .insert(sesiones)
        .values({
          usuario_id: datos.usuario_id,
          token_hash: datos.nuevo_token_hash,
          familia_id: datos.familia_id,
          expira_en: datos.nueva_expira_en,
          ip: datos.ip ?? null,
          user_agent: datos.user_agent ?? null,
        })
        .returning();

      if (!nuevaSesion) {
        throw new Error('No se pudo crear la nueva sesión en la rotación');
      }

      await transaccion
        .update(sesiones)
        .set({
          revocado: true,
          revocado_en: new Date().toISOString(),
          revocado_motivo: 'rotacion',
          reemplazado_por: nuevaSesion.id,
        })
        .where(eq(sesiones.id, datos.sesionActualId));

      return nuevaSesion;
    });
  }

  async revocarFamiliaPorReuso(usuarioId: string, familiaId: string): Promise<number> {
    return this.bd.ejecutarEnContextoUsuario(usuarioId, async (transaccion) => {
      const resultado = await transaccion
        .update(sesiones)
        .set({
          revocado: true,
          revocado_en: new Date().toISOString(),
          revocado_motivo: 'reuso_detectado',
        })
        .where(and(eq(sesiones.familia_id, familiaId), eq(sesiones.revocado, false)))
        .returning({ id: sesiones.id });
      return resultado.length;
    });
  }

  async revocarPorTokenHash(tokenHash: string, motivo: string = 'logout'): Promise<boolean> {
    return this.bd.ejecutarEnContextoTokenHash(tokenHash, async (transaccion) => {
      const resultado = await transaccion
        .update(sesiones)
        .set({
          revocado: true,
          revocado_en: new Date().toISOString(),
          revocado_motivo: motivo,
        })
        .where(and(eq(sesiones.token_hash, tokenHash), eq(sesiones.revocado, false)))
        .returning({ id: sesiones.id });
      return resultado.length > 0;
    });
  }
}

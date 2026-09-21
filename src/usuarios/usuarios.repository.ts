// Repositorio de usuarios (MVP-005, RF-1).
// Único punto de acceso a la tabla `usuarios` vía Drizzle. No contiene
// lógica de negocio: solo persistencia y lectura (crear, buscar por email).
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { usuarios } from '../db/schema/usuarios';
import { AccesoBdUsuarios, BD_USUARIOS } from './usuarios.db';

export interface DatosCrearUsuario {
  nombre: string;
  email: string;
  password_hash: string;
}

export interface FilaUsuario {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
}

@Injectable()
export class UsuariosRepository {
  constructor(@Inject(BD_USUARIOS) private readonly bd: AccesoBdUsuarios) {}

  async buscarPorEmail(email: string): Promise<FilaUsuario | undefined> {
    return this.bd.ejecutarEnContextoAutenticacion(email, async (transaccion) => {
      const filas = await transaccion.select().from(usuarios).where(eq(usuarios.email, email));
      return filas[0];
    });
  }

  async crear(datos: DatosCrearUsuario): Promise<FilaUsuario> {
    return this.bd.ejecutarEnContextoAutenticacion(datos.email, async (transaccion) => {
      const filas = await transaccion.insert(usuarios).values(datos).returning();
      const fila = filas[0] as FilaUsuario | undefined;
      if (!fila) {
        throw new Error('No se pudo crear el usuario');
      }
      return fila;
    });
  }
}

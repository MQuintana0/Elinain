// Servicio de usuarios (MVP-005, RF-1).
// Orquesta el registro: verifica duplicados, genera el hash bcrypt
// (costo 10: equilibrio entre seguridad y velocidad de tests) y delega
// la persistencia al repositorio. Retorna solo identidad pública.
import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { UsuarioRegistradoDto } from './dto/usuario-registrado.dto';
import { UsuariosRepository } from './usuarios.repository';

const COSTO_HASH_BCRYPT = 10;
const CODIGO_VIOLACION_UNICIDAD = '23505';

function esViolacionUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === CODIGO_VIOLACION_UNICIDAD
  );
}

@Injectable()
export class UsuariosService {
  constructor(private readonly repositorio: UsuariosRepository) {}

  async registrar(dto: CrearUsuarioDto): Promise<UsuarioRegistradoDto> {
    const existente = await this.repositorio.buscarPorEmail(dto.email);
    if (existente) {
      throw new ConflictException('El email ya está registrado');
    }
    const password_hash = await bcrypt.hash(dto.password, COSTO_HASH_BCRYPT);
    try {
      const fila = await this.repositorio.crear({
        nombre: dto.nombre,
        email: dto.email,
        password_hash,
      });
      return { id: fila.id, nombre: fila.nombre, email: fila.email };
    } catch (error) {
      // Carrera entre la verificación previa y el INSERT: la restricción
      // UNIQUE de la base de datos es la autoridad final del duplicado.
      if (esViolacionUnicidad(error)) {
        throw new ConflictException('El email ya está registrado');
      }
      throw error;
    }
  }
}
